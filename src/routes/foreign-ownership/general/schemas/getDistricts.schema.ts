import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { DropdownList } from "../../../../models/types/general.type";

const params = Type.Object({
  city: Type.String(),
});

const IResponse = DropdownList;

export type TResponse = Static<typeof IResponse>;

export type getDistrictsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getDistrictsSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get all districts",
  description: "get all districts",
  params: params,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
