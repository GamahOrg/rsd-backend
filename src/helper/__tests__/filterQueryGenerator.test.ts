import { describe, it, expect, vi } from "vitest";
import { buildUnifiedClauseFilter } from "../filterQueryGenerator";
import { IsNull, Not, Like, Or } from "typeorm";

/**
 * Tests for filterQueryGenerator - specifically for the excluded_account filter bug fix.
 *
 * BUG: When excluding an account, the filter applied NOT LIKE to both username and
 * reply_to_username. Since most posts have reply_to_username = NULL (they're not replies),
 * the SQL condition `NULL NOT LIKE 'value'` evaluates to UNKNOWN (treated as FALSE),
 * causing ALL posts with NULL reply_to_username to be incorrectly excluded.
 *
 * FIX: For reply_to_username, use `Or(IsNull(), Not(Like(value)))` to properly handle
 * NULL values - posts where reply_to_username IS NULL OR is NOT the excluded account
 * should be kept.
 */

// Mock FastifyInstance - we don't need real DB access for these tests
const mockFastify = {} as any;

describe("filterQueryGenerator - excluded_account filter", () => {
  describe("bug fix: excluded_account should handle NULL reply_to_username", () => {
    it("should create Or(IsNull, Not(Like)) for reply_to_username when excluding an account", async () => {
      // This is the expression that gets generated when excluding an account
      const expression = "[excluded_account] equals 'testuser'";

      const result = await buildUnifiedClauseFilter(expression, mockFastify);

      expect(result).not.toBeNull();

      // Should have username operator (NOT LIKE)
      expect(result!.usernameOperator).not.toBeNull();

      // Should have reply_to_username operator (OR with IsNull and NOT LIKE)
      expect(result!.replyToUsernameOperator).not.toBeNull();

      // The reply_to_username operator should be an Or operator (to handle NULL)
      // TypeORM FindOperator has a _type property that indicates the operator type
      const replyToOp = result!.replyToUsernameOperator as any;

      // Check that it's an "or" operator (handles NULL values correctly)
      expect(replyToOp._type).toBe("or");
    });

    it("should NOT exclude posts where reply_to_username is NULL", async () => {
      const expression = "[excluded_account] equals 'DrAlansariMAA'";

      const result = await buildUnifiedClauseFilter(expression, mockFastify);

      expect(result).not.toBeNull();

      // The operator should be AND (both username AND reply_to_username conditions)
      expect(result!.operator).toBe("AND");

      // Verify that reply_to_username uses Or(IsNull(), Not(Like()))
      const replyToOp = result!.replyToUsernameOperator as any;

      // Should be an "or" operator to allow NULL values through
      expect(replyToOp._type).toBe("or");

      // The Or should contain IsNull and Not(Like) conditions
      // This ensures posts with NULL reply_to_username are NOT excluded
      expect(replyToOp._value).toHaveLength(2);
    });

    it("should still exclude posts FROM the excluded account (username check)", async () => {
      const expression = "[excluded_account] equals 'testuser'";

      const result = await buildUnifiedClauseFilter(expression, mockFastify);

      expect(result).not.toBeNull();

      // Username operator should be NOT LIKE (to exclude posts FROM this account)
      const usernameOp = result!.usernameOperator as any;
      expect(usernameOp._type).toBe("not");
    });
  });

  describe("from_account filter (for comparison)", () => {
    it("should create simple LIKE for username when filtering by from_account", async () => {
      const expression = "[from_account] equals 'testuser'";

      const result = await buildUnifiedClauseFilter(expression, mockFastify);

      expect(result).not.toBeNull();

      // Should have username operator
      expect(result!.usernameOperator).not.toBeNull();

      // Should NOT have reply_to_username operator
      expect(result!.replyToUsernameOperator).toBeNull();

      // Username operator should be LIKE (not NOT LIKE)
      const usernameOp = result!.usernameOperator as any;
      expect(usernameOp._type).toBe("like");
    });
  });

  describe("to_account filter (for comparison)", () => {
    it("should create simple LIKE for reply_to_username when filtering by to_account", async () => {
      const expression = "[to_account] equals 'testuser'";

      const result = await buildUnifiedClauseFilter(expression, mockFastify);

      expect(result).not.toBeNull();

      // Should NOT have username operator
      expect(result!.usernameOperator).toBeNull();

      // Should have reply_to_username operator
      expect(result!.replyToUsernameOperator).not.toBeNull();

      // Reply to username operator should be LIKE
      const replyToOp = result!.replyToUsernameOperator as any;
      expect(replyToOp._type).toBe("like");
    });
  });

  describe("combined expressions", () => {
    it("should handle multiple excluded_account filters", async () => {
      // Test multiple excluded accounts combined with AND
      const expression =
        "(([excluded_account] equals 'user1') and ([excluded_account] equals 'user2'))";

      const result = await buildUnifiedClauseFilter(expression, mockFastify);

      expect(result).not.toBeNull();

      // Should have username operator (combined NOT LIKE for both)
      expect(result!.usernameOperator).not.toBeNull();

      // Should have reply_to_username operator with NULL handling
      expect(result!.replyToUsernameOperator).not.toBeNull();

      // The combined operator should still handle NULL correctly
      const replyToOp = result!.replyToUsernameOperator as any;
      // Should be "and" because both conditions need to be met
      expect(replyToOp._type).toBe("and");
    });

    it("should handle keyword combined with excluded_account", async () => {
      const expression = "(([keyword] equals 'test') and ([excluded_account] equals 'user1'))";

      const result = await buildUnifiedClauseFilter(expression, mockFastify);

      expect(result).not.toBeNull();

      // Should have text operator from keyword
      expect(result!.textOperator).not.toBeNull();

      // Should have username operator (NOT LIKE)
      expect(result!.usernameOperator).not.toBeNull();

      // Should have reply_to_username operator with NULL handling
      expect(result!.replyToUsernameOperator).not.toBeNull();

      const replyToOp = result!.replyToUsernameOperator as any;
      expect(replyToOp._type).toBe("or");
    });
  });
});
