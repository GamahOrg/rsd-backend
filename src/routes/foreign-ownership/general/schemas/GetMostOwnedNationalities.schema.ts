import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const MostOwnedNationalityData = Type.Object({
  rank: Type.Number(),
  nationality: Type.String(),
  country_en: Type.String(),
  total_owners: Type.Number(),
  total_properties: Type.Number(),
  owners_percentage: Type.Optional(Type.Number()),
  top_city: Type.Optional(Type.String()),
});

export type MostOwnedNationalityData = Static<typeof MostOwnedNationalityData>;
const IResponse = Type.Object({
  data: Type.Array(MostOwnedNationalityData),
  totalRecords: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getMostOwnedNationalitiesSchemaType = RouteGenericInterface & {
  Querystring: Static<typeof IPagination>;
  Response: TResponse;
  Error: TError;
};

export const getMostOwnedNationalitiesSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get most owned nationalities",
  description: "get most owned nationalities with pagination (page, pageSize)",
  querystring: IPagination,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
