import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { IFilter as IFilterType } from "../../../../models/types/comment.type";

const params = Type.Object({
  user_id: Type.String(),
});
export type TParams = Static<typeof params>;

const IBody = Type.Object({
  filter: IFilterType,
});
type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  positive_posts_count: Type.Number(),
  negative_posts_count: Type.Number(),
  neutral_posts_count: Type.Number(),
  undefined_posts_count: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getUserPostsStatisticsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Params: TParams;
  Error: TError;
  Body: TBody;
};

export const getUserPostsStatisticsSchema = {
  tags: ["user"],
  deprecated: false,
  summary: "get users posts statistics.",
  description: "get users posts statistics.",
  params: params,
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
