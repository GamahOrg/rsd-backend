import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../../../helper/common";

const IQuery = Type.Composite([
  Type.Object({
    search: Type.String(),
  }),
  IPagination,
]);
type TQuery = Static<typeof IQuery>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.String(),
    value: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getKeywordsListSchemaType = {
  Querystring: TQuery;
  Response: TResponse;
  Error: TError;
};

export const getKeywordsListSchema = {
  tags: ["keyword"],
  deprecated: false,
  summary: "get keywords",
  description: "get keywords",
  querystring: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
