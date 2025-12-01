import fp from "fastify-plugin";
import { XDataSource } from "../../config/database";
import { TResponse as GetIsVerifiedStatisticsResponse } from "./schemas/statistics/getIsVerifiedStatistics.schema";
import { User } from "../../database/entity/User.entity";
import { TResponse as GetVerifiedTypeStatisticsResponse } from "./schemas/statistics/getIsVerifiedTypeStatistics.schema";
import { Post } from "../../database/entity/Post.entity";
import { TResponse as GetUserPostsStatisticsResponse } from "./schemas/statistics/GetUserPostsStatistics.schema";
import { MoreThan, Not } from "typeorm";
import { TFilter as dataFilterType } from "../../models/types/comment.type";
import { BaseFilter, Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";

export default fp(async (fastify) => {
  const getIsVerifiedStatistics = async () => {
    const userRepo = XDataSource.getRepository(User);

    const qb = userRepo
      .createQueryBuilder("user")
      .select([
        "SUM(CASE WHEN user.is_verified = 1 THEN 1 ELSE 0 END) AS verified_count",
        "SUM(CASE WHEN user.is_verified = 0 THEN 1 ELSE 0 END) AS unverified_count",
      ]);

    qb.where({ tweet_count: MoreThan(0), like_count: MoreThan(0) });

    const result = await qb.getRawOne();
    const total =
      parseInt(result?.verified_count || "0", 10) + parseInt(result?.unverified_count || "0", 10);

    return {
      data: {
        verified: toPercentage(parseInt(result?.verified_count || "0", 10), total),
        unverified: toPercentage(parseInt(result?.unverified_count || "0", 10), total),
      },
    };
  };
  const getVerifiedTypeStatistics = async () => {
    const userRepo = XDataSource.getRepository(User);

    const qb = userRepo
      .createQueryBuilder("user")
      .select([
        "SUM(CASE WHEN user.verified_type = 'government' THEN 1 ELSE 0 END) AS government_count",
        "SUM(CASE WHEN user.verified_type = 'blue' THEN 1 ELSE 0 END) AS blue_count",
        "SUM(CASE WHEN user.verified_type = 'business' THEN 1 ELSE 0 END) AS business_count",
      ]);

    qb.where({ tweet_count: MoreThan(0), like_count: MoreThan(0) });

    const result = await qb.getRawOne();
    const total =
      parseInt(result?.government_count || "0", 10) +
      parseInt(result?.blue_count || "0", 10) +
      parseInt(result?.business_count || "0", 10);
    return {
      data: {
        government: toPercentage(parseInt(result?.government_count || "0", 10), total),
        blue: toPercentage(parseInt(result?.blue_count || "0", 10), total),
        business: toPercentage(parseInt(result?.business_count || "0", 10), total),
      },
    };
  };

  const toPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 10000) / 100 : 0; // rounded to 2 decimals

  const getUserPostsStatistics = async (user_id: string, filter: dataFilterType) => {
    const whereClause = await generateFilterQuery(
      filter as Filter,
      { user_id: user_id, post_type: Not("retweet") } as BaseFilter,
      fastify,
    );

    const postRepo = XDataSource.getRepository(Post);

    const qb = postRepo
      .createQueryBuilder("post")
      .select([
        "SUM(CASE WHEN post.sentiment = 'positive' THEN 1 ELSE 0 END) AS positive_posts_count",
        "SUM(CASE WHEN post.sentiment = 'negative' THEN 1 ELSE 0 END) AS negative_posts_count",
        "SUM(CASE WHEN post.sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral_posts_count",
        "SUM(CASE WHEN post.sentiment IS NULL THEN 1 ELSE 0 END) AS undefined_posts_count",
      ]);

    qb.where(whereClause);

    const result = await qb.getRawOne();

    return {
      data: {
        positive_posts_count: parseInt(result?.positive_posts_count || "0", 10),
        negative_posts_count: parseInt(result?.negative_posts_count || "0", 10),
        neutral_posts_count: parseInt(result?.neutral_posts_count || "0", 10),
        undefined_posts_count: parseInt(result?.undefined_posts_count || "0", 10),
      },
    };
  };
  // Decorate the fastify instance with the usersStatisticsService
  fastify.decorate("usersStatisticsService", {
    getIsVerifiedStatistics,
    getVerifiedTypeStatistics,
    getUserPostsStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    usersStatisticsService: {
      getIsVerifiedStatistics: () => Promise<{ data: GetIsVerifiedStatisticsResponse }>;
      getVerifiedTypeStatistics: () => Promise<{ data: GetVerifiedTypeStatisticsResponse }>;
      getUserPostsStatistics: (
        user_id: string,
        filter: dataFilterType,
      ) => Promise<{ data: GetUserPostsStatisticsResponse }>;
    };
  }
}
