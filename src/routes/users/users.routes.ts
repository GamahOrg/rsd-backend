import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getUsersSchema, usersSchemaType } from "./schemas/getUsers.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import { getUserSchema, userSchemaType } from "./schemas/getUser.schema";

const user: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all users
  fastify.route<usersSchemaType>({
    method: "GET",
    url: "/usernames",
    schema: getUsersSchema,
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
  fastify.route<userSchemaType>({
    method: "GET",
    url: "/:user_id",
    schema: getUserSchema,
    handler: async (request) => {
      const { user_id } = request.params;
      const { data } = await fastify.userService.getUser(user_id);
      return data;
    },
  });
};

export default user;
