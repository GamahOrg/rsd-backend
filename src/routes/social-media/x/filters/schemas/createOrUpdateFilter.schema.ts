import { Type, Static } from "@sinclair/typebox";
import { IError, TError, ISavedFilterType } from "../../../../../helper/common";
import { IFilter as IFilterType } from "../../../../../models/types/comment.type";

const IVisibility = Type.Union([
  Type.Literal("private"),
  Type.Literal("public"),
  Type.Literal("shared"),
]);

const IBody = Type.Object({
  id: Type.Optional(Type.Number()),
  name: Type.String(),
  type: ISavedFilterType,
  filter: IFilterType,
  visibility: Type.Optional(IVisibility),
  shared_with_user_ids: Type.Optional(Type.Array(Type.String())),
});

export type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  type: Type.String(),
  filter: IFilterType,
  visibility: Type.Optional(IVisibility),
  created_by: Type.Optional(Type.String()),
  shared_with_user_ids: Type.Optional(Type.Array(Type.String())),
  created_at: Type.Optional(Type.String()),
  updated_at: Type.Optional(Type.String()),
});

export type TResponse = Static<typeof IResponse>;

export type createOrUpdateFilterSchemaType = {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const createOrUpdateFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "create or update a filter",
  description: "create or update a filter with optional visibility and sharing settings",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
