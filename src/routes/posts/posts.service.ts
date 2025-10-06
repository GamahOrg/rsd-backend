import fp from "fastify-plugin";
import { TResponse as GetAllPostsResponse } from "./schemas/getPosts.schema";
import { TResponse as GetAllRepliesResponse } from "./schemas/getReplies.schema";
import { AppDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { In } from "typeorm";
import { Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";
import { TResponse as GetPostResponse } from "./schemas/getPost.schema";
import { TFilter as dataFilterType } from "../../models/types/comment.type";
export default fp(async (fastify) => {
  const getAllPosts = async (skip: number, take: number, filter: dataFilterType | undefined) => {
    // query
    const filterQuery = generateFilterQuery(filter as Filter);
    console.log(filterQuery);
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

  const getPost = async (post_id: string) => {
    const postRepo = AppDataSource.getRepository(Post);
    const data = await postRepo.findOne({
      where: { post_id },
      relations: { user: true, attachments: true },
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
