import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getIsVerifiedStatisticsSchema,
  getIsVerifiedStatisticsSchemaType,
} from "./schemas/statistics/getIsVerifiedStatistics.schema";
import {
  getVerifiedTypeStatisticsSchema,
  getVerifiedTypeStatisticsSchemaType,
} from "./schemas/statistics/getIsVerifiedTypeStatistics.schema";
import {
  getUserPostsStatisticsSchema,
  getUserPostsStatisticsSchemaType,
} from "./schemas/statistics/GetUserPostsStatistics.schema";

const usersStatistics: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  fastify.route<getIsVerifiedStatisticsSchemaType>({
    method: "GET",
    url: "/statistics/is-verified",
    schema: getIsVerifiedStatisticsSchema,
    handler: async () => {
      const { data } = await fastify.usersStatisticsService.getIsVerifiedStatistics();
      return data;
    },
  });

  fastify.route<getVerifiedTypeStatisticsSchemaType>({
    method: "GET",
    url: "/statistics/verified-type",
    schema: getVerifiedTypeStatisticsSchema,
    handler: async () => {
      const { data } = await fastify.usersStatisticsService.getVerifiedTypeStatistics();
      return data;
    },
  });

  fastify.route<getUserPostsStatisticsSchemaType>({
    method: "GET",
    url: "/:user_id/posts/statistics",
    schema: getUserPostsStatisticsSchema,
    handler: async (request) => {
      const { user_id } = request.params as { user_id: string };
      const { data } = await fastify.usersStatisticsService.getUserPostsStatistics(user_id);
      return data;
    },
  });
};

export default usersStatistics;
