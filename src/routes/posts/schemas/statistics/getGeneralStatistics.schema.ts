import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IDateTimeRange } from "../../../../helper/common";

export const IFilter = Type.Object({
  posted_at: Type.Optional(IDateTimeRange),
  post_type: Type.Optional(Type.Array(Type.String())),
  sentiment: Type.Optional(Type.Array(Type.String())),
  keywords: Type.Optional(Type.Array(Type.String())),
  username: Type.Optional(Type.Array(Type.String())),
  followers_count: Type.Optional(
    Type.Object({
      min: Type.Optional(Type.Number()),
      max: Type.Optional(Type.Number()),
    }),
  ),
  like_count: Type.Optional(
    Type.Object({
      min: Type.Optional(Type.Number()),
      max: Type.Optional(Type.Number()),
    }),
  ),
  retweet_count: Type.Optional(
    Type.Object({
      min: Type.Optional(Type.Number()),
      max: Type.Optional(Type.Number()),
    }),
  ),
  reply_count: Type.Optional(
    Type.Object({
      min: Type.Optional(Type.Number()),
      max: Type.Optional(Type.Number()),
    }),
  ),
  bookmark_count: Type.Optional(
    Type.Object({
      min: Type.Optional(Type.Number()),
      max: Type.Optional(Type.Number()),
    }),
  ),
  impression_count: Type.Optional(
    Type.Object({
      min: Type.Optional(Type.Number()),
      max: Type.Optional(Type.Number()),
    }),
  ),
  country: Type.Optional(Type.Array(Type.String())),
  is_verified: Type.Optional(Type.Boolean()),
  verified_type: Type.Optional(Type.Array(Type.String())),
  orderBy: Type.Optional(
    Type.Object({
      field: Type.String({ default: "posted_at" }),
      direction: Type.String({ enum: ["asc", "desc"], default: "desc" }),
    }),
  ),
});
export type TFilter = Static<typeof IFilter>;

const IBody = Type.Object({
  filter: Type.Optional(IFilter),
});
type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  general: Type.Integer(),
  quote: Type.Integer(),
  replies: Type.Integer(),
  posts: Type.Integer(),
});

export type TResponse = Static<typeof IResponse>;

export type getGeneralStatisticsSchemaType = {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getGeneralStatisticsSchema = {
  tags: ["post", "statistics"],
  deprecated: false,
  summary: "get general statistics",
  description: "get general statistics",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
