import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getPostsSchema, postsSchemaType } from "./schemas/getPosts.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import { getRepliesSchema, repliesSchemaType } from "./schemas/getReplies.schema";
import { getPostSchema, postSchemaType } from "./schemas/getPost.schema";

const post: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all posts
  fastify.route<postsSchemaType>({
    method: "POST",
    url: "/",
    schema: getPostsSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { filter } = request.body;
      const { data, totalRecords } = await fastify.postService.getAllPosts(skip, take, filter);
      data.forEach((post) => {
        post.attachments?.forEach(async (attachment) => {
          if (attachment.source === "minio") {
            attachment.url = await fastify.minioService.getFilePresignedUrl(attachment.url);
          }
        });
      });
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

  // api to get specific post
  fastify.route<postSchemaType>({
    method: "GET",
    url: "/:post_id",
    schema: getPostSchema,
    handler: async (request) => {
      const { post_id } = request.params;
      const { data } = await fastify.postService.getPost(post_id);
      if (data?.attachments) {
        for (const attachment of data.attachments) {
          if (attachment.source === "minio") {
            attachment.url = await fastify.minioService.getFilePresignedUrl(attachment.url);
          }
        }
      }
      return data;
    },
  });
};

export default post;
