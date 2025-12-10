import fp from "fastify-plugin";
import { XDataSource } from "../../../../config/database";
import { PostStatisticsSummary } from "../../../../database/entity/PostStatisticsSummary.entity";
import { TResponse as GetPostStatisticsResponse } from "./schemas/getPostStatistics.schema";
import { Keyword } from "../../../../database/entity/Keyword.entity";

export default fp(async (fastify) => {
  const getPostStatistics = async () => {
    const postStatisticsSummaryRepo = XDataSource.getRepository(PostStatisticsSummary);

    const qb = postStatisticsSummaryRepo.createQueryBuilder("postStatisticsSummary").select("*");

    const data = await qb.getRawOne();

    // get total keywords
    const keywordRepo = XDataSource.getRepository(Keyword);
    const totalKeywords = await keywordRepo.count();

    return {
      data: { ...data, total_keywords: totalKeywords } as unknown as GetPostStatisticsResponse,
    };
  };

  // Decorate the fastify instance with the statisticsService
  fastify.decorate("statisticsService", {
    getPostStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    statisticsService: {
      getPostStatistics: () => Promise<{ data: GetPostStatisticsResponse }>;
    };
  }
}
