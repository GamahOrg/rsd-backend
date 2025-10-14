import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../helper/common";

const IParams = Type.Object({
  post_id: Type.String(),
});
type TParams = Static<typeof IParams>;

const IQuerystring = IPagination;
type TQuerystring = Static<typeof IQuerystring>;

const IResponse = Type.Array(
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
        user_id: Type.String(),
        profile_image_url: Type.String(),
        name: Type.String(),
        username: Type.String(),
        verified_type: Type.Optional(Type.String()),
        followers_count: Type.Integer(),
      }),
    ),
    posted_at: Type.String({ format: "date-time" }),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type repliesSchemaType = {
  Querystring: TQuerystring;
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getRepliesSchema = {
  tags: ["reply"],
  deprecated: false,
  summary: "get all replies",
  description: "get all replies",
  querystring: IQuerystring,
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
