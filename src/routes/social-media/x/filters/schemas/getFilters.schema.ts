import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination, ISavedFilterType } from "../../../../../helper/common";

const IVisibility = Type.Union([
  Type.Literal("private"),
  Type.Literal("public"),
  Type.Literal("shared"),
]);

const IQuery = Type.Composite([
  Type.Object({
    type: Type.Optional(ISavedFilterType),
    search: Type.Optional(Type.String()),
    is_own: Type.Optional(Type.Boolean()), // true = my filters only, false = shared with me only
  }),
  IPagination,
]);
export type TQuery = Static<typeof IQuery>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.Number(),
    name: Type.String(),
    type: ISavedFilterType,
    visibility: Type.Optional(IVisibility),
    is_own: Type.Boolean(), // true = my filter, false = shared with me
    // Common field - always returned
    updated_at: Type.Optional(Type.String()),
    // Only for own filters (is_own = true)
    created_at: Type.Optional(Type.String()),
    // Only for shared filters (is_own = false)
    created_by_name: Type.Optional(Type.String()),
    shared_at: Type.Optional(Type.String()),
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
  description: "get all filters accessible by the current user based on visibility settings",
  querystring: IQuery,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
