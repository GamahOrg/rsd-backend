import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const params = Type.Object({
  city: Type.String(),
});

const IResponse = Type.Array(
  Type.Object({
    value: Type.String(),
    label: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getDistrictsSchemaType = RouteGenericInterface & {
  Response: TResponse;
  Error: TError;
};

export const getDistrictsSchema = {
  tags: ["rer"],
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
