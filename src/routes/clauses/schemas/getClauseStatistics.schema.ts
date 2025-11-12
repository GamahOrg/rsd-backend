import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";

const IParams = Type.Object({
  id: Type.Number(),
});
export type TParams = Static<typeof IParams>;

const IResponse = Type.Object({
  total_impressions: Type.Number(),
  total_posts: Type.Number(),
  positive_posts: Type.Number(),
  negative_posts: Type.Number(),
  neutral_posts: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getClauseStatisticsSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getClauseStatisticsSchema = {
  tags: ["clause"],
  deprecated: false,
  summary: "get specific clause statistics",
  description: "get specific clause statistics",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
