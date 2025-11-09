import { Type, Static } from "@sinclair/typebox";
import { IError, TError, ISavedFilterType } from "../../../helper/common";
import { IFilter as IFilterType } from "../../../models/types/comment.type";

const IBody = Type.Object({
  id: Type.Optional(Type.Number()),
  name: Type.String(),
  type: ISavedFilterType,
  filter: IFilterType,
});

export type TBody = Static<typeof IBody>;

export type createOrUpdateFilterSchemaType = {
  Body: TBody;
  Error: TError;
};

export const createOrUpdateFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "create or update a filter",
  description: "create or update a filter",
  body: IBody,
  response: {
    200: IBody,
    400: IError,
    404: IError,
    500: IError,
  },
};
