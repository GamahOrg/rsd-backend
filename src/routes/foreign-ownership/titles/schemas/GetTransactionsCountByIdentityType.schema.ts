import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { IFilter } from "../../../../models/types/rer/filter.type";

// extend IFilter to include nationality
const IFilterWithExtra = Type.Object({
  ...IFilter.properties,
  filter: Type.Object({
    ...IFilter.properties.filter.properties,
    nationality: Type.Optional(Type.Array(Type.String())),
  }),
});
export type TFilterWithExtra = Static<typeof IFilterWithExtra>;

const IResponse = Type.Array(
  Type.Object({
    count: Type.Number(),
    label: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getTransactionsCountByIdentityTypeSchemaType = RouteGenericInterface & {
  Body: TFilterWithExtra;
  Response: TResponse;
  Error: TError;
};

export const getTransactionsCountByIdentityTypeSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get transactions count by identity type",
  description: "get transactions count by identity type",
  body: IFilterWithExtra,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
