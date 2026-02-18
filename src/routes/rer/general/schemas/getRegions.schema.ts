import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IResponse = Type.Array(
  Type.Object({
    value: Type.String(),
    label: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getRegionsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getRegionsSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get all regions",
  description: "get all regions",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
