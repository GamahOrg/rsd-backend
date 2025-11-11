import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../helper/common";

const IQuery = Type.Composite([
  Type.Object({
    search: Type.Optional(Type.String()),
  }),
  IPagination,
]);
export type TQuery = Static<typeof IQuery>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.Number(),
    name: Type.String(),
    created_at: Type.String(),
    updated_at: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getClausesDropdownSchemaType = {
  Querystring: TQuery;
  Response: TResponse;
  Error: TError;
};

export const getClausesDropdownSchema = {
  tags: ["dropdown"],
  deprecated: false,
  summary: "get all clauses for dropdown",
  description: "get all clauses for dropdown",
  querystring: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
