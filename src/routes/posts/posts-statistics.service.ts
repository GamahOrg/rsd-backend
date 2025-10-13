import fp from "fastify-plugin";
import { TFilter as DataFilterType } from "../../models/types/comment.type";
import { In } from "typeorm";
import { AppDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { BaseFilter, Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";
import { TResponse as GetGeneralStatisticsResponse } from "./schemas/statistics/getGeneralStatistics.schema";
import { TResponse as GetAllDetailedStatisticsResponse } from "./schemas/statistics/getDetailedStatistics.schema";
import { TResponse as GetSentimentStatisticsResponse } from "./schemas/statistics/getSentimentStatistics.schema";

export type GroupBy = "day" | "month" | "quarter" | "year" | "hour";

export default fp(async (fastify) => {
  const getGeneralStatistics = async (filter: DataFilterType | undefined) => {
    const postRepo = AppDataSource.getRepository(Post);

    const [generalCount, postsCount, quotesCount, repliesCount] = await Promise.all([
      postRepo.count({
        where: generateFilterQuery(
          filter as Filter,
          {
            post_type: In(["post", "quote", "replied_to"]),
          } as BaseFilter,
        ),
      }),
      postRepo.count({
        where: generateFilterQuery(
          filter as Filter,
          {
            post_type: "post",
          } as BaseFilter,
        ),
      }),
      postRepo.count({
        where: generateFilterQuery(
          filter as Filter,
          {
            post_type: "quote",
          } as BaseFilter,
        ),
      }),
      postRepo.count({
        where: generateFilterQuery(
          filter as Filter,
          {
            post_type: "replied_to",
          } as BaseFilter,
        ),
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

  const buildGrouping = (groupBy: GroupBy) => {
    switch (groupBy) {
      case "month":
        return {
          select: [
            "DATEPART(MONTH, post.posted_at) AS month",
            "DATEPART(YEAR, post.posted_at) AS year",
          ],
          group: ["DATEPART(MONTH, post.posted_at)", "DATEPART(YEAR, post.posted_at)"],
          order: ["year", "month"],
        };
      case "quarter":
        return {
          select: [
            "DATEPART(QUARTER, post.posted_at) AS quarter",
            "DATEPART(YEAR, post.posted_at) AS year",
          ],
          group: ["DATEPART(QUARTER, post.posted_at)", "DATEPART(YEAR, post.posted_at)"],
          order: ["year", "quarter"],
        };
      case "year":
        return {
          select: ["DATEPART(YEAR, post.posted_at) AS year"],
          group: ["DATEPART(YEAR, post.posted_at)"],
          order: ["year"],
        };
      case "hour":
        return {
          select: [
            "DATEPART(HOUR, post.posted_at) AS hour",
            "DATEPART(DAY, post.posted_at) AS day",
            "DATEPART(MONTH, post.posted_at) AS month",
            "DATEPART(YEAR, post.posted_at) AS year",
          ],
          group: [
            "DATEPART(HOUR, post.posted_at)",
            "DATEPART(DAY, post.posted_at)",
            "DATEPART(MONTH, post.posted_at)",
            "DATEPART(YEAR, post.posted_at)",
          ],
          order: ["year", "month", "day", "hour"],
        };
      case "day":
      default:
        return {
          select: [
            "DATEPART(DAY, post.posted_at) AS day",
            "DATEPART(MONTH, post.posted_at) AS month",
            "DATEPART(YEAR, post.posted_at) AS year",
          ],
          group: [
            "DATEPART(DAY, post.posted_at)",
            "DATEPART(MONTH, post.posted_at)",
            "DATEPART(YEAR, post.posted_at)",
          ],
          order: ["year", "month", "day"],
        };
    }
  };

  const getDetailedStatistics = async (
    type: string,
    groupBy: GroupBy,
    filter: DataFilterType | undefined,
  ) => {
    // normalize post types.
    const postTypes = type === "general" ? In(["post", "quote", "replied_to"]) : type;

    const filterQuery = generateFilterQuery(
      filter as Filter,
      {
        post_type: postTypes,
      } as BaseFilter,
    );

    const postRepo = AppDataSource.getRepository(Post);

    const metrics = (await postRepo
      .createQueryBuilder("post")
      .leftJoin("post.user", "user")
      .select([
        "COALESCE(SUM(post.retweet_count), 0) AS total_retweets",
        "COALESCE(SUM(post.like_count), 0) AS total_likes",
        "COALESCE(SUM(post.bookmark_count), 0) AS total_bookmarks",
        "COALESCE(SUM(post.impression_count), 0) AS total_impressions",
      ])
      .where(filterQuery)
      .getRawOne()) as {
      total_retweets: number;
      total_likes: number;
      total_bookmarks: number;
      total_impressions: number;
    };

    // 2) chart data grouped by requested grain
    const { select, group, order } = buildGrouping(groupBy);

    const chartQb = postRepo
      .createQueryBuilder("post")
      .leftJoin("post.user", "user")
      .select([...select, "COUNT(*) AS total"])
      .where(filterQuery)
      .groupBy(group.join(", "));

    // apply stable ASC ordering across all aliases
    chartQb.orderBy(order[0], "ASC");
    for (const col of order.slice(1)) chartQb.addOrderBy(col, "ASC");

    const chartData = await chartQb.getRawMany();

    return {
      data: {
        chart_data: chartData,
        metrics,
      } as unknown as GetAllDetailedStatisticsResponse,
    };
  };

  const getSentimentStatistics = async (filter?: DataFilterType) => {
    const sentiments = ["positive", "negative", "neutral"] as const;

    const postRepo = AppDataSource.getRepository(Post);

    const counts = await Promise.all(
      sentiments.map((sentiment) =>
        postRepo.count({
          where: generateFilterQuery(filter as Filter, {
            sentiment: sentiment,
          }),
        }),
      ),
    );

    const [positive, negative, neutral] = counts;
    const total = positive + negative + neutral;

    return {
      data: {
        positive: toPercentage(positive, total),
        negative: toPercentage(negative, total),
        neutral: toPercentage(neutral, total),
      },
    };
  };

  const toPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 10000) / 100 : 0; // rounded to 2 decimals

  // Decorate the fastify instance with the postService
  fastify.decorate("postStatisticsService", {
    getGeneralStatistics,
    getDetailedStatistics,
    getSentimentStatistics,
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
        groupBy: GroupBy,
        filter: DataFilterType | undefined,
      ) => Promise<{ data: GetAllDetailedStatisticsResponse }>;
      getSentimentStatistics: (
        filter: DataFilterType | undefined,
      ) => Promise<{ data: GetSentimentStatisticsResponse }>;
    };
  }
}
