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
  totalOwners: Type.Number(),
  totalRealEstates: Type.Number(),
  totalArea: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getOwnersStatisticsSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Response: TResponse;
  Error: TError;
};

export const getOwnersStatisticsSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get owners statistics data",
  description: "get owners statistics data",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
