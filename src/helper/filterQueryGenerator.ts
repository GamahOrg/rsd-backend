import { Between, In, MoreThanOrEqual, LessThanOrEqual } from "typeorm";

interface DateRange {
  from?: string;
  to?: string;
}

interface FilterQueryGenerator {
  generateFilterQuery(filter: Filter): string;
}

export interface Filter {
  posted_at?: DateRange;
  sentiment?: string[];
  post_type?: string[];
  username?: string[];
  keywords?: string[];
  followers_count?: { min?: number; max?: number };
  like_count?: { min?: number; max?: number };
  retweet_count?: { min?: number; max?: number };
  reply_count?: { min?: number; max?: number };
  bookmark_count?: { min?: number; max?: number };
  impression_count?: { min?: number; max?: number };
  country?: string[];
  is_verified?: boolean;
  verified_type?: string[];
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

const buildUserFilters = (filter: Filter) => {
  const hasFollowersRange = !!(
    filter.followers_count &&
    (isDefined(filter.followers_count.min) || isDefined(filter.followers_count.max))
  );
  const hasVerified = filter.is_verified !== undefined;
  const hasVerifiedType = !!(filter.verified_type && filter.verified_type.length);
  if (!hasFollowersRange && !hasVerified && !hasVerifiedType) return {};

  return {
    user: {
      ...buildNumberRangeFilter("followers_count", filter.followers_count),
      ...(hasVerified ? { is_verified: filter.is_verified } : {}),
      ...(hasVerifiedType ? { verified_type: In(filter.verified_type!) } : {}),
    },
  };
};

export const generateFilterQuery = (filter?: Filter) => {
  if (!filter) return {};
  return {
    ...(filter.posted_at ? buildDateRangeFilter("posted_at", filter.posted_at) : {}),
    ...(filter.sentiment && filter.sentiment.length > 0 ? { sentiment: In(filter.sentiment) } : {}),
    ...(filter.post_type && filter.post_type.length > 0 ? { post_type: In(filter.post_type) } : {}),
    ...(filter.username && filter.username.length > 0 ? { username: In(filter.username) } : {}),
    ...(filter.keywords && filter.keywords.length > 0 ? { keywords: In(filter.keywords) } : {}),
    ...buildNumberRangeFilter("like_count", filter.like_count),
    ...buildNumberRangeFilter("retweet_count", filter.retweet_count),
    ...buildNumberRangeFilter("reply_count", filter.reply_count),
    ...buildNumberRangeFilter("bookmark_count", filter.bookmark_count),
    ...buildNumberRangeFilter("impression_count", filter.impression_count),
    ...(filter.country ? { country: In(filter.country) } : {}),
    ...buildUserFilters(filter),
  };
};
