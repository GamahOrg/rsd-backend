import fp from "fastify-plugin";
import { XDataSource } from "../../config/database";
import { TResponse as GetIsVerifiedStatisticsResponse } from "./schemas/statistics/getIsVerifiedStatistics.schema";
import { User } from "../../database/entity/User.entity";
import { TResponse as GetVerifiedTypeStatisticsResponse } from "./schemas/statistics/getIsVerifiedTypeStatistics.schema";
import { Post } from "../../database/entity/Post.entity";
import { TResponse as GetUserPostsStatisticsResponse } from "./schemas/statistics/GetUserPostsStatistics.schema";
import { MoreThan } from "typeorm";

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

  const getUserPostsStatistics = async (user_id: string) => {
    const postRepo = XDataSource.getRepository(Post);

    // Execute all counts in parallel at the database level
    const [
      positive_posts_count,
      negative_posts_count,
      neutral_posts_count,
      quotes_count,
      retweets_count,
    ] = await Promise.all([
      postRepo.count({ where: { user_id, sentiment: "positive" } }),
      postRepo.count({ where: { user_id, sentiment: "negative" } }),
      postRepo.count({ where: { user_id, sentiment: "neutral" } }),
      postRepo.count({ where: { user_id, post_type: "quote" } }),
      postRepo.count({ where: { user_id, post_type: "retweet" } }),
    ]);

    return {
      data: {
        positive_posts_count,
        negative_posts_count,
        neutral_posts_count,
        quotes_count,
        retweets_count,
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
      ) => Promise<{ data: GetUserPostsStatisticsResponse }>;
    };
  }
}
