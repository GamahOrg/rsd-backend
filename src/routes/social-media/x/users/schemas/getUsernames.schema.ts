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

export type getUsernamesListSchemaType = {
  Querystring: TQuery;
  Response: TResponse;
  Error: TError;
};

export const getUsernamesListSchema = {
  tags: ["user"],
  deprecated: false,
  summary: "get usernames",
  description: "get usernames",
  querystring: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
