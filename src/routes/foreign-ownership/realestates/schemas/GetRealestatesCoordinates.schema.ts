import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

// extend IFilter to include nationality
const IFilter = Type.Object({
  filter: Type.Object({
    region: Type.Optional(Type.Array(Type.String())),
    city: Type.Optional(Type.Array(Type.String())),
    nationality: Type.Optional(Type.Array(Type.String())),
    identityType: Type.Optional(Type.Array(Type.String())),
  }),
});
export type TFilter = Static<typeof IFilter>;

const IResponse = Type.Object({
  Easting: Type.Array(Type.String()),
  Northing: Type.Array(Type.String()),
  UtmZone: Type.Array(Type.String()),
});

export type TResponse = Static<typeof IResponse>;

export type getRealestatesCoordinatesSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
  Body: TFilter;
};

export const getRealestatesCoordinatesSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get realestates coordinates data",
  description: "get realestates coordinates data",
  body: IFilter,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
