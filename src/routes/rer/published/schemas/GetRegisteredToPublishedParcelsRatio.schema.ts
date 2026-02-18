import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

export const IFilter = Type.Object({
  filter: Type.Object({
    region: Type.Optional(Type.Array(Type.String())),
    city: Type.Optional(Type.Array(Type.String())),
    propertyType: Type.Optional(Type.String()),
  }),
});
export type TFilter = Static<typeof IFilter>;

const IResponse = Type.Array(
  Type.Object({
    Label: Type.String(),
    total_no_of_realestates: Type.Number(),
    no_of_announced_realestates: Type.Number(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getRegisteredToPublishedParcelsRatioSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Response: TResponse;
  Error: TError;
};

export const getRegisteredToPublishedParcelsRatioSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get registered to published parcels ratio",
  description: "get registered to published parcels ratio",
  body: IFilter,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
