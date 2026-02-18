import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IQuerystring = Type.Object({
  region: Type.Optional(Type.String()),
});

const IResponse = Type.Array(
  Type.Object({
    value: Type.String(),
    label: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;
export type TQuerystring = Static<typeof IQuerystring>;

export type getCitiesSchemaType = RouteGenericInterface & {
  Querystring: TQuerystring;
  Response: TResponse;
  Error: TError;
};

export const getCitiesSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get all cities",
  description: "get all cities, optionally filtered by region",
  querystring: IQuerystring,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
