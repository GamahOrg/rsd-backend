import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { IFilter, TFilter } from "../../../../models/types/rer/filter.type";

const IResponse = Type.Array(
  Type.Object({
    Count: Type.Number(),
    Label: Type.String(), // it can be RegionName, CityName, DistrictName
    Region: Type.Optional(Type.String()),
    City: Type.Optional(Type.String()),
    District: Type.Optional(Type.String()),
    YearNumber: Type.Number(),
    QuarterNumber: Type.Optional(Type.Number()),
    WeekOfYearNumber: Type.Optional(Type.Number()),
    MonthNumber: Type.Optional(Type.Number()),
    DayNumber: Type.Optional(Type.Number()),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getRealEstateCountSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Response: TResponse;
  Error: TError;
};

export const getRealEstateCountSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get real estate count",
  description: "get real estate count",
  body: IFilter,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
