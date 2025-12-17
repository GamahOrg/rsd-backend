import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";

const IResponse = Type.Object({
  total_keywords: Type.Integer(),
  total_posts: Type.Integer(),
  positive_posts: Type.Integer(),
  negative_posts: Type.Integer(),
  neutral_posts: Type.Integer(),
});

export type TResponse = Static<typeof IResponse>;

export type getPostStatisticsSchemaType = {
  Response: TResponse;
  Error: TError;
};

export const getPostStatisticsSchema = {
  tags: ["statistics"],
  deprecated: false,
  summary: "get post general statistics summary",
  description: "get post general statistics summary",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
