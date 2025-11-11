import { Type, Static } from "@sinclair/typebox";
import { IDateTimeRange } from "../../helper/common";

export const IFilter = Type.Object({
  post: Type.Object({
    posted_at: IDateTimeRange,
    post_type: Type.Optional(Type.Array(Type.String())),
    sentiment: Type.Optional(Type.Array(Type.String())),
    keywords: Type.Optional(Type.Array(Type.String())),
    country: Type.Optional(Type.Array(Type.String())),
    clauses: Type.Object({
      ids: Type.Optional(Type.Array(Type.Number())),
      // Example: { "ids": [1, 2, 3, 4], "clause": "([context] equals 1 and [context] equals 2 and [context] equals 3 or [context] equals 4 )" }
      clause: Type.Optional(Type.String()),
    }),
    metrics: Type.Object({
      like_count: Type.Optional(
        Type.Object({
          min: Type.Optional(Type.Number()),
          max: Type.Optional(Type.Number()),
        }),
      ),
      retweet_count: Type.Optional(
        Type.Object({
          min: Type.Optional(Type.Number()),
          max: Type.Optional(Type.Number()),
        }),
      ),
      reply_count: Type.Optional(
        Type.Object({
          min: Type.Optional(Type.Number()),
          max: Type.Optional(Type.Number()),
        }),
      ),
      bookmark_count: Type.Optional(
        Type.Object({
          min: Type.Optional(Type.Number()),
          max: Type.Optional(Type.Number()),
        }),
      ),
      impression_count: Type.Optional(
        Type.Object({
          min: Type.Optional(Type.Number()),
          max: Type.Optional(Type.Number()),
        }),
      ),
      media_count: Type.Optional(
        Type.Object({
          min: Type.Optional(Type.Number()),
          max: Type.Optional(Type.Number()),
        }),
      ),
    }),
  }),
  user: Type.Object({
    from: Type.Optional(Type.Array(Type.String())),
    to: Type.Optional(Type.Array(Type.String())),
    is_verified: Type.Optional(Type.Boolean()),
    verified_type: Type.Optional(Type.Array(Type.String())),
    metrics: Type.Object({
      followers_count: Type.Optional(
        Type.Object({
          min: Type.Optional(Type.Number()),
          max: Type.Optional(Type.Number()),
        }),
      ),
    }),
  }),
  orderBy: Type.Optional(
    Type.Object({
      field: Type.String({ default: "posted_at" }),
      direction: Type.String({ enum: ["asc", "desc"], default: "desc" }),
    }),
  ),
});
export type TFilter = Static<typeof IFilter>;
