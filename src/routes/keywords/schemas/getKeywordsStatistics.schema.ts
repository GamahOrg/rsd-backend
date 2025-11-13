import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { IPagination } from "../../../helper/common";

const IOrderBy = Type.Object({
  field: Type.Union([
    Type.Literal("id"),
    Type.Literal("keyword"),
    Type.Literal("post_count"),
    Type.Literal("positive_post_count"),
    Type.Literal("negative_post_count"),
    Type.Literal("neutral_post_count"),
    Type.Literal("total_impression"),
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
