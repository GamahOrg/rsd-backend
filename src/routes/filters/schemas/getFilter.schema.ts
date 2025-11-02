import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";
import { IFilter as IFilterType } from "../../../models/types/comment.type";

const IQuery = Type.Object({
  id: Type.Number(),
});
export type TQuery = Static<typeof IQuery>;

const IResponse = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  type: Type.String(),
  filter: IFilterType,
  created_at: Type.String(),
  updated_at: Type.String(),
});

export type TResponse = Static<typeof IResponse>;

export type getFilterSchemaType = {
  Querystring: TQuery;
  Response: TResponse;
  Error: TError;
};

export const getFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "get specific filter",
  description: "get specific filter",
  querystring: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
