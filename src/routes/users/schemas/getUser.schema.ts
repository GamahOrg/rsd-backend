import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";

const IParams = Type.Object({
  user_id: Type.String(),
});
type TParams = Static<typeof IParams>;

const IResponse = Type.Object({
  id: Type.String(),
  user_id: Type.String(),
  username: Type.String(),
  name: Type.String(),
  description: Type.String(),
  profile_image_url: Type.String(),
  followers_count: Type.Integer(),
  following_count: Type.Integer(),
  tweet_count: Type.Integer(),
  listed_count: Type.Integer(),
  like_count: Type.Integer(),
  media_count: Type.Integer(),
  is_verified: Type.Boolean(),
  verified_type: Type.String(),
  pinned_tweet_id: Type.String(),
  user_created_at: Type.String({ format: "date-time" }),
});

export type TResponse = Static<typeof IResponse>;

export type userSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getUserSchema = {
  tags: ["user", "info"],
  deprecated: false,
  summary: "get user info by user id",
  description: "get user info by user id",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
