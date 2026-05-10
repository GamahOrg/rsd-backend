import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Object({
  total_realestate: Type.Optional(Type.Number()),
  total_owners: Type.Optional(Type.Number()),
  total_area: Type.Optional(Type.Number()),
  total_owners_p_iqama: Type.Optional(Type.Number()),
  top_property_type: Type.Optional(Type.String()),
  top_city: Type.Optional(Type.String()),
  top_district: Type.Optional(Type.String()),
  top_nationality: Type.Optional(Type.String()),
});

export type TResponse = Static<typeof IResponse>;

export type statisticsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getStatisticsSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get all statistics",
  description: "get all statistics",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
