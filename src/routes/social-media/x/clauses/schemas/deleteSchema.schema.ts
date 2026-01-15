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

export type deleteSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const deleteSchema = {
  tags: ["clause"],
  deprecated: false,
  summary: "delete specific clause",
  description: "delete specific clause",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
