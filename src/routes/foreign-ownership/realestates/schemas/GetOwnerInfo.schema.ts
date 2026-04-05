import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { RouteGenericInterface } from "fastify";

const IParams = Type.Object({
  ownerIDNumber: Type.String(),
});
export type TParams = Static<typeof IParams>;

const IResponse = Type.Object({
  OwnerIDNumber: Type.String(),
  OwnerName: Type.String(),
  IdentityType: Type.String(),
  totalDeeds: Type.Number(),
  totalAreaSize: Type.Number(),
  Nationality: Type.String(),
});

export type TResponse = Static<typeof IResponse>;

export type getOwnerInfoSchemaType = RouteGenericInterface & {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getOwnerInfoSchema = {
  tags: ["foreign-ownership"],
  deprecated: false,
  summary: "get owner info data",
  description: "get owner info data",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
