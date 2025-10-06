import fp from "fastify-plugin";
import { TFilter as DataFilterType } from "../../models/types/comment.type";
import { In } from "typeorm";
import { AppDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";
import { TResponse as GetGeneralStatisticsResponse } from "./schemas/statistics/getGeneralStatistics.schema";
import { TResponse as GetAllDetailedStatisticsResponse } from "./schemas/statistics/getDetailedStatistics.schema";

export default fp(async (fastify) => {
  const getGeneralStatistics = async (filter: DataFilterType | undefined) => {
    const filterQuery = generateFilterQuery(filter as Filter);
    const postRepo = AppDataSource.getRepository(Post);

    const [generalCount, postsCount, quotesCount, repliesCount] = await Promise.all([
      postRepo.count({
        where: {
          post_type: In(["post", "quote", "replied_to"]),
          ...filterQuery,
        },
      }),
      postRepo.count({
        where: {
          post_type: "post",
          ...filterQuery,
        },
      }),
      postRepo.count({
        where: {
          post_type: "quote",
          ...filterQuery,
        },
      }),
      postRepo.count({
        where: {
          post_type: "replied_to",
          ...filterQuery,
        },
      }),
    ]);

    return {
      data: {
        general: generalCount,
        quote: quotesCount,
        replies: repliesCount,
        posts: postsCount,
      },
    };
  };

  // TODO: implement the function
  const getDetailedStatistics = async (filter: DataFilterType | undefined) => {
    const filterQuery = generateFilterQuery(filter as Filter);
    const replyRepo = AppDataSource.getRepository(Post);

    const qb = replyRepo.createQueryBuilder("detailed-statistics").setFindOptions({
      where: [
        {
          ...filterQuery,
        },
      ],
    });

    const data = await qb.getOne();

    return { data: data as unknown as GetAllDetailedStatisticsResponse };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("postStatisticsService", {
    getGeneralStatistics,
    getDetailedStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    postStatisticsService: {
      getGeneralStatistics: (
        filter: DataFilterType | undefined,
      ) => Promise<{ data: GetGeneralStatisticsResponse }>;
      getDetailedStatistics: (
        filter: DataFilterType | undefined,
      ) => Promise<{ data: GetAllDetailedStatisticsResponse }>;
    };
  }
}
