import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getUsernamesListSchema, getUsernamesListSchemaType } from "./schemas/getUsernames.schema";
import { setPaginationHeaders } from "../../../../helper/setPaginationHeaders";
import { getUserInfoSchema, getUserInfoSchemaType } from "./schemas/getUser.schema";
import { getAllUsersSchema, getAllUsersSchemaType } from "./schemas/getAllUsers.schema";

const user: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all users
  fastify.route<getAllUsersSchemaType>({
    method: "GET",
    url: "/",
    schema: getAllUsersSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { search, field, direction } = request.query as {
        search: string;
        field: string;
        direction: "asc" | "desc";
      };
      const order_by = { field: field || "followers_count", direction: direction || "desc" };
      const { data, totalRecords } = await fastify.userService.getAllUsers(
        search,
        order_by,
        skip,
        take,
      );
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to get users usernames list
  fastify.route<getUsernamesListSchemaType>({
    method: "GET",
    url: "/usernames",
    schema: getUsernamesListSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { search } = request.query as { search: string };
      const { data, totalRecords } = await fastify.userService.getUsernamesByUsername(
        search,
        skip,
        take,
      );
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to get specific user
  fastify.route<getUserInfoSchemaType>({
    method: "GET",
    url: "/:user_id",
    schema: getUserInfoSchema,
    handler: async (request) => {
      const { user_id } = request.params;
      const { data } = await fastify.userService.getUser(user_id);
      return data;
    },
  });
};

export default user;
