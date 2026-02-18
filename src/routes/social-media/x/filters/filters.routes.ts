import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { getFiltersSchema, filtersSchemaType } from "./schemas/getFilters.schema";
import { setPaginationHeaders } from "../../../../helper/setPaginationHeaders";
import {
  createOrUpdateFilterSchema,
  createOrUpdateFilterSchemaType,
  TBody as TCreateOrUpdateFilterBody,
} from "./schemas/createOrUpdateFilter.schema";
import { getFilterSchema, getFilterSchemaType } from "./schemas/getFilter.schema";
import { deleteFilterSchema, deleteFilterSchemaType } from "./schemas/deleteFilterSchema.schema";
import { leaveFilterSchema, leaveFilterSchemaType } from "./schemas/leaveFilter.schema";
import { TSavedFilterType } from "../../../../helper/common";
import { auth } from "../../../../lib/auth";
import { FastifyReply } from "fastify";
import { UsersDataSource } from "../../../../config/database";
import { BetterAuthUser } from "../../../../lib/BetterAuthUser.entity";

// Helper to get user session from request headers
const getUserId = async (
  headers: Record<string, string | string[] | undefined>,
  reply: FastifyReply,
): Promise<{ userId: string; error: FastifyReply | null }> => {
  const headersList = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    if (value) headersList.append(key, Array.isArray(value) ? value[0] : value);
  });

  const session = await auth.api.getSession({
    query: { disableCookieCache: true },
    headers: headersList,
  });
  // if no session, throw 401
  if (!session) {
    return {
      userId: "",
      error: reply.status(401).send({ message: "Unauthorized - session required" }),
    };
  }
  if (!session.user) {
    return {
      userId: "",
      error: reply.status(401).send({ message: "Unauthorized - user required" }),
    };
  }
  if (!session.user.id) {
    return {
      userId: "",
      error: reply.status(401).send({ message: "Unauthorized - user id required" }),
    };
  }

  return { userId: session.user.id as string, error: null };
};

const filter: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to search platform users for filter sharing
  fastify.route({
    method: "GET",
    url: "/platform-users",
    schema: {
      tags: ["filter"],
      summary: "Search platform users for filter sharing",
      description: "Search for platform users by name or national ID for sharing filters",
      querystring: Type.Object({
        query: Type.Optional(Type.String()),
        limit: Type.Optional(Type.Number({ default: 10, maximum: 50 })),
      }),
      response: {
        200: Type.Object({
          users: Type.Array(
            Type.Object({
              id: Type.String(),
              fullName: Type.String(),
              nationalId: Type.String(),
            }),
          ),
        }),
      },
    },
    handler: async (request) => {
      const { query, limit = 10 } = request.query as { query?: string; limit?: number };

      try {
        const searchTerm = query?.trim() || "";

        // Require at least 2 characters for search
        if (!searchTerm || searchTerm.length < 2) {
          return { users: [] };
        }

        // Use TypeORM to search better-auth users
        const userRepository = UsersDataSource.getRepository(BetterAuthUser);
        const users = await userRepository
          .createQueryBuilder("user")
          .where("user.fullName LIKE :search", { search: `%${searchTerm}%` })
          .orWhere("user.nationalId LIKE :search", { search: `%${searchTerm}%` })
          .andWhere("user.status = :status", { status: "active" })
          .take(Math.min(limit, 50))
          .getMany();

        // Mask the national ID for privacy (show first digit and last 3 digits)
        const maskedUsers = users.map((user) => ({
          id: user.id,
          fullName: user.fullName || user.name || "N/A",
          nationalId: user.nationalId
            ? `${user.nationalId.slice(0, 1)}${"*".repeat(Math.max(0, user.nationalId.length - 4))}${user.nationalId.slice(-3)}`
            : "N/A",
        }));

        return { users: maskedUsers };
      } catch (error) {
        fastify.log.error({ err: error }, "Error searching platform users");
        return { users: [] };
      }
    },
  });

  // api to get all filters
  fastify.route<filtersSchemaType>({
    method: "GET",
    url: "/",
    schema: getFiltersSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { type, search, is_own } = request.query as {
        type?: TSavedFilterType;
        search?: string;
        is_own?: boolean;
      };

      // Get user session for visibility filtering
      const { userId, error } = await getUserId(request.headers, response);
      if (error || !userId) return error;

      const { data, totalRecords } = await fastify.filterService.getAllFilters({
        type,
        skip,
        take,
        search,
        userId,
        isOwn: is_own,
      });
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to create or update a filter
  fastify.route<createOrUpdateFilterSchemaType>({
    method: "POST",
    url: "/",
    schema: createOrUpdateFilterSchema,
    handler: async (request, response) => {
      const filter = request.body as TCreateOrUpdateFilterBody;
      // Get user session for created_by field
      const { userId, error } = await getUserId(request.headers, response);
      if (error) return error;

      const { data } = await fastify.filterService.createOrUpdateFilter({
        id: filter.id ? Number(filter.id) : undefined,
        name: filter.name,
        type: filter.type,
        filter: filter.filter,
        created_by: userId,
        visibility: filter.visibility,
        shared_with_user_ids: filter.shared_with_user_ids,
      });
      return data;
    },
  });

  fastify.route<getFilterSchemaType>({
    method: "GET",
    url: "/:id",
    schema: getFilterSchema,
    handler: async (request, response) => {
      const { id } = request.params;
      const { userId, error } = await getUserId(request.headers, response);
      if (error || !userId) return error;
      const { data } = await fastify.filterService.getFilter(Number(id), userId);
      return data;
    },
  });

  // api to delete a filter
  fastify.route<deleteFilterSchemaType>({
    method: "DELETE",
    url: "/:id",
    schema: deleteFilterSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.filterService.deleteFilter(Number(id));
      return data;
    },
  });

  // api to leave a shared filter (user removes themselves from a filter shared with them)
  fastify.route<leaveFilterSchemaType>({
    method: "POST",
    url: "/:id/leave",
    schema: leaveFilterSchema,
    handler: async (request, response) => {
      const { id } = request.params;

      // Get user session
      const { userId, error } = await getUserId(request.headers, response);
      if (error) return error;

      const result = await fastify.filterService.leaveFilter(Number(id), userId);
      return result;
    },
  });
};

export default filter;
