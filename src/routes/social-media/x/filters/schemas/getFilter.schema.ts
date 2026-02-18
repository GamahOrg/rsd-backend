import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../../helper/common";
import { IFilter as IFilterType } from "../../../../../models/types/comment.type";

const IParams = Type.Object({
  id: Type.Number(),
});
export type TParams = Static<typeof IParams>;

const IVisibility = Type.Union([
  Type.Literal("private"),
  Type.Literal("public"),
  Type.Literal("shared"),
]);

const ISharedUser = Type.Object({
  id: Type.String(),
  fullName: Type.String(),
  nationalId: Type.String(),
});

const IResponse = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  type: Type.String(),
  filter: IFilterType,
  visibility: Type.Optional(IVisibility),
  created_by: Type.Optional(Type.String()),
  shared_with_user_ids: Type.Optional(Type.Array(Type.String())),
  shared_with_users: Type.Optional(Type.Array(ISharedUser)),
  is_own: Type.Boolean(),
  created_at: Type.String(),
  updated_at: Type.Optional(Type.String()),
});

export type TResponse = Static<typeof IResponse>;

export type getFilterSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "get specific filter",
  description: "get specific filter with visibility and sharing information",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
