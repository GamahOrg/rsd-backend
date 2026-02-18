import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IParams = Type.Object({
  ownerIDNumber: Type.String(),
});
export type TParams = Static<typeof IParams>;

const IResponse = Type.Array(
  Type.Object({
    id: Type.String(),
    OWNED_AREA: Type.Number(),
    TOTAL_AREA_SIZE: Type.Number(),
    OWNED_PERCENTAGE: Type.Number(),
    TypeCategoryAr: Type.String(),
    LAND_NO: Type.String(),
    PLAN_NO: Type.String(),
    City: Type.String(),
    NEIGHBORHOOD_NAME: Type.String(),
    Easting: Type.String(),
    Northing: Type.String(),
    UtmZone: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getOwnerRealestatesSchemaType = RouteGenericInterface & {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getOwnerRealestatesSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get owner realestates data",
  description: "get owner realestates data",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
