import { Type, Static } from "@sinclair/typebox";
import { IError, TError, IDateTimeRange } from "../../../../helper/common";
import { IFilter } from "../../../../models/types/comment.type";

const IBody = Type.Object({
  filter: Type.Optional(IFilter),
});
type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  general: Type.Integer(),
  quote: Type.Integer(),
  replies: Type.Integer(),
  posts: Type.Integer(),
});

export type TResponse = Static<typeof IResponse>;

export type getGeneralStatisticsSchemaType = {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getGeneralStatisticsSchema = {
  tags: ["post", "statistics"],
  deprecated: false,
  summary: "get general statistics",
  description: "get general statistics",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
