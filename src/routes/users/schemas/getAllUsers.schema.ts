import { Type, Static } from "@sinclair/typebox";
import { IError, IPagination, TError } from "../../../helper/common";

const IQuery = Type.Composite([
  Type.Object({
    search: Type.Optional(Type.String()),
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
    like_count: Type.Integer(),
    is_verified: Type.Boolean(),
    verified_type: Type.String(),
    user_created_at: Type.String({ format: "date-time" }),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getAllUsersSchemaType = {
  Querystring: TQuery;
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
