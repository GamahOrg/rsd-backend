-- Add permission for managing social media contexts (محاور الرصد الإعلامي)
-- Users with this permission can create, edit, and delete media contexts
-- Users without this permission can only view and use media contexts

INSERT INTO "permission" ("id", "type", "name", "description")
VALUES (NEWID(), 'write_access', 'social_media_contexts', N'صلاحية إدارة محاور الرصد الإعلامي (إنشاء/تعديل/حذف)');
GO
