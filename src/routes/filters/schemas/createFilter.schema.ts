import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";
import { IFilter as IFilterType } from "../../../models/types/comment.type";

const IBody = Type.Object({
  name: Type.String(),
  type: Type.String(),
  filter: IFilterType,
});

export type TBody = Static<typeof IBody>;

export type createFilterSchemaType = {
  Body: TBody;
  Error: TError;
};

export const createFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "create a filter",
  description: "create a filter",
  body: IBody,
  response: {
    200: IBody,
    400: IError,
    404: IError,
    500: IError,
  },
};
