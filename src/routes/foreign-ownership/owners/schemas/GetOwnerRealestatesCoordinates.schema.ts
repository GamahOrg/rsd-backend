import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IParams = Type.Object({
  ownerIDNumber: Type.String(),
});
export type TParams = Static<typeof IParams>;

const IResponse = Type.Object({
  Easting: Type.Array(Type.String()),
  Northing: Type.Array(Type.String()),
  UtmZone: Type.Array(Type.String()),
});

export type TResponse = Static<typeof IResponse>;

export type getOwnerRealestatesCoordinatesSchemaType = RouteGenericInterface & {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getOwnerRealestatesCoordinatesSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get owner realestates coordinates data",
  description: "get owner realestates coordinates data",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
