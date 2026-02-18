-- =============================================================================
-- Migration: Add Filter Sharing Feature
-- Date: 2026-01-11
-- Description: Adds visibility and sharing capabilities to filters
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1: Add new columns to x_filter table
-- -----------------------------------------------------------------------------

-- Add created_by column to track filter ownership
ALTER TABLE social_media.x_filter
ADD created_by VARCHAR(36) NULL;
GO

-- Add visibility column for filter access control
ALTER TABLE social_media.x_filter
ADD visibility VARCHAR(20) NOT NULL DEFAULT 'private';
GO

-- Add constraint to validate visibility values
ALTER TABLE social_media.x_filter
ADD CONSTRAINT CK_x_filter_visibility 
CHECK (visibility IN ('private', 'public', 'shared'));
GO

-- -----------------------------------------------------------------------------
-- Step 2: Create x_filter_share table for user-specific sharing
-- -----------------------------------------------------------------------------

CREATE TABLE social_media.x_filter_share
(
    id          BIGINT IDENTITY PRIMARY KEY,
    filter_id   BIGINT NOT NULL,
    user_id     VARCHAR(36) NOT NULL,    -- References better-auth user.id
    created_at  DATETIME NOT NULL DEFAULT GETDATE(),
    deleted_at  DATETIME NULL,
    CONSTRAINT FK_filter_share_filter FOREIGN KEY (filter_id) 
        REFERENCES social_media.x_filter(id) ON DELETE CASCADE
);
GO

-- Create indexes for efficient querying
CREATE INDEX IX_filter_share_filter_id ON social_media.x_filter_share (filter_id);
GO

CREATE INDEX IX_filter_share_user_id ON social_media.x_filter_share (user_id);
GO

-- Create unique constraint to prevent duplicate shares
CREATE UNIQUE INDEX IX_filter_share_unique 
ON social_media.x_filter_share (filter_id, user_id) 
WHERE deleted_at IS NULL;
GO

-- -----------------------------------------------------------------------------
-- Step 3: Create index on x_filter for visibility-based queries
-- -----------------------------------------------------------------------------

CREATE INDEX IX_x_filter_visibility ON social_media.x_filter (visibility);
GO

CREATE INDEX IX_x_filter_created_by ON social_media.x_filter (created_by);
GO

-- =============================================================================
-- Rollback Script (run if migration needs to be reverted)
-- =============================================================================
/*
-- Drop indexes
DROP INDEX IF EXISTS IX_x_filter_created_by ON social_media.x_filter;
DROP INDEX IF EXISTS IX_x_filter_visibility ON social_media.x_filter;
DROP INDEX IF EXISTS IX_filter_share_unique ON social_media.x_filter_share;
DROP INDEX IF EXISTS IX_filter_share_user_id ON social_media.x_filter_share;
DROP INDEX IF EXISTS IX_filter_share_filter_id ON social_media.x_filter_share;

-- Drop x_filter_share table
DROP TABLE IF EXISTS social_media.x_filter_share;

-- Drop constraint and columns from x_filter
ALTER TABLE social_media.x_filter DROP CONSTRAINT IF EXISTS CK_x_filter_visibility;
ALTER TABLE social_media.x_filter DROP COLUMN IF EXISTS visibility;
ALTER TABLE social_media.x_filter DROP COLUMN IF EXISTS created_by;
*/
