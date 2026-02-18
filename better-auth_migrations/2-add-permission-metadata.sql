-- Migration: Add metadata columns to permission table for permissions matrix
-- Date: 2026-01-26

-- Add new columns for permission hierarchy and metadata
ALTER TABLE permission ADD displayOrder INT NULL;
GO

ALTER TABLE permission ADD autoEnable BIT NULL DEFAULT 0;
GO

ALTER TABLE permission ADD parentPermissionId VARCHAR(36) NULL;
GO

ALTER TABLE permission ADD labelAr NVARCHAR(100) NULL;
GO

ALTER TABLE permission ADD enablesWith VARCHAR(36) NULL;
GO

ALTER TABLE permission ADD paths NVARCHAR(MAX) NULL;
GO

ALTER TABLE permission ADD hidden BIT NULL DEFAULT 0;
GO

-- Add FK constraint for parent hierarchy (self-referencing)
ALTER TABLE permission ADD CONSTRAINT FK_permission_parent
    FOREIGN KEY (parentPermissionId) REFERENCES permission(id);
GO

-- Add FK constraint for enablesWith dependency (self-referencing)
ALTER TABLE permission ADD CONSTRAINT FK_permission_enablesWith
    FOREIGN KEY (enablesWith) REFERENCES permission(id);
GO

-- Create index for faster lookups by type and displayOrder
CREATE INDEX IX_permission_type_displayOrder ON permission(type, displayOrder);
GO

-- Create index for parent permission lookups
CREATE INDEX IX_permission_parentPermissionId ON permission(parentPermissionId);
GO
