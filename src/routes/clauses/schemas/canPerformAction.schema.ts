import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../helper/common";

const IParams = Type.Object({
  id: Type.Number(),
});
export type TParams = Static<typeof IParams>;

const IResponse = Type.Object({
  can_make_action: Type.Boolean(),
});

export type TResponse = Static<typeof IResponse>;

export type canPerformActionSchemaType = {
  Params: TParams;
  Response: TResponse;
  Error: TError;
};

export const canPerformActionSchema = {
  tags: ["clause"],
  deprecated: false,
  summary: "can perform action",
  description: "can perform action",
  params: IParams,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
