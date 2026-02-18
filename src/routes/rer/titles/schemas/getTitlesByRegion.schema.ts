import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IBody = Type.Object({
  filter: Type.Object({
    propertyType: Type.Optional(Type.String()),
    duration: Type.Object({
      from: Type.Object({ date: Type.String({ format: "date-time" }) }),
      to: Type.Object({ date: Type.String({ format: "date-time" }) }),
      type: Type.String(),
    }),
  }),
});
export type TBody = Static<typeof IBody>;

const IResponse = Type.Array(
  Type.Object({
    label: Type.String(),
    count: Type.Number(),
    // percentage: Type.Number(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getTitlesByRegionSchemaType = RouteGenericInterface & {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getTitlesByRegionSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get titles by region",
  description: "get titles by region",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
