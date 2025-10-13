import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../helper/common";
import { IFilter as IFilterType } from "../../../models/types/comment.type";

const IBody = Type.Object({
  filter: Type.Optional(IFilterType),
});
type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  data: Type.Array(
    Type.Object({
      id: Type.String(),
      conversation_id: Type.String(),
      post_id: Type.String(),
      text: Type.String(),
      sentiment: Type.String(),
      like_count: Type.Integer(),
      retweet_count: Type.Integer(),
      reply_count: Type.Integer(),
      bookmark_count: Type.Integer(),
      impression_count: Type.Integer(),
      post_type: Type.String(),
      user: Type.Optional(
        Type.Object({
          id: Type.String(),
          profile_image_url: Type.String(),
          name: Type.String(),
          username: Type.String(),
          verified_type: Type.Optional(Type.String()),
          followers_count: Type.Integer(),
        }),
      ),
      posted_at: Type.String({ format: "date-time" }),
    }),
  ),
  totalRecords: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type postsSchemaType = {
  Querystring: IPagination;
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getPostsSchema = {
  tags: ["post"],
  deprecated: false,
  summary: "get all posts",
  description: "get all posts",
  querystring: IPagination,
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
