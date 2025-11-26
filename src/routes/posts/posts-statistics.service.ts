import fp from "fastify-plugin";
import { TFilter as DataFilterType } from "../../models/types/comment.type";
import { In, IsNull } from "typeorm";
import { XDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { BaseFilter, Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";
import { TResponse as GetGeneralStatisticsResponse } from "./schemas/statistics/getGeneralStatistics.schema";
import { TResponse as GetAllDetailedStatisticsResponse } from "./schemas/statistics/getDetailedStatistics.schema";
import { TResponse as GetSentimentStatisticsResponse } from "./schemas/statistics/getSentimentStatistics.schema";

export type GroupBy = "day" | "month" | "quarter" | "year" | "hour" | "week";

export default fp(async (fastify) => {
  const getGeneralStatistics = async (filter: DataFilterType | undefined) => {
    const postRepo = XDataSource.getRepository(Post);

    // Generate all filter queries first
    const generalFilter = await generateFilterQuery(filter as Filter, {} as BaseFilter, fastify);

    const qb = postRepo
      .createQueryBuilder("post")
      .select([
        "SUM(CASE WHEN post.post_type = 'post' THEN 1 ELSE 0 END) AS posts_count",
        "SUM(CASE WHEN post.post_type = 'quote' THEN 1 ELSE 0 END) AS quotes_count",
        "SUM(CASE WHEN post.post_type = 'replied_to' THEN 1 ELSE 0 END) AS replies_count",
        "SUM(CASE WHEN post.post_type = 'post' OR post.post_type = 'quote' OR post.post_type = 'replied_to' THEN 1 ELSE 0 END) AS general_count",
      ]);

    qb.where(generalFilter);
    const result = await qb.getRawOne();

    return {
      data: {
        general: parseInt(result?.general_count || "0", 10),
        quote: parseInt(result?.quotes_count || "0", 10),
        replies: parseInt(result?.replies_count || "0", 10),
        posts: parseInt(result?.posts_count || "0", 10),
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
      case "week":
        return {
          select: [
            "DATEPART(WEEK, post.posted_at) AS week",
            "DATEPART(YEAR, post.posted_at) AS year",
          ],
          group: ["DATEPART(WEEK, post.posted_at)", "DATEPART(YEAR, post.posted_at)"],
          order: ["year", "week"],
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

    const filterQuery = await generateFilterQuery(
      filter as Filter,
      {
        post_type: postTypes,
      } as BaseFilter,
      fastify,
    );

    const postRepo = XDataSource.getRepository(Post);

    const metrics = (await postRepo
      .createQueryBuilder("post")
      .leftJoin("post.user", "user")
      .select([
        "COALESCE(SUM(CAST(post.retweet_count AS BIGINT)), 0) AS total_retweets",
        "COALESCE(SUM(CAST(post.like_count AS BIGINT)), 0) AS total_likes",
        "COALESCE(SUM(CAST(post.bookmark_count AS BIGINT)), 0) AS total_bookmarks",
        "COALESCE(SUM(CAST(post.impression_count AS BIGINT)), 0) AS total_impressions",
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
    const postRepo = XDataSource.getRepository(Post);

    // Generate all filter queries first
    const filterQuery = await generateFilterQuery(filter as Filter, {}, fastify);

    const qb = postRepo
      .createQueryBuilder("post")
      .select([
        "SUM(CASE WHEN post.sentiment = 'positive' THEN 1 ELSE 0 END) AS positive_count",
        "SUM(CASE WHEN post.sentiment = 'negative' THEN 1 ELSE 0 END) AS negative_count",
        "SUM(CASE WHEN post.sentiment = 'neutral' THEN 1 ELSE 0 END) AS neutral_count",
        "SUM(CASE WHEN post.sentiment IS NULL THEN 1 ELSE 0 END) AS none_count",
      ]);

    qb.where(filterQuery);
    const result = await qb.getRawOne();

    const total =
      parseInt(result?.positive_count || "0", 10) +
      parseInt(result?.negative_count || "0", 10) +
      parseInt(result?.neutral_count || "0", 10) +
      parseInt(result?.none_count || "0", 10);

    return {
      data: {
        positive: toPercentage(parseInt(result?.positive_count || "0", 10), total),
        negative: toPercentage(parseInt(result?.negative_count || "0", 10), total),
        neutral: toPercentage(parseInt(result?.neutral_count || "0", 10), total),
        none: toPercentage(parseInt(result?.none_count || "0", 10), total),
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
