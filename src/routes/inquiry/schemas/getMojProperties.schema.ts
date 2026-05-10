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

const IMojProperty = Type.Object({
  deed_number: Nullable(Type.String()),
  deed_date: Nullable(Type.String()),
  status: Nullable(Type.String()),
  city: Nullable(Type.String()),
  district: Nullable(Type.String()),
  area: Nullable(Type.String()),
  owning_percentage: Nullable(Type.String()),
  parcel_number: Nullable(Type.String()),
  plan_number: Nullable(Type.String()),
  block_number: Nullable(Type.String()),
  realestate_number: Nullable(Type.String()),
  case_number: Nullable(Type.String()),
});

const IResponse = Type.Object({
  data: Type.Array(IMojProperty),
});

export type TResponse = Static<typeof IResponse>;

export type getMojPropertiesSchemaType = RouteGenericInterface & {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getMojPropertiesSchema = {
  tags: ["inquiry"],
  deprecated: false,
  summary: "Get MOJ deeds by owner",
  description: "Query MOJ deeds by owner ID",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
