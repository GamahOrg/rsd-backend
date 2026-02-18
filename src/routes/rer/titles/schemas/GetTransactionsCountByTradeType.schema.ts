import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { IFilter, TFilter } from "../../../../models/types/rer/filter.type";

const IResponse = Type.Array(
  Type.Object({
    Count: Type.Number(),
    Label: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getTransactionsCountByTradeTypeSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Response: TResponse;
  Error: TError;
};

export const getTransactionsCountByTradeTypeSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get transactions count by trade type",
  description: "get transactions count by trade type",
  body: IFilter,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
