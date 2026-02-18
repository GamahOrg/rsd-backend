import { IError, TError } from "../../../helper/common";
import { RouteGenericInterface } from "fastify";

export type TResponse = unknown;

export type getRootMapStyleSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getRootMapStyleSchema = {
  tags: ["general"],
  deprecated: false,
  summary: "get root map style",
  description: "get root map style",
  response: {
    400: IError,
    404: IError,
    500: IError,
  },
};
