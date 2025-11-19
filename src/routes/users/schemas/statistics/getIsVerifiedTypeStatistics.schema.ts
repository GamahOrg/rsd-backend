import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Object({
  government: Type.Number(),
  blue: Type.Number(),
  business: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getVerifiedTypeStatisticsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getVerifiedTypeStatisticsSchema = {
  tags: ["user"],
  deprecated: false,
  summary: "get users verified type statistics.",
  description: "get users verified type statistics.",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
