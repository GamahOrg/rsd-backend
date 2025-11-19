import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Object({
  verified: Type.Number(),
  unverified: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getIsVerifiedStatisticsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getIsVerifiedStatisticsSchema = {
  tags: ["user"],
  deprecated: false,
  summary: "get users is verified statistics.",
  description: "get users is verified statistics.",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
