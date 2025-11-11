import fp from "fastify-plugin";
import { IsNull, Like, QueryRunner } from "typeorm";
import { AppDataSource } from "../../config/database";
import { XFilter } from "../../database/entity/Filter.entity";
import { TFilter } from "../../models/types/comment.type";
import { TResponse as GetAllFiltersResponse } from "./schemas/getFilters.schema";
import { TResponse as GetFilterResponse } from "./schemas/getFilter.schema";
import { TResponse as DeleteFilterResponse } from "./schemas/deleteFilterSchema.schema";
import { TSavedFilterType } from "../../helper/common";
import { XFilterClause } from "../../database/entity/FilterClause.entity";

export default fp(async (fastify) => {
  const getAllFilters = async (
    type: TSavedFilterType | undefined,
    skip: number,
    take: number,
    search?: string | undefined,
  ) => {
    const filterRepo = AppDataSource.getRepository(XFilter);
    const qb = filterRepo.createQueryBuilder("filter").setFindOptions({
      select: {
        id: true,
        name: true,
        type: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        ...(type ? { type } : {}),
        ...(search ? { name: Like(`${search}%`) } : {}),
        deleted_at: IsNull(),
      },
      skip,
      take,
      order: { name: "asc" },
    });
    const [data, totalRecords] = await qb.getManyAndCount();

    return { data: data as unknown as GetAllFiltersResponse, totalRecords };
  };

  const createOrUpdateFilter = async (filter: {
    id: number | undefined;
    name: string;
    type: string;
    filter: TFilter;
  }) => {
    // create or update filter with transaction
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      // Use queryRunner's manager for all operations to be part of the transaction
      const filterRepo = queryRunner.manager.getRepository(XFilter);

      let data;
      if (filter.id) {
        const existingFilter = await filterRepo.findOne({
          where: {
            id: filter.id,
            deleted_at: IsNull(),
          },
        });

        if (!existingFilter) {
          throw fastify.httpErrors.notFound(`Filter with id ${filter.id} not found`);
        }
        if (existingFilter.type !== filter.type) {
          throw fastify.httpErrors.badRequest("Type cannot be changed");
        }

        // check if the filter name already exists with the same type
        if (existingFilter.name !== filter.name) {
          const existingFilterWithSameName = await filterRepo.findOne({
            where: {
              name: filter.name,
              type: filter.type,
              deleted_at: IsNull(),
            },
          });
          if (existingFilterWithSameName) {
            throw fastify.httpErrors.badRequest("Filter name already exists with the same type");
          }
        }
        // add filter clauses to the filter_clauses table
        const filterClauses = filter.filter.post.clauses;
        // Update existing filter
        existingFilter.filter = JSON.stringify(filter.filter);
        existingFilter.updated_at = new Date();
        existingFilter.name = filter.name;
        data = await filterRepo.save(existingFilter);
        // Update existing filter clauses within the transaction
        await createOrUpdateFilterClauses(existingFilter.id, filterClauses?.ids ?? [], queryRunner);
      } else {
        // Create new filter
        // check if the filter name already exists with the same type
        const existingFilterWithSameName = await filterRepo.findOne({
          where: {
            name: filter.name,
            type: filter.type,
            deleted_at: IsNull(),
          },
        });
        if (existingFilterWithSameName) {
          throw fastify.httpErrors.badRequest("Filter name already exists with the same type");
        }
        data = await filterRepo.save({
          name: filter.name,
          type: filter.type,
          filter: JSON.stringify(filter.filter),
        });
        // add filter clauses to the filter_clauses table within the transaction
        const filterClauses = filter.filter.post.clauses;
        await createOrUpdateFilterClauses(data.id, filterClauses?.ids ?? [], queryRunner);
      }

      await queryRunner.commitTransaction();

      return {
        data: {
          ...data,
          filter: JSON.parse(data.filter) as TFilter,
        } as unknown as GetFilterResponse,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  };

  const createOrUpdateFilterClauses = async (
    filterId: number,
    clauseIds: number[],
    queryRunner?: QueryRunner,
  ) => {
    const filterClauseRepo = queryRunner
      ? queryRunner.manager.getRepository(XFilterClause)
      : AppDataSource.getRepository(XFilterClause);

    // Get existing filter clauses
    const existingFilterClauses = await filterClauseRepo.find({
      where: { filter_id: filterId },
    });

    const existingClauseIds = existingFilterClauses.map((fc: XFilterClause) => fc.clause_id);

    // Delete clauses that are no longer needed
    const clausesToDelete = existingFilterClauses.filter(
      (fc: XFilterClause) => !clauseIds.includes(fc.clause_id),
    );
    if (clausesToDelete.length > 0) {
      await filterClauseRepo.remove(clausesToDelete);
    }

    // Add new clauses
    const clausesToAdd = clauseIds.filter((cid: number) => !existingClauseIds.includes(cid));
    if (clausesToAdd.length > 0) {
      const newFilterClauses = clausesToAdd.map((clauseId) => ({
        filter_id: filterId,
        clause_id: clauseId,
      }));
      await filterClauseRepo.insert(newFilterClauses);
    }
  };

  const getFilter = async (id: number) => {
    const filterRepo = AppDataSource.getRepository(XFilter);
    const data = await filterRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!data) {
      throw fastify.httpErrors.notFound(`Filter with id ${id} not found`);
    }
    return {
      data: { ...data, filter: JSON.parse(data.filter) as TFilter } as unknown as GetFilterResponse,
    };
  };

  const deleteFilter = async (id: number) => {
    const filterRepo = AppDataSource.getRepository(XFilter);
    const existingFilter = await filterRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!existingFilter) {
      throw fastify.httpErrors.notFound(`Filter with id ${id} not found`);
    }
    existingFilter.deleted_at = new Date();
    await filterRepo.save(existingFilter);
    return {
      data: {
        success: true,
        message: `Filter with id ${id} deleted successfully`,
      } as unknown as DeleteFilterResponse,
    };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("filterService", {
    getAllFilters,
    createOrUpdateFilter,
    getFilter,
    deleteFilter,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    filterService: {
      getAllFilters: (
        type: TSavedFilterType | undefined,
        skip: number,
        take: number,
        search?: string | undefined,
      ) => Promise<{ data: GetAllFiltersResponse; totalRecords: number }>;
      createOrUpdateFilter: (filter: {
        id: number | undefined;
        name: string;
        type: TSavedFilterType;
        filter: TFilter;
      }) => Promise<{ data: GetFilterResponse }>;
      getFilter: (id: number) => Promise<{ data: GetFilterResponse }>;
      deleteFilter: (id: number) => Promise<{ data: DeleteFilterResponse }>;
    };
  }
}
