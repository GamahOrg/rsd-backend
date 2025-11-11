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
} from "typeorm";
import { FastifyInstance } from "fastify";

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
    clauses?: {
      ids?: number[];
      clause?: string;
    };
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

/**
 * Escape special characters in LIKE patterns
 * Underscores (_) are escaped using brackets [_]
 */
const escapeLikePattern = (text: string): string => {
  return text.replace(/_/g, "[_]");
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

const makeTextExpr = (kw: string) => Like(`% ${escapeLikePattern(kw)} %`);

export const generateFilterQuery = async (
  filter?: Filter,
  baseFilter?: BaseFilter,
  fastify?: FastifyInstance,
) => {
  if (!filter) return {};

  // Build clause filter from expression tree
  let clauseFilter: FindOperator<string> | null = null;
  if (filter.post?.clauses && filter.post.clauses.clause && fastify) {
    clauseFilter = await buildClauseFilterFromExpression(filter.post.clauses.clause, fastify);
  }

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

  // Build result based on keywords and clauses
  let result: any[] = [];

  if (filter?.post?.keywords?.length) {
    result = filter.post.keywords.map((kw: string) => ({
      ...baseWhere,
      text: makeTextExpr(kw),
    }));
  } else {
    result = [baseWhere];
  }

  // Add clause filter to all results if it exists
  if (clauseFilter) {
    result = result.map((where) => ({
      ...where,
      text: where.text ? And(where.text, clauseFilter) : clauseFilter,
    }));
  }
  return result;
};

// Token types for clause parsing
type TokenType = "TERM" | "AND" | "OR" | "NOT" | "LPAREN" | "RPAREN";

interface Token {
  type: TokenType;
  value: string;
}

// Token types for clause ID expression parsing
type ClauseTokenType = "CLAUSEID" | "AND" | "OR" | "LPAREN" | "RPAREN" | "EQUALS" | "CONTEXT";

interface ClauseToken {
  type: ClauseTokenType;
  value: string | number;
}

// Expression tree for clause IDs
type ClauseExpressionNode =
  | { type: "CLAUSEID"; id: number }
  | { type: "AND"; left: ClauseExpressionNode; right: ClauseExpressionNode }
  | { type: "OR"; left: ClauseExpressionNode; right: ClauseExpressionNode };

// Expression tree node types
type ExpressionNode =
  | { type: "TERM"; value: string; isNegated?: boolean }
  | { type: "AND"; left: ExpressionNode; right: ExpressionNode }
  | { type: "OR"; left: ExpressionNode; right: ExpressionNode };

/**
 * Tokenize a clause ID expression like "([context] equals 1 and [context] equals 2 or [context] equals 3)"
 */
const tokenizeClauseExpression = (clauseExpr: string): ClauseToken[] => {
  if (!clauseExpr) return [];

  const tokens: ClauseToken[] = [];
  // Pattern to match: [context], equals, numbers, and, or, parentheses
  const pattern = /\[context\]|equals|(\d+)|\b(and|or)\b|\(|\)/gi;
  let match;

  while ((match = pattern.exec(clauseExpr)) !== null) {
    if (match[1]) {
      // It's a number (clause ID)
      tokens.push({ type: "CLAUSEID", value: parseInt(match[1], 10) });
    } else if (match[0].toLowerCase() === "[context]") {
      tokens.push({ type: "CONTEXT", value: "[context]" });
    } else if (match[0].toLowerCase() === "equals") {
      tokens.push({ type: "EQUALS", value: "equals" });
    } else if (match[2]) {
      // It's an operator (and/or)
      const operator = match[2].toUpperCase();
      if (operator === "AND") {
        tokens.push({ type: "AND", value: "AND" });
      } else if (operator === "OR") {
        tokens.push({ type: "OR", value: "OR" });
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
 * Parse clause ID tokens into an expression tree
 * This handles expressions like: ([context] equals 1 and [context] equals 2 or [context] equals 3)
 */
const parseClauseExpression = (tokens: ClauseToken[]): ClauseExpressionNode | null => {
  let position = 0;

  const peek = (): ClauseToken | undefined => tokens[position];
  const consume = (): ClauseToken | undefined => tokens[position++];

  // Parse OR expressions (lowest precedence)
  const parseOrExpression = (): ClauseExpressionNode | null => {
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
  const parseAndExpression = (): ClauseExpressionNode | null => {
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

  // Parse primary expressions (clause IDs, parentheses)
  const parsePrimary = (): ClauseExpressionNode | null => {
    const token = peek();
    if (!token) return null;

    // Handle parentheses
    if (token.type === "LPAREN") {
      consume(); // consume (
      const expr = parseOrExpression();
      if (peek()?.type === "RPAREN") {
        consume(); // consume )
      }
      return expr;
    }

    // Handle [context] equals <id>
    if (token.type === "CONTEXT") {
      consume(); // consume [context]
      if (peek()?.type === "EQUALS") {
        consume(); // consume equals
        const idToken = peek();
        if (idToken?.type === "CLAUSEID") {
          consume();
          return { type: "CLAUSEID", id: idToken.value as number };
        }
      }
    }

    return null;
  };

  return parseOrExpression();
};

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
const expressionToTypeORM = (node: ExpressionNode): FindOperator<string> => {
  if (node.type === "TERM") {
    const likeOperator = Like(`% ${escapeLikePattern(node.value)} %`);
    return node.isNegated ? Not(likeOperator) : likeOperator;
  }

  if (node.type === "AND") {
    const left = expressionToTypeORM(node.left);
    const right = expressionToTypeORM(node.right);
    return And(left, right);
  }

  if (node.type === "OR") {
    const left = expressionToTypeORM(node.left);
    const right = expressionToTypeORM(node.right);
    return Or(left, right);
  }

  throw new Error("Unknown node type");
};

/**
 * Build a TypeORM filter from a clause expression
 */
async function buildClauseFilterFromExpression(
  clauseExpression: string,
  fastify: FastifyInstance,
): Promise<FindOperator<string> | null> {
  // Parse the clause expression
  const tokens = tokenizeClauseExpression(clauseExpression);
  if (tokens.length === 0) return null;

  const expressionTree = parseClauseExpression(tokens);
  if (!expressionTree) return null;

  // Convert the expression tree to TypeORM operators
  return await clauseExpressionToTypeORM(expressionTree, fastify);
}

/**
 * Fetch a single clause and convert it to TypeORM operator
 */
async function fetchClauseAsTypeORM(
  clauseId: number,
  fastify: FastifyInstance,
): Promise<FindOperator<string> | null> {
  try {
    const result = await fastify.clauseService.getClause(clauseId);

    // Parse include and exclude clauses
    const includeClause = result.data.include_clause ?? "";
    const excludeClause = result.data.exclude_clause ?? "";

    let textOperator: FindOperator<string> | null = null;

    // Parse include clause
    let includeOperator: FindOperator<string> | null = null;
    if (includeClause.trim().length > 0) {
      const includeTokens = tokenizeClause(includeClause);
      if (includeTokens.length > 0) {
        const includeExpr = parseExpression(includeTokens);
        if (includeExpr) {
          includeOperator = expressionToTypeORM(includeExpr);
        }
      }
    }

    // Parse exclude clause
    let excludeOperator: FindOperator<string> | null = null;
    if (excludeClause.trim().length > 0) {
      const excludeTokens = tokenizeClause(excludeClause);
      if (excludeTokens.length > 0) {
        const excludeExpr = parseExpression(excludeTokens);
        if (excludeExpr) {
          // Negate the entire exclude expression using De Morgan's laws
          const negatedExpr = negateExpression(excludeExpr);
          excludeOperator = expressionToTypeORM(negatedExpr);
        }
      }
    }

    // Combine include and exclude operators
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

    return textOperator;
  } catch (error) {
    console.error(`Failed to fetch clause ${clauseId}:`, error);
    return null;
  }
}

/**
 * Convert a clause expression tree to TypeORM operators
 */
async function clauseExpressionToTypeORM(
  node: ClauseExpressionNode,
  fastify: FastifyInstance,
): Promise<FindOperator<string> | null> {
  if (node.type === "CLAUSEID") {
    return await fetchClauseAsTypeORM(node.id, fastify);
  }

  if (node.type === "AND") {
    const left = await clauseExpressionToTypeORM(node.left, fastify);
    const right = await clauseExpressionToTypeORM(node.right, fastify);
    if (!left || !right) return left || right;
    return And(left, right);
  }

  if (node.type === "OR") {
    const left = await clauseExpressionToTypeORM(node.left, fastify);
    const right = await clauseExpressionToTypeORM(node.right, fastify);
    if (!left || !right) return left || right;
    return Or(left, right);
  }

  return null;
}
