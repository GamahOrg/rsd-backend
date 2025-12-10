import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../../../helper/common";

const IResponse = Type.Array(
  Type.Object({
    id: Type.Number(),
    name: Type.String(),
    include_clause_words_count: Type.Number(),
    exclude_clause_words_count: Type.Number(),
    include_accounts_clause_accounts_count: Type.Optional(Type.Number()),
    exclude_accounts_clause_accounts_count: Type.Optional(Type.Number()),
    include_to_accounts_clause_accounts_count: Type.Optional(Type.Number()),
    exclude_to_accounts_clause_accounts_count: Type.Optional(Type.Number()),
    created_at: Type.String(),
    updated_at: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type clausesSchemaType = {
  Querystring: IPagination;
  Response: TResponse;
  Error: TError;
};

export const getClausesSchema = {
  tags: ["clause"],
  deprecated: false,
  summary: "get all clauses",
  description: "get all clauses",
  querystring: IPagination,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
