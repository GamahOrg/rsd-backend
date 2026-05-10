import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";
import { RouteGenericInterface } from "fastify";

const Nullable = (schema: ReturnType<typeof Type.String>) => Type.Union([schema, Type.Null()]);

const IBody = Type.Object({
  id_type: Type.Union(
    [Type.Literal(1), Type.Literal(2), Type.Literal(3), Type.Literal(4), Type.Literal(5)],
    {
      description:
        "1 = National ID, 2 = Iqama, 3 = GCC Passport, 4 = GCC ID, 5 = GOV Company CR number",
    },
  ),
  id_value: Type.Integer({ description: "ID number" }),
});

export type TBody = Static<typeof IBody>;

const IOwner = Type.Object({
  id: Nullable(Type.String()),
  name: Nullable(Type.String()),
  nationality: Nullable(Type.String()),
  gender: Nullable(Type.String()),
  identity_type: Nullable(Type.String()),
  total_realestates_by_name: Type.Number(),
});

const IResponse = Type.Object({
  data: Type.Union([IOwner, Type.Null()]),
});

export type TResponse = Static<typeof IResponse>;

export type getOwnerInfoSchemaType = RouteGenericInterface & {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getOwnerInfoSchema = {
  tags: ["inquiry"],
  deprecated: false,
  summary: "Get owner info",
  description: "Get owner details with total active real estates and total owned area",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
