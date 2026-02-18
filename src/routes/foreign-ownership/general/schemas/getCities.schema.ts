import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { DropdownList } from "../../../../models/types/general.type";

const IQuerystring = Type.Object({
  region: Type.Optional(Type.String()),
});

const IResponse = DropdownList;

export type TResponse = Static<typeof IResponse>;
export type TQuerystring = Static<typeof IQuerystring>;

export type getCitiesSchemaType = RouteGenericInterface & {
  Querystring: TQuerystring;
  Response: TResponse;
  Error: TError;
};

export const getCitiesSchema = {
  tags: ["foreign-ownership"],
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
