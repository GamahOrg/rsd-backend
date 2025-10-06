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
  const getDetailedStatistics = async (type: string, filter: DataFilterType | undefined) => {
    const filterQuery = generateFilterQuery(filter as Filter);
    const postRepo = AppDataSource.getRepository(Post);
    const queryFilter = {
      post_type: type == "general" ? In(["post", "quote", "replied_to"]) : type,
      ...filterQuery,
    };
    const [totalRetweets, totalLikes, totalBookmarks, totalImpressions] = await Promise.all([
      postRepo
        .createQueryBuilder("post")
        .leftJoin("post.user", "user")
        .select("sum(post.retweet_count) as total")
        .where(queryFilter)
        .getRawOne() as Promise<{ total: number }>,
      postRepo
        .createQueryBuilder("post")
        .leftJoin("post.user", "user")
        .select("sum(post.like_count) as total")
        .where(queryFilter)
        .getRawOne() as Promise<{ total: number }>,
      postRepo
        .createQueryBuilder("post")
        .leftJoin("post.user", "user")
        .select("sum(post.bookmark_count) as total")
        .where(queryFilter)
        .getRawOne() as Promise<{ total: number }>,
      postRepo
        .createQueryBuilder("post")
        .leftJoin("post.user", "user")
        .select("sum(post.impression_count) as total")
        .where(queryFilter)
        .getRawOne() as Promise<{ total: number }>,
    ]);

    return {
      data: {
        chart_data: [],
        metrics: {
          total_retweets: totalRetweets.total,
          total_likes: totalLikes.total,
          total_bookmarks: totalBookmarks.total,
          total_impressions: totalImpressions.total,
        },
      } as unknown as GetAllDetailedStatisticsResponse,
    };
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
        type: string,
        filter: DataFilterType | undefined,
      ) => Promise<{ data: GetAllDetailedStatisticsResponse }>;
    };
  }
}
