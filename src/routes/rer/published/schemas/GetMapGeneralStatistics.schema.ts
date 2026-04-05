import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

export const IFilter = Type.Object({
  filter: Type.Object({
    region: Type.Optional(Type.Array(Type.String())),
    // city: Type.Optional(Type.Array(Type.String())),
  }),
});
export type TFilter = Static<typeof IFilter>;

const IResponse = Type.Object({
  no_of_announced_active: Type.Number(),
  no_of_announced_expired: Type.Number(),
  no_of_announced: Type.Number(),
  no_of_registered_realestates: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getMapGeneralStatisticsSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Response: TResponse;
  Error: TError;
};

export const getMapGeneralStatisticsSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get map general statistics",
  description: "get map general statistics",
  body: IFilter,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
