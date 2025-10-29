import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getPostStatisticsSchema,
  getPostStatisticsSchemaType,
} from "./schemas/getPostStatistics.schema";

const user: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get specific user
  fastify.route({
    method: "GET",
    url: "/posts/summary",
    schema: getPostStatisticsSchema,
    handler: async () => {
      const { data } = await fastify.statisticsService.getPostStatistics();
      return data;
    },
  });
};

export default user;
