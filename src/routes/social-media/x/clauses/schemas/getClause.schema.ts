import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../../helper/common";

const IParams = Type.Object({
  id: Type.Number(),
});
export type TParams = Static<typeof IParams>;

const IResponse = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  include_clause: Type.String(),
  exclude_clause: Type.String(),
  include_accounts_clause: Type.Optional(Type.String()),
  exclude_accounts_clause: Type.Optional(Type.String()),
  include_to_accounts_clause: Type.Optional(Type.String()),
  exclude_to_accounts_clause: Type.Optional(Type.String()),
  operator: Type.String({ enum: ["AND", "OR"], default: "AND" }),
  created_at: Type.Optional(Type.String()),
  updated_at: Type.Optional(Type.String()),
});

export type TResponse = Static<typeof IResponse>;

export type getClauseSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getClauseSchema = {
  tags: ["clause"],
  deprecated: false,
  summary: "get specific clause",
  description: "get specific clause",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
