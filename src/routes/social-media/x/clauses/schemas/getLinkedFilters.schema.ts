import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../../helper/common";

const IParams = Type.Object({
  id: Type.Number(),
});
export type TParams = Static<typeof IParams>;

const IFilter = Type.Object({
  id: Type.Number(),
  name: Type.String(),
});

const IResponse = Type.Object({
  filters: Type.Array(IFilter),
});

export type TResponse = Static<typeof IResponse>;

export type getLinkedFiltersSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const getLinkedFiltersSchema = {
  tags: ["clause"],
  deprecated: false,
  summary: "Get filters linked to a clause",
  description: "Returns a list of filters that are currently using this clause",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
