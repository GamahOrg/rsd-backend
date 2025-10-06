import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getGeneralStatisticsSchema,
  getGeneralStatisticsSchemaType,
} from "./schemas/statistics/getGeneralStatistics.schema";
import {
  getDetailedStatisticsSchema,
  getDetailedStatisticsSchemaType,
} from "./schemas/statistics/getDetailedStatistics.schema";

const postStatistics: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  fastify.route<getGeneralStatisticsSchemaType>({
    method: "POST",
    url: "/general/statistics",
    schema: getGeneralStatisticsSchema,
    handler: async (request) => {
      const { filter } = request.body;
      const { data } = await fastify.postStatisticsService.getGeneralStatistics(filter);
      return data;
    },
  });

  fastify.route<getDetailedStatisticsSchemaType>({
    method: "POST",
    url: "/detailed/statistics/:type",
    schema: getDetailedStatisticsSchema,
    handler: async (request) => {
      const { filter } = request.body;
      const { data } = await fastify.postStatisticsService.getDetailedStatistics(filter);
      return data;
    },
  });
};

export default postStatistics;
