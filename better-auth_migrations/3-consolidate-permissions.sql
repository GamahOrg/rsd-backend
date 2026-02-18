-- Migration: Consolidate permissions into logical groups
-- Date: 2026-01-26
-- Note: Run AFTER add-permission-metadata.sql
-- Note: Existing user permissions will be migrated manually via UI

-- First, insert parent permissions (no parentPermissionId)
-- These must be inserted first so children can reference them

-- 1. home
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'home',
    'Homepage',
    N'الصفحة الرئيسية',
    1,
    1,
    '["/"]',
    0
);
GO

-- 2. cities
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'cities',
    'Cities page',
    N'صفحة المدن',
    2,
    1,
    '["/cities", "/cities/:city"]',
    0
);
GO

-- 3. reports
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'reports',
    'Monthly Report',
    N'التقرير الشهري',
    3,
    0,
    '["/reports"]',
    0
);
GO

-- 4. lifted-suspension
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'lifted-suspension',
    'Lifted Suspension Areas',
    N'المناطق المرفوع عنها الإيقاف',
    4,
    0,
    '["/lifted-suspension", "/lifted-suspension/deals", "/lifted-suspension/indicator", "/lifted-suspension/offerings", "/lifted-suspension/offerings/:id", "/lifted-suspension/summary"]',
    0
);
GO

-- 5. advanced-search (PARENT)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'advanced-search',
    'Advanced Search',
    N'البحث المتقدم',
    5,
    0,
    '["/advanced-search"]',
    0
);
GO

-- 12. social-media (PARENT) - Insert early so children can reference it
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'social-media',
    'Social Media Monitoring Service',
    N'خدمة الرصد الإعلامي',
    12,
    0,
    '["/social-media", "/social-media/accounts", "/social-media/posts", "/social-media/settings", "/social-media/statistics", "/user", "/post/:id"]',
    0
);
GO

-- 14. rer
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'rer',
    'Real Estate Registry',
    N'السجل العقاري',
    14,
    0,
    '["/rer", "/rer/maps"]',
    0
);
GO

-- 15. about (HIDDEN)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'about',
    'About the Platform',
    N'عن المنصة',
    15,
    0,
    '["/about", "/methodologies", "/frequently-questions"]',
    1
);
GO

-- 16. user-profile (HIDDEN)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden)
VALUES (
    NEWID(),
    'page',
    'user-profile',
    'User Profile',
    N'الملف الشخصي',
    16,
    0,
    '["/user-profile"]',
    1
);
GO

-- Now insert children of advanced-search
-- 6. live-deals (child of advanced-search)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden, parentPermissionId)
SELECT
    NEWID(),
    'page',
    'live-deals',
    'Live Deals',
    N'الصفقات المباشرة',
    6,
    0,
    '["/advanced-search/live", "/advanced-search/live/details"]',
    0,
    id
FROM permission WHERE name = 'advanced-search' AND type = 'page';
GO

-- 7. deals (child of advanced-search, autoEnable=1)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden, parentPermissionId)
SELECT
    NEWID(),
    'page',
    'deals',
    'Sales Deals',
    N'الصفقات البيعية',
    7,
    1,
    '["/advanced-search/deals"]',
    0,
    id
FROM permission WHERE name = 'advanced-search' AND type = 'page';
GO

-- 8. maps (child of advanced-search)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden, parentPermissionId)
SELECT
    NEWID(),
    'page',
    'maps',
    'Heat Maps',
    N'الخرائط الحرارية',
    8,
    0,
    '["/advanced-search/maps"]',
    0,
    id
FROM permission WHERE name = 'advanced-search' AND type = 'page';
GO

-- 9. owners (child of advanced-search)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden, parentPermissionId)
SELECT
    NEWID(),
    'page',
    'owners',
    'Owners',
    N'الملاك',
    9,
    0,
    '["/advanced-search/owners", "/advanced-search/owners/details"]',
    0,
    id
FROM permission WHERE name = 'advanced-search' AND type = 'page';
GO

-- 10. ads (child of advanced-search)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden, parentPermissionId)
SELECT
    NEWID(),
    'page',
    'ads',
    'Real Estate Offerings',
    N'المعروض العقاري',
    10,
    0,
    '["/advanced-search/ads", "/advanced-search/ads/offerings", "/advanced-search/ads/summary"]',
    0,
    id
FROM permission WHERE name = 'advanced-search' AND type = 'page';
GO

-- 11. rental-market (child of advanced-search, autoEnable=1)
INSERT INTO permission (id, type, name, description, labelAr, displayOrder, autoEnable, paths, hidden, parentPermissionId)
SELECT
    NEWID(),
    'page',
    'rental-market',
    'Rental Market',
    N'السوق الإيجاري',
    11,
    1,
    '["/advanced-search/rental-market", "/advanced-search/rental-market/comparison", "/advanced-search/rental-market/detailed-indicator", "/advanced-search/rental-market/smart-search"]',
    0,
    id
FROM permission WHERE name = 'advanced-search' AND type = 'page';
GO

-- 13. Update existing social_media_contexts write_access permission
-- Set its parent to social-media and add enablesWith dependency
UPDATE permission
SET 
    parentPermissionId = (SELECT id FROM permission WHERE name = 'social-media' AND type = 'page'),
    enablesWith = (SELECT id FROM permission WHERE name = 'social-media' AND type = 'page'),
    labelAr = N'إدارة المحاور',
    displayOrder = 13,
    hidden = 0
WHERE name = 'social_media_contexts' AND type = 'write_access';
GO

-- Verify the results
SELECT 
    id,
    type,
    name,
    labelAr,
    displayOrder,
    autoEnable,
    hidden,
    parentPermissionId,
    enablesWith,
    LEFT(paths, 50) as paths_preview
FROM permission 
WHERE displayOrder IS NOT NULL
ORDER BY displayOrder;
GO
