import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
// import { IFilter as IFilterType } from "../../../../models/types/social-media/x/comment.type";

const IBody = Type.Object({
  filter: Type.Object({
    status: Type.Optional(Type.String({ enum: ["Approved", "Rejected", "New"] })),
    city: Type.Array(Type.String()),
    district: Type.Optional(Type.String()),
    duration: Type.Object({
      from: Type.Object({ date: Type.String({ format: "date-time" }) }),
      to: Type.Object({ date: Type.String({ format: "date-time" }) }),
      type: Type.String({ enum: ["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"] }),
    }),
  }),
});
export type TBody = Static<typeof IBody>;

const IResponse = Type.Array(
  Type.Object({
    total_pending: Type.Number(),
    total_rejected: Type.Number(),
    total_approved: Type.Number(),
    CityName: Type.String(),
    YearNumber: Type.Number(),
    QuarterNumber: Type.Optional(Type.Number()),
    WeekOfYearNumber: Type.Optional(Type.Number()),
    MonthNumber: Type.Optional(Type.Number()),
    DayNumber: Type.Optional(Type.Number()),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getRequestChartSchemaType = RouteGenericInterface & {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getRequestChartSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get request chart",
  description: "get request chart",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
