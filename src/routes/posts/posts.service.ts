import fp from "fastify-plugin";
import { TResponse as GetAllPostsResponse } from "./schemas/getPosts.schema";
import { TResponse as GetAllRepliesResponse } from "./schemas/getReplies.schema";
import { AppDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { In } from "typeorm";
import { BaseFilter, Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";
import { TResponse as GetPostResponse } from "./schemas/getPost.schema";
import { TFilter as dataFilterType } from "../../models/types/comment.type";
export default fp(async (fastify) => {
  const getAllPosts = async (skip: number, take: number, filter: dataFilterType | undefined) => {
    // query
    const whereClause = generateFilterQuery(
      filter as Filter,
      {
        post_type: In(["post", "quote", "replied_to"]),
      } as BaseFilter,
    );
    const postRepo = AppDataSource.getRepository(Post);
    // Build order object based on field type
    let orderBy: any = { posted_at: "asc" };
    if (filter?.orderBy) {
      const { field, direction } = filter.orderBy;
      // Check if it's a user field
      if (field === "followers_count") {
        orderBy = {
          user: {
            followers_count: direction || "desc",
          },
        };
      } else {
        // It's a post field
        orderBy = {
          [field]: direction || "desc",
        };
      }
    }

    const qb = postRepo.createQueryBuilder("post").setFindOptions({
      where: whereClause,
      relations: { user: true },
      skip,
      take,
      order: orderBy,
    });
    const [query, params] = qb.getQueryAndParameters();

    // interpolate for easier reading
    const finalQuery = params.reduce((q, p) => q.replace(/@\d+/, formatParam(p.value)), query);

    function formatParam(val: Date | string) {
      if (val instanceof Date) return `'${val.toISOString()}'`;
      if (typeof val === "string") return `${val}`;
      return val;
    }

    console.log(finalQuery);
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
      relations: { user: true },
      skip,
      take,
      order: { posted_at: "asc" },
    });

    const [data, totalRecords] = await qb.getManyAndCount();

    return { data: data as unknown as GetAllRepliesResponse, totalRecords };
  };

  const getPost = async (post_id: string) => {
    const postRepo = AppDataSource.getRepository(Post);
    const data = await postRepo.findOne({
      where: { post_id },
      relations: { user: true, country: true },
    });
    return { data: data as unknown as GetPostResponse };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("postService", {
    getAllPosts,
    getAllReplies,
    getPost,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    postService: {
      getAllPosts: (
        skip: number,
        take: number,
        filter: dataFilterType | undefined,
      ) => Promise<{ data: GetAllPostsResponse; totalRecords: number }>;
      getPost: (post_id: string) => Promise<{ data: GetPostResponse }>;
      getAllReplies: (
        post_id: string,
        skip: number,
        take: number,
      ) => Promise<{ data: GetAllRepliesResponse; totalRecords: number }>;
    };
  }
}
