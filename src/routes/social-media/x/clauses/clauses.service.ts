import fp from "fastify-plugin";
import { AppDataSource, XDataSource } from "../../../../config/database";
import { XClause } from "../../../../database/entity/Clause.entity";
import { TResponse as GetAllClausesResponse } from "./schemas/getClauses.schema";
import { TResponse as GetClauseResponse } from "./schemas/getClause.schema";
import { TResponse as GetClauseStatisticsResponse } from "./schemas/getClauseStatistics.schema";
import { XFilterClause } from "../../../../database/entity/FilterClause.entity";
import { XFilter } from "../../../../database/entity/Filter.entity";
import { IsNull, Like } from "typeorm";
import { TResponse as DeleteResponse } from "./schemas/deleteSchema.schema";
import { TResponse as CreateOrUpdateResponse } from "./schemas/createOrUpdate.schema";
import { TResponse as GetAllClausesDropdownResponse } from "./schemas/getClausesDropdown.schema";
import { TResponse as GetLinkedFiltersResponse } from "./schemas/getLinkedFilters.schema";
import { fetchClauseAsTypeORM } from "../../../../helper/filterQueryGenerator";
import { Post } from "../../../../database/entity/Post.entity";

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
    totalWords++;
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
        include_accounts_clause_accounts_count: clause.include_accounts_clause
          ? countWordsInClause(clause.include_accounts_clause)
          : 0,
        exclude_accounts_clause_accounts_count: clause.exclude_accounts_clause
          ? countWordsInClause(clause.exclude_accounts_clause)
          : 0,
        include_to_accounts_clause_accounts_count: clause.include_to_accounts_clause
          ? countWordsInClause(clause.include_to_accounts_clause)
          : 0,
        exclude_to_accounts_clause_accounts_count: clause.exclude_to_accounts_clause
          ? countWordsInClause(clause.exclude_to_accounts_clause)
          : 0,
      };
    });

    return { data: dataWithWordsCount as unknown as GetAllClausesResponse, totalRecords };
  };

  const createOrUpdateClause = async (clause: {
    id: number | undefined;
    name: string;
    include_clause: string;
    exclude_clause: string;
    include_accounts_clause?: string;
    exclude_accounts_clause?: string;
    include_to_accounts_clause?: string;
    exclude_to_accounts_clause?: string;
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
        throw fastify.httpErrors.notFound(fastify.t("clauses.errors.notFound", { id: clause.id }));
      }

      existingClause.updated_at = new Date();
      // 3. update the clause (exclude id from clause to prevent overwriting)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, ...clauseWithoutId } = clause;
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
        throw fastify.httpErrors.badRequest(
          fastify.t("clauses.errors.nameAlreadyExists", { name: clause.name }),
        );
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
      throw fastify.httpErrors.notFound(fastify.t("clauses.errors.notFound", { id }));
    }
    return {
      data: data as unknown as GetClauseResponse,
    };
  };

  const updateClauseStatistics = async (id: number) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    const clauseData = await clauseRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });

    if (!clauseData) {
      throw fastify.httpErrors.notFound(fastify.t("clauses.errors.notFound", { id }));
    }
    const clauseFilterResult = await fetchClauseAsTypeORM(id, fastify);

    const postRepo = XDataSource.getRepository(Post);

    // Only apply the filter if clauseFilterResult is not null
    let total_posts = 0;
    let total_impressions = 0;
    let positive_posts = 0;
    let negative_posts = 0;
    let neutral_posts = 0;

    if (clauseFilterResult !== null) {
      const { textOperator, usernameOperator, replyToUsernameOperator, operator } =
        clauseFilterResult;

      // Build where conditions based on what operators exist
      const whereConditions: any[] = [];

      if (operator === "AND") {
        // All conditions must match - combine in a single where object
        const whereObj: any = {};
        if (textOperator) whereObj.text = textOperator;
        if (usernameOperator) whereObj.username = usernameOperator;
        if (replyToUsernameOperator) whereObj.reply_to_username = replyToUsernameOperator;
        if (Object.keys(whereObj).length > 0) {
          whereConditions.push(whereObj);
        }
      } else {
        // OR operator - any condition can match
        if (textOperator) whereConditions.push({ text: textOperator });
        if (usernameOperator) whereConditions.push({ username: usernameOperator });
        if (replyToUsernameOperator)
          whereConditions.push({ reply_to_username: replyToUsernameOperator });
      }

      if (whereConditions.length > 0) {
        // Use a single query with GROUP BY for better performance
        const qb = postRepo
          .createQueryBuilder("post")
          .select("post.sentiment", "sentiment")
          .addSelect("COUNT(*)", "count")
          .addSelect("COALESCE(SUM(post.impression_count), 0)", "impressions");

        // Apply where conditions
        if (whereConditions.length === 1) {
          qb.where(whereConditions[0]);
        } else {
          // Multiple conditions with OR
          qb.where(whereConditions);
        }

        const sentimentCounts = await qb.groupBy("post.sentiment").getRawMany();

        // Map the results to our variables
        sentimentCounts.forEach(
          (row: { sentiment: string; count: string; impressions: string }) => {
            const count = parseInt(row.count, 10);
            const impressions = parseInt(row.impressions, 10);

            total_posts += count;
            total_impressions += impressions;

            if (row.sentiment === "positive") {
              positive_posts = count;
            } else if (row.sentiment === "negative") {
              negative_posts = count;
            } else if (row.sentiment === "neutral") {
              neutral_posts = count;
            }
          },
        );
      }
    }

    clauseData.total_posts = BigInt(total_posts);
    clauseData.total_impressions = BigInt(total_impressions);
    clauseData.positive_posts = BigInt(positive_posts);
    clauseData.negative_posts = BigInt(negative_posts);
    clauseData.neutral_posts = BigInt(neutral_posts);
    clauseData.statistics_updated_at = new Date();
    await clauseRepo.save(clauseData);

    return {
      data: {
        ...clauseData,
        updated_at: clauseData.statistics_updated_at?.toISOString() || null,
      } as unknown as GetClauseStatisticsResponse,
    };
  };

  const getClauseStatistics = async (id: number) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    const clauseData = await clauseRepo.findOne({
      select: {
        total_posts: true,
        total_impressions: true,
        positive_posts: true,
        negative_posts: true,
        neutral_posts: true,
        statistics_updated_at: true,
      },
      where: { id, deleted_at: IsNull() },
    });

    if (!clauseData) {
      throw fastify.httpErrors.notFound(fastify.t("clauses.errors.notFound", { id }));
    }

    return {
      data: {
        ...clauseData,
        updated_at: clauseData.statistics_updated_at?.toISOString() || null,
      } as unknown as GetClauseStatisticsResponse,
    };
  };

  const getLinkedFilters = async (id: number) => {
    const filterClauseRepo = AppDataSource.getRepository(XFilterClause);
    const filterRepo = AppDataSource.getRepository(XFilter);

    // Get all filter IDs linked to this clause
    const filterClauses = await filterClauseRepo.find({
      where: {
        clause_id: id,
        deleted_at: IsNull(),
      },
      select: {
        filter_id: true,
      },
    });

    if (filterClauses.length === 0) {
      return {
        data: {
          filters: [],
        } as GetLinkedFiltersResponse,
      };
    }

    // Get filter details
    const filterIds = filterClauses.map((fc) => fc.filter_id);
    const filters = await filterRepo
      .createQueryBuilder("filter")
      .select(["filter.id", "filter.name"])
      .where("filter.id IN (:...filterIds)", { filterIds })
      .andWhere("filter.deleted_at IS NULL")
      .getMany();

    return {
      data: {
        filters: filters.map((f) => ({ id: Number(f.id), name: f.name })),
      } as GetLinkedFiltersResponse,
    };
  };

  // Helper to remove a clause ID from a clause expression string
  const removeClauseFromExpression = (expression: string, clauseId: number): string => {
    if (!expression) return "";

    // Pattern to match [context] equals 'ID' or [context] equals ID (with or without quotes)
    const patterns = [
      new RegExp(`\\[context\\]\\s*equals\\s*'${clauseId}'`, "gi"),
      new RegExp(`\\[context\\]\\s*equals\\s*${clauseId}(?!\\d)`, "gi"),
      new RegExp(`\\[context\\]\\s*=\\s*'${clauseId}'`, "gi"),
      new RegExp(`\\[context\\]\\s*=\\s*${clauseId}(?!\\d)`, "gi"),
    ];

    let result = expression;
    for (const pattern of patterns) {
      result = result.replace(pattern, "");
    }

    // Clean up orphaned operators (and/or at start, end, or doubled)
    result = result
      .replace(/\(\s*(and|or)\s*/gi, "(") // Remove operator after opening paren
      .replace(/\s*(and|or)\s*\)/gi, ")") // Remove operator before closing paren
      .replace(/\s+(and|or)\s+(and|or)\s+/gi, " $1 ") // Remove doubled operators
      .replace(/^\s*(and|or)\s+/gi, "") // Remove operator at start
      .replace(/\s+(and|or)\s*$/gi, "") // Remove operator at end
      .replace(/\(\s*\)/g, "") // Remove empty parentheses
      .trim();

    // If only empty parens or whitespace left, return empty
    if (!result || result === "()" || result === "( )") {
      return "";
    }

    return result;
  };

  const deleteClause = async (id: number) => {
    const clauseRepo = AppDataSource.getRepository(XClause);
    const filterClauseRepo = AppDataSource.getRepository(XFilterClause);
    const filterRepo = AppDataSource.getRepository(XFilter);

    const existingClause = await clauseRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!existingClause) {
      throw fastify.httpErrors.notFound(fastify.t("clauses.errors.notFound", { id }));
    }

    // Get all linked filter IDs
    const linkedFilterClauses = await filterClauseRepo.find({
      where: {
        clause_id: id,
        deleted_at: IsNull(),
      },
    });

    if (linkedFilterClauses.length > 0) {
      // Get the filter IDs
      const filterIds = linkedFilterClauses.map((fc) => fc.filter_id);

      // Update each linked filter to remove the clause from its JSON
      const filtersToUpdate = await filterRepo.find({
        where: filterIds.map((filterId) => ({ id: filterId, deleted_at: IsNull() })),
      });

      for (const filter of filtersToUpdate) {
        try {
          const filterData = JSON.parse(filter.filter);

          // Remove clause ID from ids array
          if (filterData.post?.clauses?.ids) {
            filterData.post.clauses.ids = filterData.post.clauses.ids.filter(
              (clauseId: number) => clauseId !== id,
            );
            // If ids array is empty, remove the clauses object or set to undefined
            if (filterData.post.clauses.ids.length === 0) {
              delete filterData.post.clauses.ids;
            }
          }

          // Remove clause from clause expression string
          if (filterData.post?.clauses?.clause) {
            filterData.post.clauses.clause = removeClauseFromExpression(
              filterData.post.clauses.clause,
              id,
            );
            // If clause expression is empty, remove it
            if (!filterData.post.clauses.clause) {
              delete filterData.post.clauses.clause;
            }
          }

          // If clauses object is now empty, remove it
          if (filterData.post?.clauses && Object.keys(filterData.post.clauses).length === 0) {
            delete filterData.post.clauses;
          }

          // Save the updated filter
          filter.filter = JSON.stringify(filterData);
          filter.updated_at = new Date();
          await filterRepo.save(filter);
        } catch (error) {
          console.error(`Error updating filter ${filter.id}:`, error);
          // Continue with other filters even if one fails
        }
      }

      // Soft-delete all XFilterClause records linked to this clause
      await filterClauseRepo.softRemove(linkedFilterClauses);
    }

    // Delete the clause
    await clauseRepo.softRemove(existingClause);
    return {
      data: {
        success: true,
        message: fastify.t("clauses.messages.deleted"),
      } as unknown as DeleteResponse,
    };
  };

  // Decorate the fastify instance with the clauseService
  fastify.decorate("clauseService", {
    getAllClauses,
    getAllClausesDropdown,
    createOrUpdateClause,
    getClause,
    updateClauseStatistics,
    getClauseStatistics,
    getLinkedFilters,
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
        include_accounts_clause?: string;
        exclude_accounts_clause?: string;
        include_to_accounts_clause?: string;
        exclude_to_accounts_clause?: string;
        operator: "AND" | "OR";
      }) => Promise<{ data: CreateOrUpdateResponse }>;
      getClause: (id: number) => Promise<{ data: GetClauseResponse }>;
      updateClauseStatistics: (id: number) => Promise<{ data: GetClauseStatisticsResponse }>;
      getClauseStatistics: (id: number) => Promise<{ data: GetClauseStatisticsResponse }>;
      getLinkedFilters: (id: number) => Promise<{ data: GetLinkedFiltersResponse }>;
      deleteClause: (id: number) => Promise<{ data: DeleteResponse }>;
    };
  }
}
