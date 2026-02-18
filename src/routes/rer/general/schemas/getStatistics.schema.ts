import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Object({
  total_announced_regions: Type.Number(),
  total_active_announced_regions: Type.Number(),
  total_expired_regions: Type.Number(),
  total_upcoming_regions: Type.Number(),
  total_registered_real_estates: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type statisticsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getStatisticsSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get all statistics",
  description: "get all statistics",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
