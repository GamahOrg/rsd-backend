import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { IPagination } from "../../../helper/common";

const IQuery = Type.Composite([
  Type.Object({
    search: Type.Optional(Type.String()),
  }),
  IPagination,
]);
type TQuery = Static<typeof IQuery>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.Integer(),
    keyword: Type.String(),
    post_count: Type.Integer(),
    positive_post_count: Type.Integer(),
    negative_post_count: Type.Integer(),
    neutral_post_count: Type.Integer(),
    total_impression: Type.Integer(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getKeywordsStatisticsSchemaType = RouteGenericInterface & {
  Query: TQuery;
  Response: TResponse;
  Error: TError;
};

export const getKeywordsStatisticsSchema = {
  tags: ["keyword"],
  deprecated: false,
  summary: "get keywords statistics",
  description: "get keywords statistics",
  query: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
