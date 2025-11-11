import fp from "fastify-plugin";
import { AppDataSource } from "../../config/database";
import { XClause } from "../../database/entity/Clause.entity";
import { TResponse as GetAllClausesResponse } from "./schemas/getClauses.schema";
import { TResponse as GetClauseResponse } from "./schemas/getClause.schema";
import { FilterClause } from "../../database/entity/FilterClause.entity";
import { IsNull, Like } from "typeorm";
import { TResponse as DeleteResponse } from "./schemas/deleteSchema.schema";
import { TResponse as CreateOrUpdateResponse } from "./schemas/createOrUpdate.schema";
import { TResponse as GetAllClausesDropdownResponse } from "./schemas/getClausesDropdown.schema";
import { TResponse as canPerformActionResponse } from "./schemas/canPerformAction.schema";

// Helper function to extract and count words from SQL clause
const countWordsInClause = (clause: string): number => {
  // Match all quoted strings (N'...' pattern for SQL or regular quotes)
  const matches = clause.match(/N'([^']+)'|'([^']+)'|"([^"]+)"/g);
  if (!matches) return 0;

  let totalWords = 0;

  for (const match of matches) {
    // Extract content from quotes
    let content = match;
    if (content.startsWith("N'")) {
      content = content.slice(2, -1); // Remove N' and trailing '
    } else if (content.startsWith("'") || content.startsWith('"')) {
      content = content.slice(1, -1); // Remove surrounding quotes
    }

    // Remove % and ٪ (Arabic percent) wildcards and extra whitespace
    const cleanContent = content.replace(/[%٪]/g, "").trim();

    // Split by whitespace and filter out empty strings
    const words = cleanContent.split(/\s+/).filter((word) => word.length > 0);

    totalWords += words.length;
  }

  return totalWords;
};

export default fp(async (fastify) => {
  const getAllClausesDropdown = async (skip: number, take: number, search?: string | undefined) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    const qb = clauseRepo.createQueryBuilder("clause").setFindOptions({
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        ...(search ? { name: Like(`${search}%`) } : {}),
        deleted_at: IsNull(),
      },
      skip,
      take,
      order: { id: "desc" },
    });
    const [data, totalRecords] = await qb.getManyAndCount();

    return { data: data as unknown as GetAllClausesResponse, totalRecords };
  };

  const getAllClauses = async (skip: number, take: number) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    const qb = clauseRepo.createQueryBuilder("clause").setFindOptions({
      where: {
        deleted_at: IsNull(),
      },
      skip,
      take,
      order: { name: "asc" },
    });

    const [data, totalRecords] = await qb.getManyAndCount();
    const dataWithWordsCount = data.map((clause) => {
      return {
        ...clause,
        include_clause_words_count: countWordsInClause(clause.include_clause),
        exclude_clause_words_count: countWordsInClause(clause.exclude_clause),
      };
    });

    return { data: dataWithWordsCount as unknown as GetAllClausesResponse, totalRecords };
  };

  const createOrUpdateClause = async (clause: {
    id: number | undefined;
    name: string;
    include_clause: string;
    exclude_clause: string;
    operator: "AND" | "OR";
  }) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    let data;
    if (clause.id) {
      // 1. check if the clause exists
      const existingClause = await clauseRepo.findOne({
        where: {
          id: clause.id,
          deleted_at: IsNull(),
        },
      });
      if (!existingClause) {
        throw fastify.httpErrors.notFound(`Clause with id ${clause.id} not found`);
      }

      // 2. check if the clause is connected to any filter?
      if (await checkIfClauseIsConnectedToFilter(clause.id)) {
        throw fastify.httpErrors.badRequest(`Clause with id ${clause.id} is connected to a filter`);
      }
      existingClause.updated_at = new Date();
      // 3. update the clause (exclude id from clause to prevent overwriting)
      const { id, ...clauseWithoutId } = clause;
      data = await clauseRepo.save({ ...existingClause, ...clauseWithoutId });
    } else {
      // create new clause
      // check if the clause name already exists
      const existingClauseWithSameName = await clauseRepo.findOne({
        where: {
          name: clause.name,
        },
      });
      if (existingClauseWithSameName) {
        throw fastify.httpErrors.badRequest(`Clause with name ${clause.name} already exists`);
      }

      data = await clauseRepo.save({
        ...clause,
      });
    }

    return {
      data: data as unknown as CreateOrUpdateResponse,
    };
  };

  const getClause = async (id: number) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    const data = await clauseRepo.findOne({
      where: { id },
    });
    if (!data) {
      throw fastify.httpErrors.notFound(`Clause with id ${id} not found`);
    }
    return {
      data: data as unknown as GetClauseResponse,
    };
  };

  const checkIfClauseIsConnectedToFilter = async (id: number) => {
    const filterClauseRepo = AppDataSource.getRepository(FilterClause);
    const filterClause = await filterClauseRepo.findOne({
      where: {
        clause_id: id,
      },
    });
    return filterClause ? true : false;
  };

  const canMakeAction = async (id: number) => {
    return {
      data: {
        can_make_action: !(await checkIfClauseIsConnectedToFilter(id)),
      } as unknown as canPerformActionResponse,
    };
  };

  const deleteClause = async (id: number) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    const existingClause = await clauseRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!existingClause) {
      throw fastify.httpErrors.notFound(`Clause with id ${id} not found`);
    }
    // check if the clause is connected to any filter?
    if (await checkIfClauseIsConnectedToFilter(id)) {
      throw fastify.httpErrors.badRequest(
        `Clause with id ${id} is connected to a filter and cannot be deleted`,
      );
    }

    // delete the clause
    existingClause.deleted_at = new Date();
    await clauseRepo.save(existingClause);
    return {
      data: {
        success: true,
        message: `Clause with id ${id} deleted successfully`,
      } as unknown as DeleteResponse,
    };
  };

  // Decorate the fastify instance with the clauseService
  fastify.decorate("clauseService", {
    getAllClauses,
    getAllClausesDropdown,
    createOrUpdateClause,
    getClause,
    canMakeAction,
    deleteClause,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    clauseService: {
      getAllClauses: (
        skip: number,
        take: number,
      ) => Promise<{ data: GetAllClausesResponse; totalRecords: number }>;
      getAllClausesDropdown: (
        skip: number,
        take: number,
        search?: string | undefined,
      ) => Promise<{ data: GetAllClausesDropdownResponse; totalRecords: number }>;
      createOrUpdateClause: (clause: {
        id: number | undefined;
        name: string;
        include_clause: string;
        exclude_clause: string;
        operator: "AND" | "OR";
      }) => Promise<{ data: CreateOrUpdateResponse }>;
      getClause: (id: number) => Promise<{ data: GetClauseResponse }>;
      canMakeAction: (id: number) => Promise<{ data: canPerformActionResponse }>;
      deleteClause: (id: number) => Promise<{ data: DeleteResponse }>;
    };
  }
}
