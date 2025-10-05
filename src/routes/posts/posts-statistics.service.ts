import fp from "fastify-plugin";
import { TFilter as GetAllPostsFilter } from "./schemas/getPosts.schema";
import { AppDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";
import { TResponse as GetGeneralStatisticsResponse } from "./schemas/statistics/getGeneralStatistics.schema";
import { In } from "typeorm";
// import { TResponse as GetAllPostsDetailedStatisticsResponseResponse } from "./schemas/statistics/getDetailedStatistics.schema";

export default fp(async (fastify) => {
  const getGeneralStatistics = async (filter: GetAllPostsFilter | undefined) => {
    // query
    const filterQuery = generateFilterQuery(filter as Filter);
    const postRepo = AppDataSource.getRepository(Post);
    const generalQb = postRepo
      .createQueryBuilder("post")
      .select("COUNT(*) as total")
      .where({
        post_type: In(["post", "quote", "replied_to"]),
        ...filterQuery,
      });
    const totalQuotesQb = postRepo
      .createQueryBuilder("post")
      .select("COUNT(*) as total")
      .where({
        post_type: "quote",
        ...filterQuery,
      });
    const totalRepliesQb = postRepo
      .createQueryBuilder("post")
      .select("COUNT(*) as total")
      .where({
        post_type: "replied_to",
        ...filterQuery,
      });

    const totalPostsQb = postRepo
      .createQueryBuilder("post")
      .select("COUNT(*) as total")
      .where({
        post_type: "post",
        ...filterQuery,
      });

    const [totalGeneral, totalPosts, totalQuotes, totalReplies] = await Promise.all([
      generalQb.getRawOne(),
      totalPostsQb.getRawOne(),
      totalQuotesQb.getRawOne(),
      totalRepliesQb.getRawOne(),
    ]);

    return {
      data: {
        general: totalGeneral.total,
        quote: totalQuotes.total,
        replies: totalReplies.total,
        posts: totalPosts.total,
      },
    };
  };

  // const getDetailedStatistics = async (filter: GetAllPostsFilter | undefined) => {
  //   const filterQuery = generateFilterQuery(filter as Filter);
  //   const replyRepo = AppDataSource.getRepository(Post);

  //   const qb = replyRepo.createQueryBuilder("detailed-statistics").setFindOptions({
  //     where: [
  //       {
  //         ...filterQuery,
  //       },
  //     ]
  //   });

  //   const data = await qb.getOne();

  //   return { data: data as unknown as GetAllPostsDetailedStatisticsResponseResponse };
  // };

  // Decorate the fastify instance with the postService
  fastify.decorate("postStatisticsService", {
    getGeneralStatistics,
    // getDetailedStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    postStatisticsService: {
      getGeneralStatistics: (
        filter: GetAllPostsFilter | undefined,
      ) => Promise<{ data: GetGeneralStatisticsResponse }>;
      // getDetailedStatistics: (
      //   filter: GetAllPostsFilter | undefined,
      // ) => Promise<{ data: GetAllPostsDetailedStatisticsResponseResponse }>;
    };
  }
}
