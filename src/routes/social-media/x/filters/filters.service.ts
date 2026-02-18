import fp from "fastify-plugin";
import { Brackets, In, IsNull, Not, QueryRunner } from "typeorm";
import { UsersDataSource, AppDataSource } from "../../../../config/database";
import { XFilter, FilterVisibility } from "../../../../database/entity/Filter.entity";
import { XFilterShare } from "../../../../database/entity/FilterShare.entity";
import { TFilter } from "../../../../models/types/comment.type";
import { TResponse as GetAllFiltersResponse } from "./schemas/getFilters.schema";
import { TResponse as GetFilterResponse } from "./schemas/getFilter.schema";
import { TResponse as DeleteFilterResponse } from "./schemas/deleteFilterSchema.schema";
import { TSavedFilterType } from "../../../../helper/common";
import { XFilterClause } from "../../../../database/entity/FilterClause.entity";
import { BetterAuthUser } from "../../../../lib/BetterAuthUser.entity";

// Helper: Build "shared with user" condition (public OR explicitly shared)
const buildSharedWithUserCondition = (userId: string) => {
  return new Brackets((qb) => {
    qb.where("filter.visibility = :public", { public: "public" }).orWhere(
      new Brackets((shareQb) => {
        shareQb
          .where("filter.visibility = :shared", { shared: "shared" })
          .andWhere("share.user_id = :userId", { userId });
      }),
    );
  });
};

// Types for getAllFilters options
interface GetAllFiltersOptions {
  type?: TSavedFilterType;
  skip: number;
  take: number;
  search?: string;
  userId: string;
  isOwn?: boolean;
}

export default fp(async (fastify) => {
  const getAllFilters = async (options: GetAllFiltersOptions) => {
    const { type, skip, take, search, userId, isOwn } = options;
    const filterRepo = AppDataSource.getRepository(XFilter);

    // Build base query
    const qb = filterRepo
      .createQueryBuilder("filter")
      .leftJoin("filter.shares", "share", "share.deleted_at IS NULL AND share.user_id = :userId", {
        userId,
      })
      .select([
        "filter.id",
        "filter.name",
        "filter.type",
        "filter.visibility",
        "filter.created_by",
        "filter.created_at",
        "filter.updated_at",
      ])
      .addSelect("share.created_at", "shared_at")
      .where("filter.deleted_at IS NULL");

    // Apply optional filters
    if (type) {
      qb.andWhere("filter.type = :type", { type });
    }
    if (search) {
      qb.andWhere("filter.name LIKE :search", { search: `${search}%` });
    }

    // Apply visibility/ownership filter
    if (isOwn === true) {
      // Only user's own filters
      qb.andWhere("filter.created_by = :userId", { userId });
    } else if (isOwn === false) {
      // Only shared with user (not their own)
      qb.andWhere("filter.created_by != :userId", { userId });
      qb.andWhere(buildSharedWithUserCondition(userId));
    } else {
      // All accessible filters (own + shared)
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where("filter.created_by = :userId", { userId })
            .orWhere(buildSharedWithUserCondition(userId));
        }),
      );
    }

    qb.orderBy("filter.name", "ASC").skip(skip).take(take);

    // Use getRawAndEntities to get both entity data and raw shared_at
    const { entities: data, raw } = await qb.getRawAndEntities();
    const totalRecords = await qb.getCount();

    // Create a map for shared_at from raw results
    // Use index alignment since getRawAndEntities returns aligned arrays
    const sharedAtMap = new Map<number, Date>();
    raw.forEach((row, index) => {
      if (row.shared_at && data[index]) {
        sharedAtMap.set(data[index].id, row.shared_at);
      }
    });

    // Collect unique creator IDs for filters not owned by the user
    const creatorIds = [
      ...new Set(
        data
          .filter((f) => f.created_by && f.created_by !== userId)
          .map((f) => f.created_by as string),
      ),
    ];

    // Fetch creator names in one query
    const creatorNamesMap = new Map<string, string>();
    if (creatorIds.length > 0) {
      const users = await UsersDataSource.getRepository(BetterAuthUser).find({
        where: { id: In(creatorIds) },
        select: ["id", "fullName", "name"],
      });
      users.forEach((user) => {
        creatorNamesMap.set(user.id, user.fullName || user.name || "Unknown");
      });
    }

    // Build response with conditional fields based on ownership
    const dataWithOwnership = data.map((filter) => {
      const isOwnFilter = filter.created_by === userId;
      const baseFields = {
        id: filter.id,
        name: filter.name,
        type: filter.type,
        visibility: filter.visibility,
        is_own: isOwnFilter,
        updated_at: filter.updated_at,
      };

      return isOwnFilter
        ? { ...baseFields, created_at: filter.created_at }
        : {
            ...baseFields,
            created_by_name: filter.created_by ? creatorNamesMap.get(filter.created_by) : undefined,
            // For public filters, use created_at as the shared date (when it became public)
            // For shared filters, use the actual share date from the share record
            shared_at:
              filter.visibility === "public" ? filter.created_at : sharedAtMap.get(filter.id),
          };
    });

    return { data: dataWithOwnership as unknown as GetAllFiltersResponse, totalRecords };
  };

  const createOrUpdateFilter = async (filter: {
    id: number | undefined;
    name: string;
    type: string;
    filter: TFilter;
    visibility?: FilterVisibility;
    created_by?: string;
    shared_with_user_ids?: string[];
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
          throw fastify.httpErrors.notFound(
            fastify.t("filters.errors.notFound", { id: filter.id }),
          );
        }
        if (existingFilter.type !== filter.type) {
          throw fastify.httpErrors.badRequest(fastify.t("filters.errors.typeCannotBeChanged"));
        }

        // check if the filter name already exists with the same type
        if (existingFilter.name !== filter.name) {
          const existingFilterWithSameName = await filterRepo.findOne({
            where: {
              id: Not(filter.id),
              name: filter.name,
              type: filter.type,
              deleted_at: IsNull(),
            },
          });
          if (existingFilterWithSameName) {
            throw fastify.httpErrors.badRequest(
              fastify.t("filters.errors.nameAlreadyExistsWithSameType"),
            );
          }
        }
        // add filter clauses to the filter_clauses table
        const filterClauses = filter.filter.post.clauses;
        // Update existing filter
        existingFilter.filter = JSON.stringify(filter.filter);
        existingFilter.updated_at = new Date();
        existingFilter.name = filter.name;

        // Update visibility
        if (filter.visibility) {
          existingFilter.visibility = filter.visibility;
        }

        data = await filterRepo.save(existingFilter);
        // Update existing filter clauses within the transaction
        await createOrUpdateFilterClauses(existingFilter.id, filterClauses?.ids ?? [], queryRunner);

        // Update filter shares based on visibility - only if visibility is explicitly provided
        if (filter.visibility !== undefined) {
          if (filter.visibility === "shared") {
            if (filter.shared_with_user_ids) {
              await updateFilterShares(existingFilter.id, filter.shared_with_user_ids, queryRunner);
            } else {
              throw fastify.httpErrors.badRequest(
                fastify.t("filters.errors.sharedWithUserIdsRequired"),
              );
            }
          } else {
            // Clear shares only when explicitly changing to non-shared visibility
            await clearFilterShares(existingFilter.id, queryRunner);
          }
        }
        // If visibility is undefined, keep existing shares unchanged
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
          throw fastify.httpErrors.badRequest(
            fastify.t("filters.errors.nameAlreadyExistsWithSameType"),
          );
        }
        data = await filterRepo.save({
          name: filter.name,
          type: filter.type,
          filter: JSON.stringify(filter.filter),
          visibility: filter.visibility,
          created_by: filter.created_by,
        });
        // add filter clauses to the filter_clauses table within the transaction
        const filterClauses = filter.filter.post.clauses;
        await createOrUpdateFilterClauses(data.id, filterClauses?.ids ?? [], queryRunner);

        // Add filter shares if visibility is 'shared'
        if (filter.visibility === "shared") {
          if (filter.shared_with_user_ids) {
            await updateFilterShares(data.id, filter.shared_with_user_ids, queryRunner);
          } else {
            throw fastify.httpErrors.badRequest(
              fastify.t("filters.errors.sharedWithUserIdsRequired"),
            );
          }
        }
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
      where: { filter_id: filterId, deleted_at: IsNull() },
    });

    const existingClauseIds = existingFilterClauses.map((fc: XFilterClause) => fc.clause_id);

    // Delete clauses that are no longer needed
    const clausesToDelete = existingFilterClauses.filter(
      (fc: XFilterClause) => !clauseIds.includes(fc.clause_id),
    );
    if (clausesToDelete.length > 0) {
      await filterClauseRepo.softRemove(clausesToDelete);
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

  // Update filter shares for a filter
  const updateFilterShares = async (
    filterId: number,
    userIds: string[],
    queryRunner: QueryRunner,
  ) => {
    const filterShareRepo = queryRunner.manager.getRepository(XFilterShare);

    // Get existing shares
    const existingShares = await filterShareRepo.find({
      where: { filter_id: filterId, deleted_at: IsNull() },
    });

    const existingUserIds = existingShares.map((fs: XFilterShare) => fs.user_id);

    // Soft delete shares that are no longer needed
    const sharesToDelete = existingShares.filter(
      (fs: XFilterShare) => !userIds.includes(fs.user_id),
    );
    if (sharesToDelete.length > 0) {
      await filterShareRepo.softRemove(sharesToDelete);
    }

    // Add new shares
    const userIdsToAdd = userIds.filter((uid: string) => !existingUserIds.includes(uid));
    if (userIdsToAdd.length > 0) {
      const newShares = userIdsToAdd.map((userId) => ({
        filter_id: filterId,
        user_id: userId,
      }));
      await filterShareRepo.insert(newShares);
    }
  };

  // Clear all shares for a filter
  const clearFilterShares = async (filterId: number, queryRunner: QueryRunner) => {
    const filterShareRepo = queryRunner.manager.getRepository(XFilterShare);
    const existingShares = await filterShareRepo.find({
      where: { filter_id: filterId, deleted_at: IsNull() },
    });
    if (existingShares.length > 0) {
      await filterShareRepo.softRemove(existingShares);
    }
  };

  // Get shares for a filter
  const getFilterShares = async (filterId: number): Promise<string[]> => {
    const filterShareRepo = AppDataSource.getRepository(XFilterShare);
    const shares = await filterShareRepo.find({
      where: { filter_id: filterId, deleted_at: IsNull() },
    });
    return shares.map((share) => share.user_id);
  };

  // Leave a shared filter (user removes themselves from a filter shared with them)
  const leaveFilter = async (filterId: number, userId: string) => {
    const filterRepo = AppDataSource.getRepository(XFilter);
    const filterShareRepo = AppDataSource.getRepository(XFilterShare);

    // Check if filter exists
    const filter = await filterRepo.findOne({
      where: { id: filterId, deleted_at: IsNull() },
    });

    if (!filter) {
      throw fastify.httpErrors.notFound(fastify.t("filters.errors.notFound", { id: filterId }));
    }

    // Users cannot leave their own filters
    if (filter.created_by === userId) {
      throw fastify.httpErrors.badRequest(fastify.t("filters.errors.cannotLeaveOwnFilter"));
    }

    // For public filters, user cannot "leave" since they're not explicitly shared
    if (filter.visibility === "public") {
      throw fastify.httpErrors.badRequest(fastify.t("filters.errors.cannotLeavePublicFilter"));
    }

    // Check if user has a share entry for this filter
    const share = await filterShareRepo.findOne({
      where: { filter_id: filterId, user_id: userId, deleted_at: IsNull() },
    });

    if (!share) {
      throw fastify.httpErrors.notFound(fastify.t("filters.errors.shareNotFound"));
    }

    // Soft delete the share
    await filterShareRepo.softRemove(share);

    return {
      success: true,
      message: fastify.t("filters.messages.leftFilter"),
    };
  };

  const getFilter = async (id: number, userId: string) => {
    const filterRepo = AppDataSource.getRepository(XFilter);
    const data = await filterRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    const isOwn = data?.created_by === userId;
    if (!data) {
      throw fastify.httpErrors.notFound(fastify.t("filters.errors.notFound", { id }));
    }

    // Always get shared user IDs if they exist (needed for editing)
    // This allows users to see who the filter is shared with when editing
    const sharedWithUserIds = await getFilterShares(id);

    // Fetch user details for shared users
    let sharedWithUsers: Array<{ id: string; fullName: string; nationalId: string }> | undefined;
    if (sharedWithUserIds.length > 0) {
      const users = await UsersDataSource.getRepository(BetterAuthUser).find({
        where: { id: In(sharedWithUserIds), status: "active" },
        select: ["id", "fullName", "name", "nationalId"],
      });

      // Mask the national ID for privacy (show first digit and last 3 digits)
      sharedWithUsers = users.map((user) => ({
        id: user.id,
        fullName: user.fullName || user.name || "N/A",
        nationalId: user.nationalId
          ? `${user.nationalId.slice(0, 1)}${"*".repeat(Math.max(0, user.nationalId.length - 4))}${user.nationalId.slice(-3)}`
          : "N/A",
      }));
    }

    return {
      data: {
        ...data,
        filter: JSON.parse(data.filter) as TFilter,
        shared_with_user_ids: sharedWithUserIds.length > 0 ? sharedWithUserIds : undefined,
        shared_with_users: sharedWithUsers,
        is_own: isOwn,
      } as unknown as GetFilterResponse,
    };
  };

  const deleteFilter = async (id: number) => {
    const filterRepo = AppDataSource.getRepository(XFilter);
    const existingFilter = await filterRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!existingFilter) {
      throw fastify.httpErrors.notFound(fastify.t("filters.errors.notFound"));
    }
    await filterRepo.softRemove(existingFilter);

    // delete filter clauses
    const filterClauseRepo = AppDataSource.getRepository(XFilterClause);
    const existingFilterClauses = await filterClauseRepo.find({
      where: { filter_id: id, deleted_at: IsNull() },
    });
    if (existingFilterClauses.length > 0) {
      await filterClauseRepo.softRemove(existingFilterClauses);
    }

    // delete filter shares
    const filterShareRepo = AppDataSource.getRepository(XFilterShare);
    const existingFilterShares = await filterShareRepo.find({
      where: { filter_id: id, deleted_at: IsNull() },
    });
    if (existingFilterShares.length > 0) {
      await filterShareRepo.softRemove(existingFilterShares);
    }

    return {
      data: {
        success: true,
        message: fastify.t("filters.messages.deleted"),
      } as unknown as DeleteFilterResponse,
    };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("filterService", {
    getAllFilters,
    createOrUpdateFilter,
    getFilter,
    deleteFilter,
    getFilterShares,
    leaveFilter,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    filterService: {
      getAllFilters: (options: {
        type?: TSavedFilterType;
        skip: number;
        take: number;
        search?: string;
        userId: string;
        isOwn?: boolean;
      }) => Promise<{ data: GetAllFiltersResponse; totalRecords: number }>;
      createOrUpdateFilter: (filter: {
        id: number | undefined;
        name: string;
        type: TSavedFilterType;
        filter: TFilter;
        visibility?: FilterVisibility;
        created_by?: string;
        shared_with_user_ids?: string[];
      }) => Promise<{ data: GetFilterResponse }>;
      getFilter: (id: number, userId: string) => Promise<{ data: GetFilterResponse }>;
      deleteFilter: (id: number) => Promise<{ data: DeleteFilterResponse }>;
      getFilterShares: (filterId: number) => Promise<string[]>;
      leaveFilter: (
        filterId: number,
        userId: string,
      ) => Promise<{ success: boolean; message: string }>;
    };
  }
}
