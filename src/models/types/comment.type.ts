import { Type, Static } from "@sinclair/typebox";
import { IDateTimeRange } from "../../helper/common";

// Schema for clause-based query builder fields (keyword, excluded_keyword, accounts, etc.)
const IClauseField = Type.Optional(
  Type.Object({
    ids: Type.Optional(Type.Array(Type.String())),
    clause: Type.Optional(Type.String()),
  }),
);

// Schema for keyword clause field with highlighted option (frontend-only, stored for UI state)
const IKeywordClauseField = Type.Optional(
  Type.Object({
    ids: Type.Optional(Type.Array(Type.String())),
    clause: Type.Optional(Type.String()),
    highlighted: Type.Optional(Type.Boolean()),
    customKeywords: Type.Optional(Type.Array(Type.String())), // Keywords where isSystemDefined = false
  }),
);

// Quick Search schema - for fast search across text, accounts, or post_id
const IQuickSearch = Type.Optional(
  Type.Object({
    text: Type.Optional(Type.String()), // Search in post text: LIKE '%text%'
    accounts: Type.Optional(Type.Array(Type.String())), // Search in usernames: LIKE 'account%' (OR)
    post_id: Type.Optional(Type.String()), // Search by post ID: exact match
  }),
);

export const IFilter = Type.Object({
  post: Type.Object({
    posted_at: IDateTimeRange,
    post_type: Type.Optional(Type.Array(Type.String())),
    sentiment: Type.Optional(Type.Array(Type.String())),
    keywords: Type.Optional(Type.Array(Type.String())),
    keyword: IKeywordClauseField,
    excluded_keyword: IClauseField,
    country: Type.Optional(Type.Array(Type.String())),
    clauses: Type.Optional(
      Type.Object({
        ids: Type.Optional(Type.Array(Type.Number())),
        // Example: { "ids": [1, 2, 3, 4], "clause": "([context] equals 1 and [context] equals 2 and [context] equals 3 or [context] equals 4 )" }
        clause: Type.Optional(Type.String()),
      }),
    ),
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
    from_account: IClauseField,
    to_account: IClauseField,
    excluded_account: IClauseField,
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
  quickSearch: IQuickSearch,
});
export type TFilter = Static<typeof IFilter>;
