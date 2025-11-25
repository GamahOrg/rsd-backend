import fp from "fastify-plugin";
import { XDataSource } from "../../config/database";
import { TResponse as GetIsVerifiedStatisticsResponse } from "./schemas/statistics/getIsVerifiedStatistics.schema";
import { User } from "../../database/entity/User.entity";
import { TResponse as GetVerifiedTypeStatisticsResponse } from "./schemas/statistics/getIsVerifiedTypeStatistics.schema";
import { Post } from "../../database/entity/Post.entity";
import { TResponse as GetUserPostsStatisticsResponse } from "./schemas/statistics/GetUserPostsStatistics.schema";
import { MoreThan } from "typeorm";
import { TFilter as dataFilterType } from "../../models/types/comment.type";
import { BaseFilter, Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";

export default fp(async (fastify) => {
  const getIsVerifiedStatistics = async () => {
    const verifiedTypes = ["verified", "unverified"] as const;

    const userRepo = XDataSource.getRepository(User);

    // Generate all filter queries first
    const filterQueries = verifiedTypes.map((verifiedType) => ({
      is_verified: verifiedType === "verified",
    }));

    const counts = await Promise.all(
      filterQueries.map((filterQuery) =>
        userRepo.count({
          where: { ...filterQuery, tweet_count: MoreThan(0), like_count: MoreThan(0) },
        }),
      ),
    );
    const [verified, unverified] = counts;
    const total = verified + unverified;

    return {
      data: {
        verified: toPercentage(verified, total),
        unverified: toPercentage(unverified, total),
      },
    };
  };
  const getVerifiedTypeStatistics = async () => {
    const verifiedTypes = ["government", "blue", "business"] as const;
    const userRepo = XDataSource.getRepository(User);
    const [government, blue, business] = await Promise.all(
      verifiedTypes.map((verifiedType) =>
        userRepo.count({
          where: { verified_type: verifiedType, tweet_count: MoreThan(0), like_count: MoreThan(0) },
        }),
      ),
    );
    const total = government + blue + business;
    return {
      data: {
        government: toPercentage(government, total),
        blue: toPercentage(blue, total),
        business: toPercentage(business, total),
      },
    };
  };

  const toPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 10000) / 100 : 0; // rounded to 2 decimals

  const getUserPostsStatistics = async (user_id: string, filter: dataFilterType) => {
    const whereClause = await generateFilterQuery(
      filter as Filter,
      { user_id: user_id } as BaseFilter,
      fastify,
    );

    const postRepo = XDataSource.getRepository(Post);

    const qb = postRepo
      .createQueryBuilder("post")
      .select([
        "SUM(CASE WHEN post.sentiment = 'positive' THEN 1 ELSE 0 END) AS positive_posts_count",
        "SUM(CASE WHEN post.sentiment = 'negative' THEN 1 ELSE 0 END) AS negative_posts_count",
        "SUM(CASE WHEN post.sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral_posts_count",
      ]);

    qb.where(whereClause);

    const result = await qb.getRawOne();

    return {
      data: {
        positive_posts_count: parseInt(result?.positive_posts_count || "0", 10),
        negative_posts_count: parseInt(result?.negative_posts_count || "0", 10),
        neutral_posts_count: parseInt(result?.neutral_posts_count || "0", 10),
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
