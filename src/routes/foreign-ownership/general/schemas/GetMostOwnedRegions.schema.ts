import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const MostOwnedRegionData = Type.Object({
  rank: Type.Number(),
  region: Type.String(),
  total_owners: Type.Number(),
  total_properties: Type.Number(),
  top_nationality: Type.Optional(Type.String()),
  owners_percentage: Type.Optional(Type.Number()),
});

export type MostOwnedRegionData = Static<typeof MostOwnedRegionData>;
const IResponse = Type.Object({
  data: Type.Array(MostOwnedRegionData),
  totalRecords: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getMostOwnedRegionsSchemaType = RouteGenericInterface & {
  Querystring: Static<typeof IPagination>;
  Response: TResponse;
  Error: TError;
};

export const getMostOwnedRegionsSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get most owned regions",
  description: "get most owned regions with pagination (page, pageSize)",
  querystring: IPagination,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
