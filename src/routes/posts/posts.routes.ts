import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getPostsSchema, postsSchemaType } from "./schemas/getPosts.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import { getRepliesSchema, repliesSchemaType } from "./schemas/getReplies.schema";

const post: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all posts
  fastify.route<postsSchemaType>({
    method: "GET",
    url: "/",
    schema: getPostsSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { filter } = request.query;
      const { data, totalRecords } = await fastify.postService.getAllPosts(skip, take, filter);
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to get all the replies to a post
  fastify.route<repliesSchemaType>({
    method: "GET",
    url: "/:post_id/replies",
    schema: getRepliesSchema,
    handler: async (request, response) => {
      const { post_id } = request.params;
      const { skip, take } = request.pagination!;
      const { data, totalRecords } = await fastify.postService.getAllReplies(post_id, skip, take);
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });
};

export default post;
