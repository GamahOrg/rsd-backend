import { IError, TError } from "../../../helper/common";
import { RouteGenericInterface } from "fastify";

export type TResponse = unknown;

export type getVectorTileServerMapStyleSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getVectorTileServerMapStyleSchema = {
  tags: ["general"],
  deprecated: false,
  summary: "get vector tile server map style",
  description: "get vector tile server map style",
  response: {
    400: IError,
    404: IError,
    500: IError,
  },
};
