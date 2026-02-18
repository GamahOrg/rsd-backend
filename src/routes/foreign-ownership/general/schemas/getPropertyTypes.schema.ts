import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { DropdownList } from "../../../../models/types/general.type";

const IResponse = DropdownList;

export type TResponse = Static<typeof IResponse>;

export type getPropertyTypesSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getPropertyTypesSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get all property types",
  description: "get all property types",
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
