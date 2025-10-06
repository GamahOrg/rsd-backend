import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { IFilter } from "../../../../models/types/comment.type";

const IBody = Type.Object({
  filter: Type.Optional(IFilter),
});
type TBody = Static<typeof IBody>;

const IResponse = Type.Object({});

export type TResponse = Static<typeof IResponse>;

export type getDetailedStatisticsSchemaType = {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getDetailedStatisticsSchema = {
  tags: ["post", "statistics"],
  deprecated: false,
  summary: "get detailed statistics",
  description: "get detailed statistics",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
