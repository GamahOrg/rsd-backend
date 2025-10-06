import { Type, Static } from "@sinclair/typebox";
import { IError, TError } from "../../../../helper/common";
import { IFilter } from "../../../../models/types/comment.type";

const IParams = Type.Object({
  type: Type.String(),
});
type TParams = Static<typeof IParams>;

const IBody = Type.Object({
  filter: Type.Optional(IFilter),
});
type TBody = Static<typeof IBody>;

const IResponse = Type.Object({
  chart_data: Type.Array(Type.Object({})),
  metrics: Type.Object({
    total_retweets: Type.Number(),
    total_likes: Type.Number(),
    total_bookmarks: Type.Number(),
    total_impressions: Type.Number(),
  }),
});

export type TResponse = Static<typeof IResponse>;

export type getDetailedStatisticsSchemaType = {
  Params: TParams;
  Body: TBody;
  Response: TResponse;
  Error: TError;
};

export const getDetailedStatisticsSchema = {
  tags: ["post", "statistics"],
  deprecated: false,
  summary: "get detailed statistics",
  description: "get detailed statistics",
  params: IParams,
  body: IBody,
  response: {
    200: IResponse,
    400: IError,
    404: IError,
    500: IError,
  },
};
