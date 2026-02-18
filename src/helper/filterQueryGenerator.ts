import {
  Between,
  In,
  MoreThanOrEqual,
  LessThanOrEqual,
  Like,
  FindOperator,
  IsNull,
  Or,
  And,
  Not,
  Raw,
} from "typeorm";
import { FastifyInstance } from "fastify";

interface DateRange {
  from?: string;
  to?: string;
}

export interface BaseFilter {
  [key: string]: string[] | string | FindOperator<string>;
}

/**
 * Text filter for posts - excludes posts with null or empty text.
 */
export const getTextFilter = () =>
  And(
    Not(IsNull()),
    Raw((alias) => `LEN(${alias}) > 0`),
  );

/**
 * Standard base filter for posts list and statistics queries.
 * Excludes posts with null/empty text and retweets.
 * Use this to ensure consistent counts across posts list and statistics.
 */
export const getPostsBaseFilter = (): BaseFilter => ({
  text: getTextFilter(),
  post_type: Not("retweet"),
});

// Reusable clause expression structure
interface ClauseExpression {
  ids?: string[];
  clause?: string;
}

export interface Filter {
  post?: {
    posted_at?: DateRange;
    sentiment?: string[];
    post_type?: string[];
    country?: string[];
    clauses?: ClauseExpression;
    // Direct value clause expressions
    keyword?: ClauseExpression;
    excluded_keyword?: ClauseExpression;
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
    from_account?: ClauseExpression;
    to_account?: ClauseExpression;
    excluded_account?: ClauseExpression;
    verified_type?: string[];
    metrics?: {
      followers_count?: { min?: number; max?: number };
    };
  };
  // Quick Search - searches in text, accounts, or post_id
  quickSearch?: {
    text?: string; // Search in post text: LIKE '%text%'
    accounts?: string[]; // Search in usernames: LIKE 'account%' (OR) - same as regular user search
    post_id?: string; // Search by post ID: exact match
  };
}

type NumberRange = { min?: number; max?: number } | undefined;

const isDefined = <T>(value: T | undefined | null): value is T =>
  value !== undefined && value !== null;

/**
 * Escape special characters in LIKE patterns
 * Underscores (_) are escaped using brackets [_]
 */
const escapeLikePattern = (text: string): string => {
  return text.replace(/_/g, "[_]");
};

/**
 * Build quick search filter for post and user relations
 *
 * Supports:
 * - text: Search in post text with LIKE '%text%'
 * - accounts: Search in usernames with LIKE 'account%' (same as regular user search)
 * - post_id: Exact match on post_id
 */
const buildQuickSearchFilter = (
  quickSearch?: Filter["quickSearch"],
): { postFilter: Record<string, unknown>; userFilter: Record<string, unknown> } => {
  if (!quickSearch) return { postFilter: {}, userFilter: {} };

  let postFilter: Record<string, unknown> = {};
  let userFilter: Record<string, unknown> = {};

  // Post ID search - exact match
  if (quickSearch.post_id) {
    postFilter = { post_id: quickSearch.post_id };
  }
  // Text search - LIKE '%text%'
  else if (quickSearch.text) {
    const escapedText = escapeLikePattern(quickSearch.text);
    postFilter = { text: Like(`%${escapedText}%`) };
  }
  // Accounts search - LIKE 'account%' (same as regular user search)
  else if (quickSearch.accounts && quickSearch.accounts.length > 0) {
    const escapedAccounts = quickSearch.accounts.map((a) => Like(`${escapeLikePattern(a)}%`));

    userFilter = {
      username: escapedAccounts.length === 1 ? escapedAccounts[0] : Or(...escapedAccounts),
    };
  }

  return { postFilter, userFilter };
};

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

  // Ensure dates are treated as UTC by appending 'Z' if no timezone is specified
  const fromDate = range.from
    ? new Date(
        range.from.includes("Z") || range.from.includes("+") || range.from.includes("-", 10)
          ? range.from
          : range.from + "Z",
      )
    : undefined;
  const toDate = range.to
    ? new Date(
        range.to.includes("Z") || range.to.includes("+") || range.to.includes("-", 10)
          ? range.to
          : range.to + "Z",
      )
    : undefined;
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

const buildVerifiedTypeFilter = (verifiedTypes?: string[]) => {
  if (!verifiedTypes || verifiedTypes.length === 0) return {};

  const hasUnverified = verifiedTypes.includes("unverified");
  const otherTypes = verifiedTypes.filter((t) => t !== "unverified");

  if (hasUnverified && otherTypes.length > 0) {
    return { verified_type: Or(IsNull(), In(otherTypes)) };
  } else if (hasUnverified) {
    return { verified_type: IsNull() };
  } else {
    return { verified_type: In(otherTypes) };
  }
};

const buildUserFilters = (filter: Filter) => {
  const hasFollowersRange = !!(
    filter.user?.metrics?.followers_count &&
    (isDefined(filter.user?.metrics?.followers_count.min) ||
      isDefined(filter.user?.metrics?.followers_count.max))
  );
  const hasVerifiedType = !!(filter.user?.verified_type && filter.user?.verified_type.length);
  if (!hasFollowersRange && !hasVerifiedType) return {};

  return {
    user: {
      ...buildNumberRangeFilter("followers_count", filter.user?.metrics?.followers_count),
      ...buildVerifiedTypeFilter(filter.user?.verified_type),
    },
  };
};

export const generateFilterQuery = async (
  filter?: Filter,
  baseFilter?: BaseFilter,
  fastify?: FastifyInstance,
) => {
  if (!filter) return {};

  // Build combined clause filter from all clause expressions
  let clauseFilterResult: ClauseFilterResult | null = null;
  if (fastify) {
    // Collect all clause expressions
    const clauseExpressions: string[] = [];

    // clauses (clause IDs from database)
    if (filter.post?.clauses?.clause) {
      clauseExpressions.push(filter.post.clauses.clause);
    }
    // Direct value clause expressions
    if (filter.post?.keyword?.clause) {
      clauseExpressions.push(filter.post.keyword.clause);
    }
    if (filter.post?.excluded_keyword?.clause) {
      clauseExpressions.push(filter.post.excluded_keyword.clause);
    }
    if (filter.user?.from_account?.clause) {
      clauseExpressions.push(filter.user.from_account.clause);
    }
    if (filter.user?.to_account?.clause) {
      clauseExpressions.push(filter.user.to_account.clause);
    }
    if (filter.user?.excluded_account?.clause) {
      clauseExpressions.push(filter.user.excluded_account.clause);
    }

    // Combine all expressions with AND
    if (clauseExpressions.length > 0) {
      const combinedExpression =
        clauseExpressions.length === 1
          ? clauseExpressions[0]
          : `(${clauseExpressions.join(" and ")})`;

      clauseFilterResult = await buildUnifiedClauseFilter(combinedExpression, fastify);
    }
  }

  // Build quick search filters (for post and user)
  const { postFilter: quickSearchPostFilter, userFilter: quickSearchUserFilter } =
    buildQuickSearchFilter(filter.quickSearch);

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
    // Quick search post filters (text or post_id)
    ...quickSearchPostFilter,
    // Quick search user filters (accounts) - applied via user relation
    ...(Object.keys(quickSearchUserFilter).length > 0 ? { user: quickSearchUserFilter } : {}),
  };

  // Build result
  let result: any[] = [baseWhere];

  // Add clause filter to all results if it exists
  if (clauseFilterResult) {
    const { textOperator, usernameOperator, replyToUsernameOperator, operator } =
      clauseFilterResult;

    result = result.map((where) => {
      const updatedWhere = { ...where };

      // Apply text operator if it exists
      if (textOperator) {
        updatedWhere.text = where.text ? And(where.text, textOperator) : textOperator;
      }

      // Apply username operator if it exists
      if (usernameOperator) {
        updatedWhere.username = usernameOperator;
      }

      // Apply reply_to_username operator if it exists
      if (replyToUsernameOperator) {
        updatedWhere.reply_to_username = replyToUsernameOperator;
      }

      // If we have multiple operators and the clause operator is OR, we need to create separate conditions
      if (operator === "OR") {
        const operators = [];
        if (textOperator) operators.push("text");
        if (usernameOperator) operators.push("username");
        if (replyToUsernameOperator) operators.push("reply_to_username");

        // If we have multiple operators with OR, create separate where objects for each
        if (operators.length > 1) {
          const whereObjects = [];

          if (textOperator) {
            delete updatedWhere.text;
            delete updatedWhere.username;
            delete updatedWhere.reply_to_username;
            whereObjects.push({
              ...updatedWhere,
              text: where.text ? And(where.text, textOperator) : textOperator,
            });
          }

          if (usernameOperator) {
            whereObjects.push({ ...updatedWhere, username: usernameOperator });
          }

          if (replyToUsernameOperator) {
            whereObjects.push({ ...updatedWhere, reply_to_username: replyToUsernameOperator });
          }

          return whereObjects;
        }
      }

      return updatedWhere;
    });

    // Flatten the result if we have OR conditions
    result = result.flat();
  }

  return result;
};

// Token types for clause parsing
type TokenType = "TERM" | "AND" | "OR" | "NOT" | "LPAREN" | "RPAREN";

interface Token {
  type: TokenType;
  value: string;
}

// Expression tree node types
type ExpressionNode =
  | { type: "TERM"; value: string; isNegated?: boolean }
  | { type: "AND"; left: ExpressionNode; right: ExpressionNode }
  | { type: "OR"; left: ExpressionNode; right: ExpressionNode };

/**
 * Tokenize a clause string into terms and operators
 */
const tokenizeClause = (clause: string): Token[] => {
  if (!clause) return [];

  const tokens: Token[] = [];

  // Match all quoted strings and operators
  const pattern = /N'([^']+)'|'([^']+)'|"([^"]+)"|\b(and|or|not)\b|\(|\)/gi;
  let match;

  while ((match = pattern.exec(clause)) !== null) {
    if (match[1] || match[2] || match[3]) {
      // It's a term (quoted string)
      let content = match[1] || match[2] || match[3];
      // Remove % and ٪ (Arabic percent) wildcards and trim
      content = content.replace(/[%٪]/g, "").trim();
      if (content.length > 0) {
        tokens.push({ type: "TERM", value: content });
      }
    } else if (match[4]) {
      // It's an operator
      const operator = match[4].toUpperCase();
      if (operator === "AND") {
        tokens.push({ type: "AND", value: "AND" });
      } else if (operator === "OR") {
        tokens.push({ type: "OR", value: "OR" });
      } else if (operator === "NOT") {
        tokens.push({ type: "NOT", value: "NOT" });
      }
    } else if (match[0] === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
    } else if (match[0] === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
    }
  }

  return tokens;
};

/**
 * Parse tokens into an expression tree
 * Respects SQL operator precedence: AND > OR
 */
const parseExpression = (tokens: Token[]): ExpressionNode | null => {
  let position = 0;

  const peek = (): Token | undefined => tokens[position];
  const consume = (): Token | undefined => tokens[position++];

  // Parse OR expressions (lowest precedence)
  const parseOrExpression = (): ExpressionNode | null => {
    let left = parseAndExpression();
    if (!left) return null;

    while (peek()?.type === "OR") {
      consume(); // consume OR
      const right = parseAndExpression();
      if (!right) return left;
      left = { type: "OR", left, right };
    }

    return left;
  };

  // Parse AND expressions (higher precedence)
  const parseAndExpression = (): ExpressionNode | null => {
    let left = parsePrimary();
    if (!left) return null;

    while (peek()?.type === "AND") {
      consume(); // consume AND
      const right = parsePrimary();
      if (!right) return left;
      left = { type: "AND", left, right };
    }

    return left;
  };

  // Parse primary expressions (terms, NOT, parentheses)
  const parsePrimary = (): ExpressionNode | null => {
    const token = peek();
    if (!token) return null;

    // Handle NOT
    if (token.type === "NOT") {
      consume(); // consume NOT
      const term = peek();
      if (term?.type === "TERM") {
        consume();
        return { type: "TERM", value: term.value, isNegated: true };
      }
      return null;
    }

    // Handle parentheses
    if (token.type === "LPAREN") {
      consume(); // consume (
      const expr = parseOrExpression();
      if (peek()?.type === "RPAREN") {
        consume(); // consume )
      }
      return expr;
    }

    // Handle term
    if (token.type === "TERM") {
      consume();
      return { type: "TERM", value: token.value };
    }

    return null;
  };

  return parseOrExpression();
};

/**
 * Negate an expression tree using De Morgan's laws
 * NOT(A AND B) = (NOT A) OR (NOT B)
 * NOT(A OR B) = (NOT A) AND (NOT B)
 * NOT(NOT A) = A
 */
const negateExpression = (node: ExpressionNode): ExpressionNode => {
  if (node.type === "TERM") {
    return { ...node, isNegated: !node.isNegated };
  }

  if (node.type === "AND") {
    // NOT(A AND B) = (NOT A) OR (NOT B)
    return {
      type: "OR",
      left: negateExpression(node.left),
      right: negateExpression(node.right),
    };
  }

  if (node.type === "OR") {
    // NOT(A OR B) = (NOT A) AND (NOT B)
    return {
      type: "AND",
      left: negateExpression(node.left),
      right: negateExpression(node.right),
    };
  }

  throw new Error("Unknown node type");
};

/**
 * Convert expression tree to TypeORM FindOperator
 */
const expressionToTypeORM = (
  node: ExpressionNode,
  context: "text" | "accounts",
): FindOperator<string> => {
  if (node.type === "TERM") {
    const likeOperator =
      context === "text"
        ? Like(`% ${escapeLikePattern(node.value)} %`)
        : Like(`${escapeLikePattern(node.value)}`);
    return node.isNegated ? Not(likeOperator) : likeOperator;
  }

  if (node.type === "AND") {
    const left = expressionToTypeORM(node.left, context);
    const right = expressionToTypeORM(node.right, context);
    return And(left, right);
  }

  if (node.type === "OR") {
    const left = expressionToTypeORM(node.left, context);
    const right = expressionToTypeORM(node.right, context);
    return Or(left, right);
  }

  throw new Error("Unknown node type");
};

/**
 * Result structure for clause filters
 */
export interface ClauseFilterResult {
  textOperator: FindOperator<string> | null;
  usernameOperator: FindOperator<string> | null;
  replyToUsernameOperator: FindOperator<string> | null;
  operator: "AND" | "OR";
}

/**
 * Fetch a single clause and convert it to TypeORM operator
 */
export async function fetchClauseAsTypeORM(
  clauseId: number,
  fastify: FastifyInstance,
): Promise<ClauseFilterResult | null> {
  try {
    const result = await fastify.clauseService.getClause(clauseId);
    if (!result) return null;

    // Parse include and exclude clauses for text
    const includeClause = result.data.include_clause ?? "";
    const excludeClause = result.data.exclude_clause ?? "";

    // Parse include and exclude clauses for accounts (usernames)
    const includeAccountsClause = result.data.include_accounts_clause ?? "";
    const excludeAccountsClause = result.data.exclude_accounts_clause ?? "";
    const includeToAccountsClause = result.data.include_to_accounts_clause ?? "";
    const excludeToAccountsClause = result.data.exclude_to_accounts_clause ?? "";

    // Get the operator (AND/OR) from the clause
    const operator: "AND" | "OR" = result.data.operator === "OR" ? "OR" : "AND";

    let textOperator: FindOperator<string> | null = null;
    let usernameOperator: FindOperator<string> | null = null;
    let replyToUsernameOperator: FindOperator<string> | null = null;

    // Parse text include clause
    let includeOperator: FindOperator<string> | null = null;
    if (includeClause.trim().length > 0) {
      const includeTokens = tokenizeClause(includeClause);
      if (includeTokens.length > 0) {
        const includeExpr = parseExpression(includeTokens);
        if (includeExpr) {
          includeOperator = expressionToTypeORM(includeExpr, "text");
        }
      }
    }

    // Parse text exclude clause
    let excludeOperator: FindOperator<string> | null = null;
    if (excludeClause.trim().length > 0) {
      const excludeTokens = tokenizeClause(excludeClause);
      if (excludeTokens.length > 0) {
        const excludeExpr = parseExpression(excludeTokens);
        if (excludeExpr) {
          // Negate the entire exclude expression using De Morgan's laws
          const negatedExpr = negateExpression(excludeExpr);
          excludeOperator = expressionToTypeORM(negatedExpr, "text");
        }
      }
    }

    // Combine text include and exclude operators
    if (includeOperator && excludeOperator) {
      // Both include and exclude: must match include AND not match exclude
      textOperator = And(includeOperator, excludeOperator);
    } else if (includeOperator) {
      // Only include
      textOperator = includeOperator;
    } else if (excludeOperator) {
      // Only exclude
      textOperator = excludeOperator;
    }

    // Parse accounts include clause
    let includeAccountsOperator: FindOperator<string> | null = null;
    if (includeAccountsClause.trim().length > 0) {
      const includeTokens = tokenizeClause(includeAccountsClause);
      if (includeTokens.length > 0) {
        const includeExpr = parseExpression(includeTokens);
        if (includeExpr) {
          includeAccountsOperator = expressionToTypeORM(includeExpr, "accounts");
        }
      }
    }

    // Parse accounts exclude clause
    let excludeAccountsOperator: FindOperator<string> | null = null;
    if (excludeAccountsClause.trim().length > 0) {
      const excludeTokens = tokenizeClause(excludeAccountsClause);
      if (excludeTokens.length > 0) {
        const excludeExpr = parseExpression(excludeTokens);
        if (excludeExpr) {
          // Negate the entire exclude expression using De Morgan's laws
          const negatedExpr = negateExpression(excludeExpr);
          excludeAccountsOperator = expressionToTypeORM(negatedExpr, "accounts");
        }
      }
    }

    // Combine username include and exclude operators
    if (includeAccountsOperator && excludeAccountsOperator) {
      // Both include and exclude: must match include AND not match exclude
      usernameOperator = And(includeAccountsOperator, excludeAccountsOperator);
    } else if (includeAccountsOperator) {
      // Only include
      usernameOperator = includeAccountsOperator;
    } else if (excludeAccountsOperator) {
      // Only exclude
      usernameOperator = excludeAccountsOperator;
    }

    // Parse "to accounts" include clause (for reply_to_username)
    let includeToAccountsOperator: FindOperator<string> | null = null;
    if (includeToAccountsClause.trim().length > 0) {
      const includeTokens = tokenizeClause(includeToAccountsClause);
      if (includeTokens.length > 0) {
        const includeExpr = parseExpression(includeTokens);
        if (includeExpr) {
          includeToAccountsOperator = expressionToTypeORM(includeExpr, "accounts");
        }
      }
    }

    // Parse "to accounts" exclude clause (for reply_to_username)
    let excludeToAccountsOperator: FindOperator<string> | null = null;
    if (excludeToAccountsClause.trim().length > 0) {
      const excludeTokens = tokenizeClause(excludeToAccountsClause);
      if (excludeTokens.length > 0) {
        const excludeExpr = parseExpression(excludeTokens);
        if (excludeExpr) {
          // Negate the entire exclude expression using De Morgan's laws
          const negatedExpr = negateExpression(excludeExpr);
          excludeToAccountsOperator = expressionToTypeORM(negatedExpr, "accounts");
        }
      }
    }

    // Combine reply_to_username include and exclude operators
    if (includeToAccountsOperator && excludeToAccountsOperator) {
      // Both include and exclude: must match include AND not match exclude
      replyToUsernameOperator = And(includeToAccountsOperator, excludeToAccountsOperator);
    } else if (includeToAccountsOperator) {
      // Only include
      replyToUsernameOperator = includeToAccountsOperator;
    } else if (excludeToAccountsOperator) {
      // Only exclude
      replyToUsernameOperator = excludeToAccountsOperator;
    }

    return { textOperator, usernameOperator, replyToUsernameOperator, operator };
  } catch (error) {
    console.error(`Failed to fetch clause ${clauseId}:`, error);
    return null;
  }
}

// =============================================================================
// UNIFIED CLAUSE FILTER - Handles all context types in one expression
// =============================================================================

// Supported context types for unified clause expressions
type UnifiedContextType =
  | "context" // Clause ID from database
  | "keyword" // Text keyword (LIKE '% value %')
  | "excluded_keyword" // Excluded text keyword (NOT LIKE '% value %')
  | "from_account" // Username (LIKE 'value')
  | "to_account" // Reply to username (LIKE 'value')
  | "excluded_account"; // Excluded account (NOT LIKE on both username AND reply_to_username)

// Token types for unified clause expression
type UnifiedClauseTokenType =
  | "CONTEXT_TYPE"
  | "AND"
  | "OR"
  | "LPAREN"
  | "RPAREN"
  | "EQUALS"
  | "VALUE";

interface UnifiedClauseToken {
  type: UnifiedClauseTokenType;
  value: string;
  contextType?: UnifiedContextType;
}

// Expression tree for unified clauses
type UnifiedExpressionNode =
  | { type: "VALUE"; value: string; contextType: UnifiedContextType }
  | { type: "AND"; left: UnifiedExpressionNode; right: UnifiedExpressionNode }
  | { type: "OR"; left: UnifiedExpressionNode; right: UnifiedExpressionNode };

/**
 * Tokenize a unified clause expression that can contain multiple context types
 * e.g., "([context] equals '47' and [excluded_keyword] equals 'spam' and [from_account] equals 'user1')"
 */
function tokenizeUnifiedClauseExpression(expr: string): UnifiedClauseToken[] {
  if (!expr) return [];

  const tokens: UnifiedClauseToken[] = [];
  // Pattern to match: [context_type], equals/=, 'value' or number, and, or, parentheses
  const pattern =
    /\[(context|keyword|excluded_keyword|from_account|to_account|excluded_account)\]|equals|=|'([^']+)'|(\d+)|\b(and|or)\b|\(|\)/gi;
  let match;
  let lastContextType: UnifiedContextType | undefined;

  while ((match = pattern.exec(expr)) !== null) {
    if (match[1]) {
      // It's a context type like [context], [keyword], [excluded_keyword], etc.
      lastContextType = match[1].toLowerCase() as UnifiedContextType;
      tokens.push({ type: "CONTEXT_TYPE", value: match[1], contextType: lastContextType });
    } else if (match[2]) {
      // It's a quoted value like 'KSA' or '47'
      tokens.push({ type: "VALUE", value: match[2], contextType: lastContextType });
    } else if (match[3]) {
      // It's an unquoted number (for backward compatibility with clause IDs)
      tokens.push({ type: "VALUE", value: match[3], contextType: lastContextType });
    } else if (match[0].toLowerCase() === "equals" || match[0] === "=") {
      tokens.push({ type: "EQUALS", value: "equals" });
    } else if (match[4]) {
      const operator = match[4].toUpperCase();
      tokens.push({ type: operator as "AND" | "OR", value: operator });
    } else if (match[0] === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
    } else if (match[0] === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
    }
  }

  return tokens;
}

/**
 * Parse unified clause tokens into an expression tree
 */
function parseUnifiedClauseExpression(tokens: UnifiedClauseToken[]): UnifiedExpressionNode | null {
  let position = 0;

  const peek = (): UnifiedClauseToken | undefined => tokens[position];
  const consume = (): UnifiedClauseToken | undefined => tokens[position++];

  const parseOrExpression = (): UnifiedExpressionNode | null => {
    let left = parseAndExpression();
    if (!left) return null;

    while (peek()?.type === "OR") {
      consume();
      const right = parseAndExpression();
      if (!right) return left;
      left = { type: "OR", left, right };
    }
    return left;
  };

  const parseAndExpression = (): UnifiedExpressionNode | null => {
    let left = parsePrimary();
    if (!left) return null;

    while (peek()?.type === "AND") {
      consume();
      const right = parsePrimary();
      if (!right) return left;
      left = { type: "AND", left, right };
    }
    return left;
  };

  const parsePrimary = (): UnifiedExpressionNode | null => {
    const token = peek();
    if (!token) return null;

    if (token.type === "LPAREN") {
      consume();
      const expr = parseOrExpression();
      if (peek()?.type === "RPAREN") consume();
      return expr;
    }

    // Handle [context_type] equals 'value'
    if (token.type === "CONTEXT_TYPE") {
      const contextType = token.contextType!;
      consume(); // consume [context_type]
      if (peek()?.type === "EQUALS") {
        consume(); // consume equals
        const valueToken = peek();
        if (valueToken?.type === "VALUE") {
          consume();
          return { type: "VALUE", value: valueToken.value, contextType };
        }
      }
    }

    return null;
  };

  return parseOrExpression();
}

/**
 * Helper to combine two operators with a combiner function
 */
function combineOperators(
  left: FindOperator<string> | null,
  right: FindOperator<string> | null,
  combiner: typeof And | typeof Or,
): FindOperator<string> | null {
  if (left && right) return combiner(left, right);
  return left ?? right;
}

/**
 * Convert a single unified expression VALUE node to ClauseFilterResult
 * Handles both direct values and clause IDs (which require DB fetch)
 */
async function unifiedValueToFilterResult(
  value: string,
  contextType: UnifiedContextType,
  fastify: FastifyInstance,
): Promise<ClauseFilterResult | null> {
  // For [context], fetch from database
  if (contextType === "context") {
    const clauseId = parseInt(value, 10);
    if (isNaN(clauseId)) return null;
    return await fetchClauseAsTypeORM(clauseId, fastify);
  }

  // For direct value types, build the operator directly
  const escapedValue = escapeLikePattern(value);

  let textOperator: FindOperator<string> | null = null;
  let usernameOperator: FindOperator<string> | null = null;
  let replyToUsernameOperator: FindOperator<string> | null = null;

  switch (contextType) {
    case "keyword":
      textOperator = Like(`% ${escapedValue} %`);
      break;
    case "excluded_keyword":
      textOperator = Not(Like(`% ${escapedValue} %`));
      break;
    case "from_account":
      usernameOperator = Like(escapedValue);
      break;
    case "to_account":
      replyToUsernameOperator = Like(escapedValue);
      break;
    case "excluded_account":
      // Exclude from BOTH username and reply_to_username
      // For username: NOT LIKE (exclude posts FROM this account)
      usernameOperator = Not(Like(escapedValue));
      // For reply_to_username: Handle NULL values - posts without replies should NOT be excluded
      // NULL NOT LIKE 'value' returns UNKNOWN (treated as FALSE), so we need: IS NULL OR NOT LIKE
      replyToUsernameOperator = Or(IsNull(), Not(Like(escapedValue)));
      break;
  }

  return {
    textOperator,
    usernameOperator,
    replyToUsernameOperator,
    operator: "AND", // Default operator for single values
  };
}

/**
 * Helper to check if a node tree contains only exclusion types (excluded_keyword or excluded_account)
 * This is used to determine if OR should be converted to AND (De Morgan's law for exclusions)
 */
function isExclusionOnlyNode(node: UnifiedExpressionNode): boolean {
  if (node.type === "VALUE") {
    return node.contextType === "excluded_keyword" || node.contextType === "excluded_account";
  }
  if (node.type === "AND" || node.type === "OR") {
    return isExclusionOnlyNode(node.left) && isExclusionOnlyNode(node.right);
  }
  return false;
}

/**
 * Convert a unified expression tree to TypeORM operators
 * This is the core recursive function that handles all context types
 *
 * IMPORTANT: For exclusion types (excluded_keyword, excluded_account), OR in the expression
 * is converted to AND in the operators. This is because:
 * - User intent: "exclude posts containing word1 OR word2"
 * - Correct logic: NOT LIKE 'word1' AND NOT LIKE 'word2'
 * - Wrong logic:  NOT LIKE 'word1' OR NOT LIKE 'word2' (would show posts with word1 if they don't have word2)
 */
async function unifiedExpressionToTypeORM(
  node: UnifiedExpressionNode,
  fastify: FastifyInstance,
): Promise<ClauseFilterResult | null> {
  if (node.type === "VALUE") {
    return await unifiedValueToFilterResult(node.value, node.contextType, fastify);
  }

  if (node.type === "AND") {
    const left = await unifiedExpressionToTypeORM(node.left, fastify);
    const right = await unifiedExpressionToTypeORM(node.right, fastify);

    if (!left && !right) return null;
    if (!left) return right;
    if (!right) return left;

    return {
      textOperator: combineOperators(left.textOperator, right.textOperator, And),
      usernameOperator: combineOperators(left.usernameOperator, right.usernameOperator, And),
      replyToUsernameOperator: combineOperators(
        left.replyToUsernameOperator,
        right.replyToUsernameOperator,
        And,
      ),
      operator: "AND",
    };
  }

  if (node.type === "OR") {
    const left = await unifiedExpressionToTypeORM(node.left, fastify);
    const right = await unifiedExpressionToTypeORM(node.right, fastify);

    if (!left && !right) return null;
    if (!left) return right;
    if (!right) return left;

    // For exclusion-only OR expressions, use AND instead of OR (De Morgan's law)
    // This ensures "exclude A or B" correctly filters out posts containing A OR B
    const isExclusionOR = isExclusionOnlyNode(node);
    const combiner = isExclusionOR ? And : Or;

    return {
      textOperator: combineOperators(left.textOperator, right.textOperator, combiner),
      usernameOperator: combineOperators(left.usernameOperator, right.usernameOperator, combiner),
      replyToUsernameOperator: combineOperators(
        left.replyToUsernameOperator,
        right.replyToUsernameOperator,
        combiner,
      ),
      operator: isExclusionOR ? "AND" : "OR",
    };
  }

  return null;
}

/**
 * Build a TypeORM filter from a unified clause expression
 *
 * Supports all context types in a single expression:
 * - [context] equals '47'           -> Fetches clause ID 47 from database
 * - [keyword] equals 'KSA'          -> LIKE '% KSA %' on text field
 * - [excluded_keyword] equals 'spam' -> NOT LIKE '% spam %' on text field
 * - [from_account] equals 'user1'   -> LIKE 'user1' on username field
 * - [to_account] equals 'user2'     -> LIKE 'user2' on reply_to_username field
 * - [excluded_account] equals 'bot' -> NOT LIKE 'bot' on BOTH username AND reply_to_username
 *
 * @example
 * // Mix clause IDs with direct values
 * const expr = "([context] equals '47' and [excluded_keyword] equals 'spam' and [excluded_account] equals 'bot')";
 * const result = await buildUnifiedClauseFilter(expr, fastify);
 *
 * @example
 * // Direct values only (no DB fetch needed)
 * const expr = "([keyword] equals 'Saudi' or [keyword] equals 'KSA') and [from_account] equals 'official'";
 * const result = await buildUnifiedClauseFilter(expr, fastify);
 */
export async function buildUnifiedClauseFilter(
  expression: string,
  fastify: FastifyInstance,
): Promise<ClauseFilterResult | null> {
  if (!expression?.trim()) return null;

  const tokens = tokenizeUnifiedClauseExpression(expression);
  if (tokens.length === 0) return null;

  const tree = parseUnifiedClauseExpression(tokens);
  if (!tree) return null;

  return await unifiedExpressionToTypeORM(tree, fastify);
}
