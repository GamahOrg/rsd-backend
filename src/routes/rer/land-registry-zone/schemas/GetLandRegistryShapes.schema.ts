import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Array(
  Type.Object({
    id: Type.String(),
    region: Type.String(),
    city: Type.Optional(Type.String()),
    district: Type.Optional(Type.String()),
    shape: Type.String(),
    announcing_date: Type.String(),
    register_start_date: Type.String(),
    register_end_date: Type.String(),
    land_registry_zone_status_ar: Type.String(),
    land_registry_zone_ar: Type.Optional(Type.String()),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getLandRegistryShapesSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getLandRegistryShapesSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get land registry shapes",
  description: "get land registry shapes",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
