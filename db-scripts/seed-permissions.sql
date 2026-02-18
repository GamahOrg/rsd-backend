DECLARE @UserId VARCHAR(36);
SELECT @UserId = id
FROM "user"
WHERE nationalId = 'ENTER_NATIONAL_ID';
-- all access
IF @UserId IS NOT NULL
    BEGIN
        INSERT INTO "userPermission" ("id", "userId", "permissionId")
        SELECT NEWID(), @UserId, p.id
        FROM "permission" p
        WHERE NOT EXISTS (SELECT 1
                          FROM "userPermission" up
                          WHERE up.userId = @UserId
                            AND up.permissionId = p.id);
    END
GO