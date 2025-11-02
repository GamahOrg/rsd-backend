import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";
import { IFilter as IFilterType } from "../../../models/types/comment.type";

const IParams = Type.Object({
  id: Type.Number(),
});
export type TParams = Static<typeof IParams>;

const IBody = Type.Object({
  name: Type.String(),
  type: Type.String(),
  filter: IFilterType,
});
export type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  type: Type.String(),
  filter: IFilterType,
  created_at: Type.String(),
  updated_at: Type.String(),
});

export type TResponse = Static<typeof IResponse>;

export type updateFilterSchemaType = {
  Params: TParams;
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const updateFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "update specific filter",
  description: "update specific filter",
  params: IParams,
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
