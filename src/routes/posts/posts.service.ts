import fp from "fastify-plugin";
import {
  TFilter as GetAllPostsFilter,
  TResponse as GetAllPostsResponse,
} from "./schemas/getPosts.schema";
import { AppDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { In } from "typeorm";

export default fp(async (fastify) => {
  const getAllPosts = async (skip: number, take: number, filter: GetAllPostsFilter | undefined) => {
    // query
    const postRepo = AppDataSource.getRepository(Post);

    const [data, totalRecords] = await postRepo.findAndCount({
      where: {
        post_type: In(["post", "quote", "replied_to"]),
      },
      relations: { user: true, attachments: true },
      skip,
      take: take,
      order: { posted_at: "DESC" },
    });
    return { data: data as unknown as GetAllPostsResponse, totalRecords };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("postService", {
    getAllPosts,
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
    };
  }
}
