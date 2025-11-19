import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getIsVerifiedStatisticsSchema,
  getIsVerifiedStatisticsSchemaType,
} from "./schemas/statistics/getIsVerifiedStatistics.schema";
import {
  getVerifiedTypeStatisticsSchema,
  getVerifiedTypeStatisticsSchemaType,
} from "./schemas/statistics/getIsVerifiedTypeStatistics.schema";

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
};

export default usersStatistics;
