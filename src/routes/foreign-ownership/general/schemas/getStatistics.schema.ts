import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Object({
  total_realestate: Type.Number(),
  total_owners: Type.Number(),
  total_area: Type.Number(),
  total_owners_r_iqama: Type.Number(),
  total_owners_p_iqama: Type.Number(),
  total_owners_gcc_id: Type.Number(),
  total_owners_gcc_passport: Type.Number(),
  top_property_type: Type.String(),
  top_city: Type.String(),
  top_nationality: Type.String(),
  owned_percentage: Type.Number(),
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
