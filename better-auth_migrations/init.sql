-- =============================================================================
-- Better Auth Database Schema - Initial Migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Core User Table
-- -----------------------------------------------------------------------------
CREATE TABLE "user"
(
    "id"            VARCHAR(36)                            NOT NULL PRIMARY KEY,
    "name"          NVARCHAR(255)                          NOT NULL,
    "email"         VARCHAR(255)                           NOT NULL UNIQUE,
    "emailVerified" SMALLINT                               NOT NULL,
    "image"         VARCHAR(8000),
    "createdAt"     DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"     DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "nationalId"    VARCHAR(255) UNIQUE,
    "firstName"     NVARCHAR(255),
    "fatherName"    NVARCHAR(255),
    "grandName"     NVARCHAR(255),
    "familyName"    NVARCHAR(255),
    "fullName"      NVARCHAR(255),
    "gender"        NVARCHAR(255),
    "nationality"   NVARCHAR(255),
    "language"      NVARCHAR(255),
    "idIssueDate"   NVARCHAR(255),
    "idExpiryDate"  NVARCHAR(255),
    "birthDateG"    NVARCHAR(255),
    "birthDateH"    NVARCHAR(255),
    "status"        VARCHAR(20) DEFAULT 'pending' NOT NULL,
    CONSTRAINT "user_status_check" CHECK ("status" IN ('active', 'inactive', 'suspended', 'pending'))
);

CREATE INDEX "user_status_idx" ON "user" ("status");

-- -----------------------------------------------------------------------------
-- Session Table
-- -----------------------------------------------------------------------------
CREATE TABLE "session"
(
    "id"        VARCHAR(36)                            NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME2(3)                           NOT NULL,
    "token"     VARCHAR(255)                           NOT NULL UNIQUE,
    "createdAt" DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" DATETIME2(3)                           NOT NULL,
    "ipAddress" VARCHAR(8000),
    "userAgent" VARCHAR(8000),
    "userId"    VARCHAR(36)                            NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE INDEX "session_userId_idx" ON "session" ("userId");

-- -----------------------------------------------------------------------------
-- Account Table
-- -----------------------------------------------------------------------------
CREATE TABLE "account"
(
    "id"                    VARCHAR(36)                            NOT NULL PRIMARY KEY,
    "accountId"             VARCHAR(8000)                          NOT NULL,
    "providerId"            VARCHAR(8000)                          NOT NULL,
    "userId"                VARCHAR(36)                            NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "accessToken"           VARCHAR(8000),
    "refreshToken"          VARCHAR(8000),
    "idToken"               VARCHAR(8000),
    "accessTokenExpiresAt"  DATETIME2(3),
    "refreshTokenExpiresAt" DATETIME2(3),
    "scope"                 VARCHAR(8000),
    "password"              VARCHAR(8000),
    "createdAt"             DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"             DATETIME2(3)                           NOT NULL
);

CREATE INDEX "account_userId_idx" ON "account" ("userId");

-- -----------------------------------------------------------------------------
-- Verification Table
-- -----------------------------------------------------------------------------
CREATE TABLE "verification"
(
    "id"         VARCHAR(36)                            NOT NULL PRIMARY KEY,
    "identifier" VARCHAR(255)                           NOT NULL,
    "value"      VARCHAR(8000)                          NOT NULL,
    "expiresAt"  DATETIME2(3)                           NOT NULL,
    "createdAt"  DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"  DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");

-- -----------------------------------------------------------------------------
-- Login History Table
-- -----------------------------------------------------------------------------
CREATE TABLE "loginHistory"
(
    "id"        VARCHAR(36)  NOT NULL PRIMARY KEY,
    "userId"    VARCHAR(36)  NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "loginAt"   DATETIME2(3) NOT NULL,
    "ipAddress" VARCHAR(8000),
    "userAgent" VARCHAR(8000)
);

-- -----------------------------------------------------------------------------
-- Permission Table
-- -----------------------------------------------------------------------------
CREATE TABLE "permission"
(
    "id"          VARCHAR(36)                            NOT NULL PRIMARY KEY,
    "type"        VARCHAR(50)                            NOT NULL,
    "name"        VARCHAR(255)                           NOT NULL,
    "description" NVARCHAR(500),
    "createdAt"   DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"   DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "permission_type_name_unique" UNIQUE ("type", "name")
);

CREATE INDEX "permission_type_idx" ON "permission" ("type");

-- -----------------------------------------------------------------------------
-- User Permission Table
-- -----------------------------------------------------------------------------
CREATE TABLE "userPermission"
(
    "id"           VARCHAR(36)                            NOT NULL PRIMARY KEY,
    "userId"       VARCHAR(36)                            NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "permissionId" VARCHAR(36)                            NOT NULL REFERENCES "permission" ("id") ON DELETE CASCADE,
    "createdAt"    DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt"    DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "userPermission_user_permission_unique" UNIQUE ("userId", "permissionId")
);

CREATE INDEX "userPermission_userId_idx" ON "userPermission" ("userId");
CREATE INDEX "userPermission_permissionId_idx" ON "userPermission" ("permissionId");

-- -----------------------------------------------------------------------------
-- User History Table (Audit Logging)
-- -----------------------------------------------------------------------------
CREATE TABLE "userHistory"
(
    "id"            VARCHAR(36)                            NOT NULL PRIMARY KEY,
    "userId"        VARCHAR(36)                            NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
    "action"        NVARCHAR(1000)                         NOT NULL,
    "actionType"    VARCHAR(50)                            NOT NULL,
    "actionMaker"   VARCHAR(36)                            NOT NULL REFERENCES "user" ("id") ON DELETE NO ACTION,
    "previousValue" NVARCHAR(MAX),
    "newValue"      NVARCHAR(MAX),
    "createdAt"     DATETIME2(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX "userHistory_userId_idx" ON "userHistory" ("userId");
CREATE INDEX "userHistory_actionMaker_idx" ON "userHistory" ("actionMaker");
CREATE INDEX "userHistory_createdAt_idx" ON "userHistory" ("createdAt");

-- =============================================================================
-- Seed Data
-- =============================================================================

-- Seed page permissions
INSERT INTO "permission" ("id", "type", "name", "description")
VALUES
    (NEWID(), 'page', '/', 'Homepage'),
    (NEWID(), 'page', '/reports', 'Reports page'),
    (NEWID(), 'page', '/live', 'Live page'),
    (NEWID(), 'page', '/about', 'About page'),
    (NEWID(), 'page', '/deals', 'Deals page'),
    (NEWID(), 'page', '/frequently-questions', 'Frequently Asked Questions'),
    (NEWID(), 'page', '/live/details', 'Live Details'),
    (NEWID(), 'page', '/user-profile', 'RSD User Profile'),
    (NEWID(), 'page', '/indicator', 'Indicator Homepage'),
    (NEWID(), 'page', '/indicator/indicators', 'Indicator - Indicators'),
    (NEWID(), 'page', '/indicator/deals', 'Indicator - Deals'),
    (NEWID(), 'page', '/indicator/maps', 'Indicator - Maps'),
    (NEWID(), 'page', '/indicator/owners', 'Indicator - Owners'),
    (NEWID(), 'page', '/indicator/owners/details', 'Indicator - Owners Details'),
    (NEWID(), 'page', '/ads', 'Ads Homepage'),
    (NEWID(), 'page', '/ads/summary', 'Ads - Summary'),
    (NEWID(), 'page', '/ads/offerings', 'Ads - Offerings'),
    (NEWID(), 'page', '/lifted-suspension', 'Lifted Suspension Homepage'),
    (NEWID(), 'page', '/lifted-suspension/summary', 'Lifted Suspension - Summary'),
    (NEWID(), 'page', '/lifted-suspension/offerings', 'Lifted Suspension - Offerings'),
    (NEWID(), 'page', '/lifted-suspension/deals', 'Lifted Suspension - Deals'),
    (NEWID(), 'page', '/lifted-suspension/indicator', 'Lifted Suspension - Indicator'),
    (NEWID(), 'page', '/lifted-suspension/offerings/:id', 'Lifted Suspension - Offerings Details'),
    (NEWID(), 'page', '/cities', 'Cities Homepage'),
    (NEWID(), 'page', '/cities/:city', 'City Details'),
    (NEWID(), 'page', '/methodologies', 'Methodologies'),
    (NEWID(), 'page', '/social-media', 'Social Media Homepage'),
    (NEWID(), 'page', '/social-media/posts', 'Social Media - Posts'),
    (NEWID(), 'page', '/social-media/statistics', 'Social Media - Statistics'),
    (NEWID(), 'page', '/social-media/settings', 'Social Media - Settings'),
    (NEWID(), 'page', '/social-media/accounts', 'Social Media - Accounts'),
    (NEWID(), 'page', '/post/:id', 'Post Details'),
    (NEWID(), 'page', '/user', 'User Profile'),
    (NEWID(), 'page', '/advanced-search', 'Advanced Search Homepage'),
    (NEWID(), 'page', '/advanced-search/live', 'Advanced Search - Live'),
    (NEWID(), 'page', '/advanced-search/live/details', 'Advanced Search - Live Details'),
    (NEWID(), 'page', '/advanced-search/ads/summary', 'Advanced Search - Ads Summary'),
    (NEWID(), 'page', '/advanced-search/ads-details/:ad-number', 'Advanced Search - Ads Details'),
    (NEWID(), 'page', '/advanced-search/deals', 'Advanced Search - Deals'),
    (NEWID(), 'page', '/advanced-search/maps', 'Advanced Search - Maps'),
    (NEWID(), 'page', '/advanced-search/owners', 'Advanced Search - Owners'),
    (NEWID(), 'page', '/advanced-search/owners/details', 'Advanced Search - Owners Details'),
    (NEWID(), 'page', '/advanced-search/rental-market', 'Advanced Search - Rental Market'),
    (NEWID(), 'page', '/advanced-search/rental-market/comparison', 'Advanced Search - Rental Market Comparison'),
    (NEWID(), 'page', '/advanced-search/rental-market/smart-search', 'Advanced Search - Smart Search'),
    (NEWID(), 'page', '/advanced-search/rental-market/detailed-indicator', 'Advanced Search - Detailed Indicator'),
    (NEWID(), 'page', '/advanced-search/ads/offerings', 'Advanced Search - Ads Offerings'),
    (NEWID(), 'page', '/advanced-search/ads-supply-market', 'Advanced Search - Ads Supply Market');

-- Seed admin role permission
INSERT INTO "permission" ("id", "type", "name", "description")
VALUES (NEWID(), 'role', 'admin', 'Administrator with full access to user management');

