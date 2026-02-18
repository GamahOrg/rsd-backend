import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IBody = Type.Object({
  bounds: Type.Object({
    minLng: Type.Number(),
    minLat: Type.Number(),
    maxLng: Type.Number(),
    maxLat: Type.Number(),
  }),
});

export type TBody = Static<typeof IBody>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.String(),
    region: Type.String(),
    city: Type.String(),
    district: Type.String(),
    shape: Type.String(),
    published_date: Type.String(),
    property_type: Type.String(),
    parcel_number: Type.String(),
    block_number: Type.String(),
    plan_number: Type.String(),
    area_size: Type.Number(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getLandParcelsShapesSchemaType = RouteGenericInterface & {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getLandParcelsShapesSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get land parcels shapes by viewport",
  description: "get land parcels shapes filtered by viewport bounds",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
