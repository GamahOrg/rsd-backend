import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IPagination } from "../../../helper/common";

const IResponse = Type.Array(
  Type.Object({
    id: Type.String(),
    arabic_name: Type.String(),
    english_name: Type.String(),
  }),
);

export type TResponse = Static<typeof IResponse>;

export type countriesSchemaType = {
  Querystring: IPagination;
  Response: TResponse;
  Error: TError;
};

export const getCountriesSchema = {
  tags: ["general", "countries"],
  deprecated: false,
  summary: "get all countries",
  description: "get all countries",
  querystring: IPagination,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
