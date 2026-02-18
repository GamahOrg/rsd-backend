import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

// extend IFilter to include nationality
const IFilter = Type.Object({
  filter: Type.Object({
    region: Type.Optional(Type.Array(Type.String())),
    city: Type.Optional(Type.Array(Type.String())),
    nationality: Type.Optional(Type.Array(Type.String())),
    identityType: Type.Optional(Type.Array(Type.String())),
    dataSize: Type.Number({ default: 100 }),
    orderBy: Type.Optional(
      Type.Object({
        column: Type.String(),
        direction: Type.String(),
      }),
    ),
  }),
});
export type TFilter = Static<typeof IFilter>;

const IResponse = Type.Array(
  Type.Object({
    OwnerIDNumber: Type.String(),
    OwnerName: Type.String(),
    IdentityType: Type.String(),
    Nationality: Type.String(),
    realestates: Type.Object({
      moj: Type.Optional(
        Type.Object({
          deeds: Type.Optional(Type.Number()),
          area: Type.Optional(Type.Number()),
        }),
      ),
      rer: Type.Optional(
        Type.Object({
          deeds: Type.Optional(Type.Number()),
          area: Type.Optional(Type.Number()),
          northings: Type.Optional(Type.Array(Type.String())),
          eastings: Type.Optional(Type.Array(Type.String())),
        }),
      ),
    }),
    totalArea: Type.Number(),
    totalDeeds: Type.Number(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type getOwnersSchemaType = RouteGenericInterface & {
  Body: TFilter;
  Querystring: IPagination;
  Response: TResponse;
  Error: TError;
};

export const getOwnersSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get owners data",
  description: "get owners data",
  body: IFilter,
  querystring: IPagination,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
