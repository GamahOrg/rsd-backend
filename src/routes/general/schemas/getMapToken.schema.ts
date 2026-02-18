import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Object({
  token: Type.String(),
  ttl: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getMapTokenSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getMapTokenSchema = {
  tags: ["general"],
  deprecated: false,
  summary: "get map token",
  description: "get map token",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
