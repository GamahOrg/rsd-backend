import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IDateTimeRange, IPagination } from "../../../helper/common";


export const IFilter = Type.Object({
  postedAt: Type.Optional(IDateTimeRange),
  orderBy: Type.Optional(
    Type.Object({
      field: Type.String({ default: "posted_at" }),
      direction: Type.String({ enum: ["asc", "desc"], default: "desc" }),
    }),
  ),
});
export type TFilter = Static<typeof IFilter>;

const IQuerystring = Type.Composite([
  Type.Object({
    filter: Type.Optional(IFilter),
  }),
  IPagination,
]);
type TQuerystring = Static<typeof IQuerystring>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.String(),
    post_id: Type.String(),
    text: Type.String(),
    sentiment: Type.String(),
    like_count: Type.Integer(),
    retweet_count: Type.Integer(),
    reply_count: Type.Integer(),
    bookmark_count: Type.Integer(),
    impression_count: Type.Integer(),
    post_type: Type.String(),
    user: Type.Optional(Type.Object({
      id: Type.String(),
      profile_image_url: Type.String(),
      name: Type.String(),
      username: Type.String(),
      verified_type: Type.Optional(Type.String()),
      followers_count: Type.Integer(),
    })),
    attachments: Type.Optional(Type.Array(Type.Object({
      id: Type.String(),
      source: Type.String(),
      url: Type.String(),
    }))),
    posted_at: Type.String({ format: 'date-time' }),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type postsSchemaType = {
  Querystring: TQuerystring;
  Response: TResponse;
  Error: TError;
};

export const getPostsSchema = {
  tags: ["post"],
  deprecated: false,
  summary: "get all posts",
  description: "get all posts",
  querystring: IQuerystring,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};