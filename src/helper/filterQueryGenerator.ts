import {
  Between,
  In,
  MoreThanOrEqual,
  LessThanOrEqual,
  Like,
  FindOperator,
  IsNull,
  Or,
} from "typeorm";

interface DateRange {
  from?: string;
  to?: string;
}

export interface BaseFilter {
  [key: string]: string[] | string | FindOperator<string>;
}

export interface Filter {
  post?: {
    posted_at?: DateRange;
    sentiment?: string[];
    post_type?: string[];
    keywords?: string[];
    country?: string[];
    metrics?: {
      like_count?: { min?: number; max?: number };
      retweet_count?: { min?: number; max?: number };
      reply_count?: { min?: number; max?: number };
      bookmark_count?: { min?: number; max?: number };
      impression_count?: { min?: number; max?: number };
      media_count?: { min?: number; max?: number };
    };
  };
  user?: {
    from?: string[];
    to?: string[];
    is_verified?: boolean;
    verified_type?: string[];
    metrics?: {
      followers_count?: { min?: number; max?: number };
    };
  };
}

type NumberRange = { min?: number; max?: number } | undefined;

const isDefined = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null;

const buildNumberRangeFilter = (field: string, range: NumberRange) => {
  if (!range) return {};
  const { min, max } = range;
  if (isDefined(min) && isDefined(max)) {
    return { [field]: Between(min, max) };
  }
  if (isDefined(min)) {
    return { [field]: MoreThanOrEqual(min) };
  }
  if (isDefined(max)) {
    return { [field]: LessThanOrEqual(max) };
  }
  return {};
};

const buildDateRangeFilter = (field: string, range?: DateRange) => {
  if (!range) return {};

  const fromDate = range.from ? new Date(range.from) : undefined;
  const toDate = range.to ? new Date(range.to) : undefined;

  if (isDefined(fromDate) && isDefined(toDate)) {
    return { [field]: Between(fromDate, toDate) };
  }
  if (isDefined(fromDate)) {
    return { [field]: MoreThanOrEqual(fromDate) };
  }
  if (isDefined(toDate)) {
    return { [field]: LessThanOrEqual(toDate) };
  }
  return {};
};

const buildSentimentFilter = (sentiments?: string[]) => {
  if (!sentiments || sentiments.length === 0) return {};

  const hasNone = sentiments.includes("none");
  const otherSentiments = sentiments.filter((s) => s !== "none");

  if (hasNone && otherSentiments.length > 0) {
    // Include both null values and other sentiments
    return { sentiment: Or(IsNull(), In(otherSentiments)) };
  } else if (hasNone) {
    // Only "none" - include null values only
    return { sentiment: IsNull() };
  } else {
    // No "none" - use regular In operator
    return { sentiment: In(otherSentiments) };
  }
};

const buildUserFilters = (filter: Filter) => {
  const hasFollowersRange = !!(
    filter.user?.metrics?.followers_count &&
    (isDefined(filter.user?.metrics?.followers_count.min) ||
      isDefined(filter.user?.metrics?.followers_count.max))
  );
  const hasVerified = filter.user?.is_verified !== undefined;
  const hasVerifiedType = !!(filter.user?.verified_type && filter.user?.verified_type.length);
  if (!hasFollowersRange && !hasVerified && !hasVerifiedType) return {};

  return {
    user: {
      ...buildNumberRangeFilter("followers_count", filter.user?.metrics?.followers_count),
      ...(hasVerified ? { is_verified: filter.user?.is_verified } : {}),
      ...(hasVerifiedType && filter.user?.verified_type
        ? { verified_type: In(filter.user.verified_type) }
        : {}),
    },
  };
};

export const generateFilterQuery = (filter?: Filter, baseFilter?: BaseFilter) => {
  if (!filter) return {};

  const makeTextExpr = (kw: string) => Like(`%${kw}%`);

  const baseWhere = {
    ...baseFilter,
    ...(filter.post?.posted_at ? buildDateRangeFilter("posted_at", filter.post?.posted_at) : {}),
    ...buildSentimentFilter(filter.post?.sentiment),
    ...(filter.post?.post_type && filter.post?.post_type.length > 0
      ? { post_type: In(filter.post?.post_type) }
      : {}),
    ...(filter.user?.from && filter.user?.from.length > 0
      ? { user_id: In(filter.user?.from) }
      : {}),
    ...(filter.user?.to && filter.user?.to.length > 0
      ? { reply_to_user_id: In(filter.user?.to) }
      : {}),
    ...(filter.post?.country && filter.post?.country.length > 0
      ? { country: In(filter.post?.country) }
      : {}),
    ...buildNumberRangeFilter("like_count", filter.post?.metrics?.like_count),
    ...buildNumberRangeFilter("retweet_count", filter.post?.metrics?.retweet_count),
    ...buildNumberRangeFilter("reply_count", filter.post?.metrics?.reply_count),
    ...buildNumberRangeFilter("bookmark_count", filter.post?.metrics?.bookmark_count),
    ...buildNumberRangeFilter("impression_count", filter.post?.metrics?.impression_count),
    ...buildNumberRangeFilter("media_count", filter.post?.metrics?.media_count),
    ...buildUserFilters(filter),
  };

  return filter?.post?.keywords?.length
    ? filter.post.keywords.map((kw: string) => ({
        ...baseWhere,
        text: makeTextExpr(kw),
      }))
    : [baseWhere];
};
