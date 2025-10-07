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
    url: "/statistics/totals",
    schema: getGeneralStatisticsSchema,
    handler: async (request) => {
      const { filter } = request.body;
      const { data } = await fastify.postStatisticsService.getGeneralStatistics(filter);
      return data;
    },
  });

  fastify.route<getDetailedStatisticsSchemaType>({
    method: "POST",
    url: "/statistics/totals/detailed/:type",
    schema: getDetailedStatisticsSchema,
    handler: async (request) => {
      const { type } = request.params;
      const { filter } = request.body;
      if (filter?.post?.post_type) {
        delete filter.post.post_type;
      }
      const { data } = await fastify.postStatisticsService.getDetailedStatistics(type, filter);
      return data;
    },
  });

  fastify.route<getDetailedStatisticsSchemaType>({
    method: "POST",
    url: "/statistics/sentiment",
    schema: getDetailedStatisticsSchema,
    handler: async (request) => {
      const { type } = request.params;
      const { filter } = request.body;
      if (filter?.post?.post_type) {
        delete filter.post.post_type;
      }
      const { data } = await fastify.postStatisticsService.getDetailedStatistics(type, filter);
      return data;
    },
  });
};

export default postStatistics;
