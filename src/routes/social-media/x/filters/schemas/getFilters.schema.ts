import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination, ISavedFilterType } from "../../../../../helper/common";

const IQuery = Type.Composite([
  Type.Object({
    type: Type.Optional(ISavedFilterType),
    search: Type.Optional(Type.String()),
  }),
  IPagination,
]);
export type TQuery = Static<typeof IQuery>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.Number(),
    name: Type.String(),
    type: ISavedFilterType,
    created_at: Type.String(),
    updated_at: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type filtersSchemaType = {
  Querystring: TQuery;
  Response: TResponse;
  Error: TError;
};

export const getFiltersSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "get all filters",
  description: "get all filters",
  querystring: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
