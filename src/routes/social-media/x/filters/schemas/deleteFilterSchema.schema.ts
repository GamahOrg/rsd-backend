import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../../helper/common";

const IParams = Type.Object({
  id: Type.Number(),
});
export type TParams = Static<typeof IParams>;

const IResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
});

export type TResponse = Static<typeof IResponse>;

export type deleteFilterSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const deleteFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "delete specific filter",
  description: "delete specific filter",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
