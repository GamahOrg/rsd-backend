import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getUsernamesListSchema, getUsernamesListSchemaType } from "./schemas/getUsernames.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import { getUserInfoSchema, getUserInfoSchemaType } from "./schemas/getUser.schema";

const user: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
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

  // // api to get all users with statistics
  // fastify.route<userSchemaType>({
  //   method: "POST",
  //   url: "/",
  //   schema: getUsernamesListSchemaType,
  //   handler: async (request) => {
  //     const { data } = await fastify.userService.getUsers(user_id);
  //     return data;
  //   },
  // });

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
