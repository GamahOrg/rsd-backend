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

export type leaveFilterSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const leaveFilterSchema = {
  tags: ["filter"],
  deprecated: false,
  summary: "Leave a shared filter",
  description: "Allows a user to remove themselves from a filter that has been shared with them",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    403: IError,
    404: IError,
    500: IError,
  },
};
