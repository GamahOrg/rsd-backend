import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { IFilter } from "../../../../models/types/comment.type";

const IBody = Type.Object({
  filter: IFilter,
});
type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  positive: Type.Number(),
  negative: Type.Number(),
  neutral: Type.Number(),
  none: Type.Number(),
});

export type TResponse = Static<typeof IResponse>;

export type getSentimentStatisticsSchemaType = {
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getSentimentStatisticsSchema = {
  tags: ["post"],
  deprecated: false,
  summary: "get sentiment statistics.",
  description: "get sentiment statistics.",
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
