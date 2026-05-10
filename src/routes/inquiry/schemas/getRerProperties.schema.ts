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
  id_value: Type.Integer({
    description: "ID number",
  }),
  page: Type.Integer({ minimum: 1, default: 1, description: "Page number (1-based)" }),
  page_size: Type.Integer({ minimum: 1, maximum: 100, default: 10, description: "Items per page" }),
});

export type TBody = Static<typeof IBody>;

const IOwner = Type.Object({
  id: Nullable(Type.String()),
  name: Nullable(Type.String()),
  nationality: Nullable(Type.String()),
  gender: Nullable(Type.String()),
  identity_type: Nullable(Type.String()),
});

const ITransferInfo = Type.Object({
  case_number: Nullable(Type.String()),
  case_status: Nullable(Type.String()),
  case_date: Nullable(Type.String()),
  transfer_type: Nullable(Type.String()),
  is_new_owner: Nullable(Type.String()),
  owner_name: Nullable(Type.String()),
  owner_type: Nullable(Type.String()),
  owner_id_number: Nullable(Type.String()),
  owner_share: Nullable(Type.String()),
});

const IRerProperty = Type.Object({
  case_number: Nullable(Type.String()),
  realestate_number: Nullable(Type.String()),
  deed_number: Nullable(Type.String()),
  deed_date: Nullable(Type.String()),
  status: Nullable(Type.String()),
  city: Nullable(Type.String()),
  district: Nullable(Type.String()),
  area: Nullable(Type.String()),
  owning_percentage: Nullable(Type.String()),
  property_type: Nullable(Type.String()),
  parcel_number: Nullable(Type.String()),
  plan_number: Nullable(Type.String()),
  block_number: Nullable(Type.String()),
  transfer_info: Type.Union([Type.Array(ITransferInfo), Type.Null()]),
});

const IResponse = Type.Object({
  data: Type.Array(IRerProperty),
  total: Type.Integer(),
  page: Type.Integer(),
  page_size: Type.Integer(),
  total_pages: Type.Integer(),
});

export type TResponse = Static<typeof IResponse>;

export type getRerPropertiesSchemaType = RouteGenericInterface & {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getRerPropertiesSchema = {
  tags: ["inquiry"],
  deprecated: false,
  summary: "Get RER properties by owner (paginated)",
  description: "Query RER properties with pagination by owner ID",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
