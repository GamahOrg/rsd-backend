import { Static, Type } from "@sinclair/typebox";

export const IError = Type.Object({
  statusCode: Type.Number(),
  error: Type.String(),
  message: Type.String(),
});
export type TError = Static<typeof IError>;

export const IPagination = Type.Object({
  page: Type.Number({ default: 1 }),
  pageSize: Type.Number({ default: 10 }),
});
export type IPagination = Static<typeof IPagination>;

export const IDateTimeRange = Type.Object({
  from: Type.String({ format: "date-time" }),
  to: Type.String({ format: "date-time" }),
});

export const ISavedFilterType = Type.Union([
  Type.Literal("accounts"),
  Type.Literal("posts"),
  Type.Literal("statistics"),
]);
export type TSavedFilterType = Static<typeof ISavedFilterType>;
