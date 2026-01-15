import { Type, Static } from "@sinclair/typebox";
import { IError, IPagination, TError } from "../../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IOrderBy = Type.Object({
  field: Type.Union([
    Type.Literal("user_created_at"),
    Type.Literal("followers_count"),
    Type.Literal("following_count"),
    Type.Literal("tweet_count"),
    Type.Literal("total_post_inc_keyword"),
    Type.Literal("like_count"),
  ]),
  direction: Type.Union([Type.Literal("asc"), Type.Literal("desc")], { default: "asc" }),
});

const IQuery = Type.Composite([
  Type.Object({
    search: Type.Optional(Type.String()),
    order_by: Type.Optional(IOrderBy),
  }),
  IPagination,
]);
type TQuery = Static<typeof IQuery>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.String(),
    user_id: Type.String(),
    username: Type.String(),
    name: Type.String(),
    profile_image_url: Type.String(),
    followers_count: Type.Integer(),
    following_count: Type.Integer(),
    tweet_count: Type.Integer(),
    total_post_inc_keyword: Type.Integer(),
    like_count: Type.Integer(),
    is_verified: Type.Boolean(),
    verified_type: Type.String(),
    user_created_at: Type.String({ format: "date-time" }),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getAllUsersSchemaType = RouteGenericInterface & {
  Query: TQuery;
  Response: TResponse;
  Error: TError;
};

export const getAllUsersSchema = {
  tags: ["user"],
  deprecated: false,
  summary: "get all users",
  description: "get all users",
  query: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
