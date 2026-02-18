import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";
import { IFilter, TFilter } from "../../../../models/types/rer/filter.type";

const IResponse = Type.Array(
  Type.Object({
    count: Type.Number(),
    label: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getTransactionsCountByTradeChannelSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Response: TResponse;
  Error: TError;
};

export const getTransactionsCountByTradeChannelSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get transactions count by trade channel",
  description: "get transactions count by trade channel",
  body: IFilter,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
