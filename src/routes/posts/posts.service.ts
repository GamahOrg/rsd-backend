import fp from "fastify-plugin";
import { TResponse as GetAllPostsResponse } from "./schemas/getPosts.schema";
import { TResponse as GetAllRepliesResponse } from "./schemas/getReplies.schema";
import { XDataSource } from "../../config/database";
import { Post } from "../../database/entity/Post.entity";
import { In, Not, IsNull, And } from "typeorm";
import { BaseFilter, Filter, generateFilterQuery } from "../../helper/filterQueryGenerator";
import { TResponse as GetPostResponse } from "./schemas/getPost.schema";
import { TFilter as dataFilterType } from "../../models/types/comment.type";
export default fp(async (fastify) => {
  const getAllPosts = async (filter: dataFilterType | undefined, skip: number, take: number) => {
    // query
    const whereClause = await generateFilterQuery(
      filter as Filter,
      {
        text: And(Not(IsNull()), Not("")),
      } as BaseFilter,
      fastify,
    );
    const postRepo = XDataSource.getRepository(Post);
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
      relations: { user: true, referenced_post: { user: true } },
      skip,
      take,
      order: orderBy,
    });
    const [data, totalRecords] = await qb.getManyAndCount();

    return { data: data as unknown as GetAllPostsResponse, totalRecords };
  };

  const getAllReplies = async (post_id: string, skip: number, take: number) => {
    const replyRepo = XDataSource.getRepository(Post);
    // get conversation_id from post_id
    const conversation = await replyRepo.findOne({
      select: {
        conversation_id: true,
      },
      where: {
        post_id,
      },
    });
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const qb = replyRepo.createQueryBuilder("reply").setFindOptions({
      where: [
        {
          post_type: "replied_to",
          conversation_id: conversation.conversation_id,
          referenced_tweet_id: post_id,
          text: And(Not(IsNull()), Not("")),
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
    const postRepo = XDataSource.getRepository(Post);
    const data = await postRepo.findOne({
      where: {
        post_id,
        text: And(Not(IsNull()), Not("")),
      },
      relations: { user: true, country: true, referenced_post: { user: true } },
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
        filter: dataFilterType | undefined,
        skip: number,
        take: number,
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
