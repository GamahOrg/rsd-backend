import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Array(
  Type.Object({
    rank: Type.Number(),
    nationality: Type.String(),
    countryEn: Type.String(),
    total_owners: Type.Number(),
    total_properties: Type.Number(),
    ownersPct: Type.Optional(Type.Number()),
    topCity: Type.Optional(Type.String()),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getMostOwnedNationalitiesSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getMostOwnedNationalitiesSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get most owned nationalities",
  description: "get most owned nationalities",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
