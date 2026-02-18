import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

export const IFilter = Type.Object({
  filter: Type.Object({
    duration: Type.Optional(
      Type.Object({
        from: Type.Object({ date: Type.String({ format: "date" }) }),
        to: Type.Object({ date: Type.String({ format: "date" }) }),
        type: Type.String({ enum: ["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"] }),
      }),
    ),
    region: Type.Optional(Type.Array(Type.String())),
    city: Type.Optional(Type.Array(Type.String())),
  }),
});
export type TFilter = Static<typeof IFilter>;

const IResponse = Type.Array(
  Type.Object({
    Label: Type.String(),
    Ratio: Type.Number(),
    total_no_of_realestates: Type.Number(),
    no_of_announced_realestates: Type.Number(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getPublishedRealEstateRatioSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Response: TResponse;
  Error: TError;
};

export const getPublishedRealEstateRatioSchema = {
  tags: ["rer"],
  deprecated: false,
  summary: "get published real estate ratio",
  description: "get published real estate ratio",
  body: IFilter,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
