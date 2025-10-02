import fp from "fastify-plugin";
import {
  TFilter as GetAllPostsFilter,
  TResponse as GetAllPostsResponse,
} from "./schemas/getPosts.schema";
import { TResponse as GetAllRepliesResponse } from "./schemas/getReplies.schema";
import { AppDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { In } from "typeorm";
import { Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";

export default fp(async (fastify) => {
  const getAllPosts = async (skip: number, take: number, filter: GetAllPostsFilter | undefined) => {
    // query
    const filterQuery = generateFilterQuery(filter as Filter);
    // console.log(filterQuery);
    const postRepo = AppDataSource.getRepository(Post);
    const qb = postRepo.createQueryBuilder("post").setFindOptions({
      where: [
        {
          post_type: In(["post", "quote", "replied_to"]),
          ...filterQuery,
        },
      ],
      relations: { user: true, attachments: true },
      skip,
      take,
      order: { posted_at: "asc" },
    });

    // Log raw SQL and parameters
    // const rawSql = qb.getSql();
    // const rawParams = qb.getParameters();
    // console.log("Raw SQL:", rawSql);
    // console.log("SQL Params:", rawParams);

    const [data, totalRecords] = await qb.getManyAndCount();

    return { data: data as unknown as GetAllPostsResponse, totalRecords };
  };

  const getAllReplies = async (post_id: string, skip: number, take: number) => {
    const replyRepo = AppDataSource.getRepository(Post);

    const qb = replyRepo.createQueryBuilder("reply").setFindOptions({
      where: [
        {
          post_type: "replied_to",
          conversation_id: post_id,
        },
      ],
      relations: { user: true, attachments: true },
      skip,
      take,
      order: { posted_at: "asc" },
    });

    const [data, totalRecords] = await qb.getManyAndCount();

    return { data: data as unknown as GetAllRepliesResponse, totalRecords };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("postService", {
    getAllPosts,
    getAllReplies,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    postService: {
      getAllPosts: (
        skip: number,
        take: number,
        filter: GetAllPostsFilter | undefined,
      ) => Promise<{ data: GetAllPostsResponse; totalRecords: number }>;
      getAllReplies: (
        post_id: string,
        skip: number,
        take: number,
      ) => Promise<{ data: GetAllRepliesResponse; totalRecords: number }>;
    };
  }
}
