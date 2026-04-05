import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Array(
  Type.Object({
    region_ar: Type.String(),
    total_no_of_realestates: Type.Number(),
    no_of_announced_realestates: Type.Number(),
    no_of_active_realestates: Type.Number(),
    no_of_expired_realestates: Type.Number(),
    no_of_registered_realestates: Type.Number(),
    no_of_to_be_announced_realestates: Type.Number(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getMapStatisticsByRegionsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getMapStatisticsByRegionsSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get map statistics by regions",
  description: "get map statistics by regions",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
