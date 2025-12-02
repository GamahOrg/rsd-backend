import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";

const IBody = Type.Object({
  id: Type.Optional(Type.Number()),
  name: Type.String(),
  include_clause: Type.String(),
  exclude_clause: Type.String(),
  include_accounts_clause: Type.Optional(Type.String()),
  exclude_accounts_clause: Type.Optional(Type.String()),
  include_to_accounts_clause: Type.Optional(Type.String()),
  exclude_to_accounts_clause: Type.Optional(Type.String()),
  operator: Type.String({ enum: ["AND", "OR"], default: "AND" }),
});

export type TBody = Static<typeof IBody>;

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

export type createOrUpdateSchemaType = {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const createOrUpdateSchema = {
  tags: ["clause"],
  deprecated: false,
  summary: "create or update a clause",
  description: "create or update a clause",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
