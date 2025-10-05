import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getGeneralStatisticsSchema,
  getGeneralStatisticsSchemaType,
} from "./schemas/statistics/getGeneralStatistics.schema";

const postStatistics: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  fastify.route<getGeneralStatisticsSchemaType>({
    method: "GET",
    url: "/posts/general/statistics",
    schema: getGeneralStatisticsSchema,
    handler: async (request) => {
      const { filter } = request.query;
      const { data } = await fastify.postStatisticsService.getGeneralStatistics(filter);
      return data;
    },
  });

  // fastify.route<getDetailedStatisticsSchemaType>({
  //   method: "GET",
  //   url: "/posts/detailed/statistics",
  //   schema: getDetailedStatisticsSchema,
  //   handler: async (request) => {
  //     const { filter } = request.query;
  //     const { data } = await fastify.postStatisticsService.getDetailedStatistics(filter);
  //     return data;
  //   },
  // });
};

export default postStatistics;
