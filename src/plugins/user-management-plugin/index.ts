/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BetterAuthOptions, BetterAuthPlugin, DBAdapter, User } from "better-auth";
import { createAuthEndpoint, APIError, sessionMiddleware } from "better-auth/api";
import { randomUUID } from "crypto";
import { z } from "zod";
import { AuthUser } from "../../types/auth-user";
import i18next from "i18next";

// Helper function to get translation function based on request language
function getTranslation(headers: Headers | undefined) {
  if (!headers) return i18next.t;
  const acceptLanguage = headers.get("accept-language") || "ar";
  // Extract language code (e.g., "en-US" -> "en", "ar" -> "ar")
  const language = acceptLanguage.split(",")[0]?.split("-")[0]?.trim() || "ar";
  i18next.changeLanguage(language);
  return i18next.t;
}

// Admin permission check function
async function checkAdminPermission(
  userId: string,
  adapter: DBAdapter<BetterAuthOptions>,
  t: (key: string) => string,
) {
  // Check if user has admin permission
  const userPermissions = await adapter.findMany<{
    id: string;
    userId: string;
    permissionId: string;
    permission: {
      type: string;
      name: string;
    };
  }>({
    model: "userPermission",
    where: [
      {
        field: "userId",
        value: userId,
      },
    ],
    join: {
      permission: true,
    },
  });

  const hasAdminPermission = userPermissions.some(
    (p: { permission: { type: string; name: string } }) =>
      p.permission.type === "role" && p.permission.name === "admin",
  );

  if (!hasAdminPermission) {
    throw new APIError("FORBIDDEN", {
      message: t("userManagement.errors.adminPermissionRequired"),
    });
  }
}

// Utility function to log user history
async function logUserHistory(
  adapter: { create: (params: any) => Promise<any> },
  userId: string,
  action: string,
  actionType: string,
  actionMaker: string,
  previousValue?: string,
  newValue?: string,
) {
  await adapter.create({
    model: "userHistory",
    data: {
      userId,
      action,
      actionType,
      actionMaker,
      previousValue: previousValue || null,
      newValue: newValue || null,
      createdAt: new Date(),
    },
  });
}

export const userManagementPlugin = () => {
  return {
    id: "user-management",
    schema: {
      user: {
        fields: {
          status: {
            type: "string",
            required: true,
          },
          emailVerified: {
            type: "boolean",
            required: true,
          },
          email: {
            type: "string",
            required: true,
          },
          nationalId: {
            type: "string",
            required: true,
          },
          firstName: {
            type: "string",
            required: true,
          },
          fatherName: {
            type: "string",
            required: true,
          },
          grandName: {
            type: "string",
            required: true,
          },
          familyName: {
            type: "string",
            required: true,
          },
          fullName: {
            type: "string",
            required: true,
          },
          gender: {
            type: "string",
            required: true,
          },
          nationality: {
            type: "string",
            required: true,
          },
          language: {
            type: "string",
            required: true,
          },
          idIssueDate: {
            type: "string",
            required: true,
          },
          idExpiryDate: {
            type: "string",
            required: true,
          },
          birthDateG: {
            type: "string",
            required: true,
          },
          birthDateH: {
            type: "string",
            required: true,
          },
        },
      },
      userHistory: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
              onDelete: "cascade",
            },
          },
          action: {
            type: "string",
            required: true,
          },
          actionType: {
            type: "string",
            required: true,
          },
          actionMaker: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
            },
          },
          previousValue: {
            type: "string",
            required: false,
          },
          newValue: {
            type: "string",
            required: false,
          },
          createdAt: {
            type: "date",
            required: true,
          },
        },
      },
    },
    endpoints: {
      // GET /api/auth/admin/users - Get all users with optional search and pagination
      getAllUsers: createAuthEndpoint(
        "/admin/users",
        {
          method: "GET",
          use: [sessionMiddleware],
          query: z.object({
            query: z.string().optional(),
            page: z.string().optional().default("1"),
            limit: z.string().optional().default("20"),
          }),
          metadata: {
            openapi: {
              operationId: "getAllUsers",
              description:
                "Get all users with optional search by name or national ID and pagination",
              security: [{ bearerAuth: [] }],
              responses: {
                200: {
                  description: "Users retrieved successfully",
                },
                401: {
                  description: "Unauthorized - No valid session found",
                },
                403: {
                  description: "Forbidden - Admin permission required",
                },
              },
            },
          },
        },
        async (ctx) => {
          const { adapter, session } = ctx.context;
          const t = getTranslation(ctx.request?.headers);
          await checkAdminPermission(session.user.id, adapter, t);

          const query = ctx.query.query;
          const page = Math.max(parseInt(ctx.query.page || "1"), 1);
          const limit = Math.min(Math.max(parseInt(ctx.query.limit || "20"), 1), 100); // Max 100 per page
          const offset = (page - 1) * limit;

          // If no search query, return all users with pagination
          if (!query || query.trim() === "") {
            // Use count method for efficient total counting
            const total = await adapter.count({
              model: "user",
            });

            const totalPages = Math.ceil(total / limit);

            // Get paginated results
            const paginatedUsers = (await adapter.findMany({
              model: "user",
              limit,
              offset,
            })) as (User & AuthUser)[];

            return ctx.json({
              users: paginatedUsers.map((user) => ({
                id: user.id,
                nationalId: user.nationalId || "N/A",
                fullName: user.fullName || "N/A",
                email: user.email,
                status: user.status || "pending",
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
              })),
              pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1,
              },
            });
          }

          // If search query provided, filter users
          const searchTerm = query.toLowerCase();

          // Use count method for efficient total counting
          const total = await adapter.count({
            model: "user",
            where: [
              {
                field: "fullName",
                value: searchTerm,
                connector: "OR",
                operator: "contains",
              },
              {
                field: "nationalId",
                value: searchTerm,
                connector: "OR",
                operator: "contains",
              },
            ],
          });

          const totalPages = Math.ceil(total / limit);

          // Get paginated results
          const paginatedUsers = (await adapter.findMany({
            model: "user",
            where: [
              {
                field: "fullName",
                value: searchTerm,
                connector: "OR",
                operator: "contains",
              },
              {
                field: "nationalId",
                value: searchTerm,
                connector: "OR",
                operator: "contains",
              },
            ],
            limit,
            offset,
          })) as (User & AuthUser)[];

          // Return matching users with pagination info
          return ctx.json({
            users: paginatedUsers.map((user) => ({
              id: user.id,
              nationalId: user.nationalId || "N/A",
              fullName: user.fullName || "N/A",
              email: user.email,
              status: user.status || "pending",
              emailVerified: user.emailVerified,
              createdAt: user.createdAt,
            })),
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1,
            },
          });
        },
      ),

      // GET /api/auth/admin/users/:userId - Get user details
      getUserDetails: createAuthEndpoint(
        "/admin/users/:userId",
        {
          method: "GET",
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              operationId: "getUserDetails",
              description: "Get detailed user information with permissions",
              security: [{ bearerAuth: [] }],
            },
          },
        },
        async (ctx) => {
          const { adapter, session, internalAdapter } = ctx.context;
          const t = getTranslation(ctx.request?.headers);
          await checkAdminPermission(session.user.id, adapter, t);

          const user = (await internalAdapter.findUserById(ctx.params.userId)) as User & AuthUser;
          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: t("userManagement.errors.userNotFound"),
            });
          }

          // Get all available pages (permissions with type='page')
          const allPages = await adapter.findMany<{
            id: string;
            name: string;
            description: string;
          }>({
            model: "permission",
            where: [
              {
                field: "type",
                value: "page",
              },
            ],
          });

          // Get all available write_access permissions
          const allWriteAccessPermissions = await adapter.findMany<{
            id: string;
            name: string;
            description: string;
          }>({
            model: "permission",
            where: [
              {
                field: "type",
                value: "write_access",
              },
            ],
          });

          // Get user's assigned permissions
          const userPermissions = await adapter.findMany<{
            id: string;
            userId: string;
            permissionId: string;
            permission: {
              type: string;
              name: string;
            };
          }>({
            model: "userPermission",
            where: [
              {
                field: "userId",
                value: user.id,
              },
            ],
            join: {
              permission: true,
            },
          });

          const userPermissionIds = userPermissions.map(
            (up: { permissionId: string }) => up.permissionId,
          );

          return ctx.json({
            user: {
              id: user.id,
              nationalId: user.nationalId || "N/A",
              fullName: user.fullName || "N/A",
              email: user.email,
              status: user.status || "pending",
              emailVerified: user.emailVerified,
              createdAt: user.createdAt,
            },
            allPages: allPages.map((p) => ({
              id: p.id,
              name: p.name,
              path: p.name, // name is the path
              description: p.description,
            })),
            allWriteAccessPermissions: allWriteAccessPermissions.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
            })),
            userPages: userPermissionIds,
          });
        },
      ),

      // POST /api/auth/admin/users - Create user
      createUser: createAuthEndpoint(
        "/admin/users",
        {
          method: "POST",
          use: [sessionMiddleware],
          body: z.object({
            nationalId: z.string(),
          }),
          metadata: {
            openapi: {
              operationId: "createUser",
              description: "Create a new user with inactive status",
              security: [{ bearerAuth: [] }],
            },
          },
        },
        async (ctx) => {
          const { adapter, session, internalAdapter } = ctx.context;
          const t = getTranslation(ctx.request?.headers);
          // Check admin permission
          await checkAdminPermission(session!.user.id, adapter, t);

          const { nationalId } = ctx.body;

          if (!nationalId) {
            throw new APIError("BAD_REQUEST", {
              message: t("userManagement.errors.nationalIdRequired"),
            });
          }

          // Check if user already exists
          const existingUser = await internalAdapter.findUserByEmail(`${nationalId}@email.com`);
          if (existingUser) {
            throw new APIError("BAD_REQUEST", {
              message: t("userManagement.errors.userAlreadyExists"),
            });
          }

          // Create new user
          const newUser = await internalAdapter.createUser({
            name: "N/A",
            email: `${nationalId}@email.com`,
            emailVerified: false,
            nationalId,
            status: "pending",
          });

          // Log user creation - use newUser.id to ensure we reference the created user
          try {
            await logUserHistory(
              adapter,
              newUser.id,
              t("userManagement.history.userCreated"),
              "user_created",
              session!.user.id,
              undefined,
              JSON.stringify({ nationalId, status: "pending" }),
            );
          } catch (historyError) {
            // Log the error but don't fail the user creation
            console.error("Failed to log user creation history:", historyError);
          }

          // Auto-enable default pages for new users
          try {
            const autoEnablePages = await adapter.findMany<{
              id: string;
              name: string;
              parentPermissionId: string | null;
            }>({
              model: "permission",
              where: [
                { field: "type", value: "page" },
                { field: "autoEnable", value: true },
              ],
            });

            // Collect parent permission IDs that need to be enabled
            const parentPermissionIds = new Set<string>();

            for (const page of autoEnablePages) {
              // Enable the page itself
              await adapter.create({
                model: "userPermission",
                data: {
                  id: randomUUID(),
                  userId: newUser.id,
                  permissionId: page.id,
                },
              });

              // If this page has a parent, add it to the set
              if (page.parentPermissionId) {
                parentPermissionIds.add(page.parentPermissionId);
              }
            }

            // Enable parent permissions (e.g., advanced-search when deals/rental-market are enabled)
            for (const parentId of parentPermissionIds) {
              // Check if parent permission is already assigned (avoid duplicates)
              const existingParentPermission = await adapter.findMany({
                model: "userPermission",
                where: [
                  { field: "userId", value: newUser.id },
                  { field: "permissionId", value: parentId },
                ],
              });

              if (existingParentPermission.length === 0) {
                await adapter.create({
                  model: "userPermission",
                  data: {
                    id: randomUUID(),
                    userId: newUser.id,
                    permissionId: parentId,
                  },
                });
              }
            }

            if (autoEnablePages.length > 0) {
              console.log(
                `Auto-enabled ${autoEnablePages.length} default pages for user ${newUser.id}`,
              );
              if (parentPermissionIds.size > 0) {
                console.log(
                  `Auto-enabled ${parentPermissionIds.size} parent permissions for user ${newUser.id}`,
                );
              }
            }
          } catch (autoEnableError) {
            // Log the error but don't fail the user creation
            console.error("Failed to auto-enable default pages:", autoEnableError);
          }

          return ctx.json({
            message: t("userManagement.messages.userCreated"),
            user: {
              id: newUser.id,
              nationalId: newUser.nationalId,
              status: newUser.status,
            },
          });
        },
      ),

      // POST /api/auth/admin/users/:userId - Update user
      updateUserDetails: createAuthEndpoint(
        "/admin/users/:userId",
        {
          method: "POST",
          use: [sessionMiddleware],
          body: z.object({
            status: z.enum(["active", "inactive", "pending"]).optional(),
            permissionIds: z.array(z.uuid()).optional(),
          }),
          metadata: {
            openapi: {
              operationId: "updateUser",
              description: "Update user status and/or permissions",
              security: [{ bearerAuth: [] }],
            },
          },
        },
        async (ctx) => {
          const { adapter, session, internalAdapter } = ctx.context;
          const t = getTranslation(ctx.request?.headers);

          // Check admin permission
          await checkAdminPermission(session!.user.id, adapter, t);

          const { status, permissionIds } = ctx.body;

          // Validate that at least one field is being updated
          if (!status && !permissionIds) {
            throw new APIError("BAD_REQUEST", {
              message: t("userManagement.errors.fieldRequired"),
            });
          }

          // Fetch user
          const user = (await internalAdapter.findUserById(ctx.params.userId)) as User & AuthUser;

          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: t("userManagement.errors.userNotFound"),
            });
          }

          // Prevent self-modification of status or permissions
          if (user.id === session!.user.id) {
            throw new APIError("BAD_REQUEST", {
              message: t("userManagement.errors.cannotModifySelf"),
            });
          }

          try {
            // Update status if provided
            if (status !== undefined) {
              // Only update if status actually changed
              if (status !== user.status) {
                // Log status change BEFORE updating
                await logUserHistory(
                  adapter,
                  user.id,
                  t("userManagement.history.statusUpdated"),
                  "status_update",
                  session!.user.id,
                  user.status || "none",
                  status,
                );

                await internalAdapter.updateUser(user.id, { status });
              }
            }

            // Update permissions if provided
            if (permissionIds !== undefined) {
              // Get current permissions (only page type)
              const currentPermissions = await adapter.findMany<{
                id: string;
                userId: string;
                permissionId: string;
                permission: {
                  id: string;
                  type: string;
                  name: string;
                };
              }>({
                model: "userPermission",
                where: [{ field: "userId", value: user.id }],
                join: {
                  permission: true,
                },
              });

              // Separate page and write_access permissions from role permissions
              const pagePermissions = currentPermissions.filter(
                (p: { permission: { type: string } }) => p.permission.type === "page",
              );
              const writeAccessPermissions = currentPermissions.filter(
                (p: { permission: { type: string } }) => p.permission.type === "write_access",
              );
              const rolePermissions = currentPermissions.filter(
                (p: { permission: { type: string } }) => p.permission.type === "role",
              );

              const currentPagePermissionIds = pagePermissions.map(
                (p: { permissionId: string }) => p.permissionId,
              );
              const currentWriteAccessPermissionIds = writeAccessPermissions.map(
                (p: { permissionId: string }) => p.permissionId,
              );
              const currentManageablePermissionIds = [
                ...currentPagePermissionIds,
                ...currentWriteAccessPermissionIds,
              ];

              // Validate that all provided permission IDs exist and are of type 'page' or 'write_access'
              if (permissionIds.length > 0) {
                // Get all manageable permissions (page and write_access)
                const allPagePermissions = await adapter.findMany<{
                  id: string;
                  type: string;
                }>({
                  model: "permission",
                  where: [{ field: "type", value: "page" }],
                });

                const allWriteAccessPermissions = await adapter.findMany<{
                  id: string;
                  type: string;
                }>({
                  model: "permission",
                  where: [{ field: "type", value: "write_access" }],
                });

                const validPermissionIds = new Set([
                  ...allPagePermissions.map((p: { id: string }) => p.id),
                  ...allWriteAccessPermissions.map((p: { id: string }) => p.id),
                ]);

                // Check if all provided permission IDs are valid
                const invalidIds = permissionIds.filter((id) => !validPermissionIds.has(id));
                if (invalidIds.length > 0) {
                  throw new APIError("BAD_REQUEST", {
                    message: t("userManagement.errors.invalidPermissionIds", {
                      ids: invalidIds.join(", "),
                    }),
                  });
                }
              }

              // Check if this is the last admin and permissions are being removed
              const isAdmin = rolePermissions.some(
                (p: { permission: { name: string } }) => p.permission.name === "admin",
              );

              if (isAdmin) {
                // Count total active admins
                const allAdminPermissions = await adapter.findMany<{
                  userId: string;
                  permission: { name: string };
                }>({
                  model: "userPermission",
                  join: {
                    permission: true,
                  },
                });

                const activeAdminUserIds = new Set(
                  allAdminPermissions
                    .filter((p: { permission: { name: string } }) => p.permission.name === "admin")
                    .map((p: { userId: string }) => p.userId),
                );

                // If this is the last admin, prevent permission changes that might lock out system
                if (activeAdminUserIds.size === 1 && activeAdminUserIds.has(user.id)) {
                  console.warn(`Attempted to modify permissions of last admin user (${user.id})`);
                  // We'll allow it but log a warning - you might want to throw an error instead
                }
              }

              // === Dependency Resolution ===
              // Handle enablesWith dependencies (e.g., contexts -> social-media)
              let resolvedPermissionIds = [...permissionIds];

              // 1. When adding a permission with enablesWith, also add the parent
              const permissionsBeingAdded = permissionIds.filter(
                (id) => !currentManageablePermissionIds.includes(id),
              );

              if (permissionsBeingAdded.length > 0) {
                // Get permissions with enablesWith dependency
                const permissionsWithDeps = await adapter.findMany<{
                  id: string;
                  enablesWith: string | null;
                }>({
                  model: "permission",
                });

                for (const permId of permissionsBeingAdded) {
                  const perm = permissionsWithDeps.find((p) => p.id === permId);
                  if (perm?.enablesWith && !resolvedPermissionIds.includes(perm.enablesWith)) {
                    // Add the parent permission that this depends on
                    resolvedPermissionIds.push(perm.enablesWith);
                    console.log(
                      `Auto-adding permission ${perm.enablesWith} due to enablesWith dependency`,
                    );
                  }
                }
              }

              // 2. When removing a permission, also remove permissions that depend on it
              const permissionsBeingRemoved = currentManageablePermissionIds.filter(
                (id) => !permissionIds.includes(id),
              );

              if (permissionsBeingRemoved.length > 0) {
                // Get permissions that depend on the ones being removed
                const allPermissions = await adapter.findMany<{
                  id: string;
                  enablesWith: string | null;
                }>({
                  model: "permission",
                });

                for (const removedId of permissionsBeingRemoved) {
                  // Find permissions that have enablesWith pointing to the removed permission
                  const dependentPerms = allPermissions.filter((p) => p.enablesWith === removedId);
                  for (const depPerm of dependentPerms) {
                    // Remove from resolved list if present
                    resolvedPermissionIds = resolvedPermissionIds.filter((id) => id !== depPerm.id);
                    console.log(
                      `Auto-removing permission ${depPerm.id} due to parent ${removedId} being removed`,
                    );
                  }
                }
              }

              // Calculate permission changes for efficiency (using resolved IDs)
              const permissionsToAdd = resolvedPermissionIds.filter(
                (id) => !currentManageablePermissionIds.includes(id),
              );
              const permissionsToRemove = currentManageablePermissionIds.filter(
                (id) => !resolvedPermissionIds.includes(id),
              );

              // Only proceed if there are actual changes
              if (permissionsToAdd.length > 0 || permissionsToRemove.length > 0) {
                // Remove permissions that are no longer needed
                if (permissionsToRemove.length > 0) {
                  // Delete each permission individually to avoid SQL Server array issues
                  for (const permissionId of permissionsToRemove) {
                    await adapter.deleteMany({
                      model: "userPermission",
                      where: [
                        { field: "userId", value: user.id },
                        { field: "permissionId", value: permissionId },
                      ],
                    });
                  }
                }

                // Add new permissions
                if (permissionsToAdd.length > 0) {
                  for (const permissionId of permissionsToAdd) {
                    await adapter.create({
                      model: "userPermission",
                      data: {
                        id: randomUUID(),
                        userId: user.id,
                        permissionId,
                      },
                    });
                  }
                }

                // Log permission change (use resolved IDs to capture auto-added/removed dependencies)
                await logUserHistory(
                  adapter,
                  user.id,
                  t("userManagement.history.permissionsUpdated"),
                  "permission_update",
                  session!.user.id,
                  JSON.stringify(currentManageablePermissionIds),
                  JSON.stringify(resolvedPermissionIds),
                );
              }
            }

            return ctx.json({
              message: t("userManagement.messages.userUpdated"),
              updated: {
                status: status !== undefined && status !== user.status,
                permissions: permissionIds !== undefined,
              },
            });
          } catch (error) {
            // If it's already an APIError, rethrow it
            if (error instanceof APIError) {
              throw error;
            }

            // Log unexpected errors and throw a generic error
            console.error("Error updating user:", error);
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: t("userManagement.errors.updateFailed"),
            });
          }
        },
      ),

      // GET /api/auth/admin/users/:userId/history - Get user history with pagination
      getUserHistory: createAuthEndpoint(
        "/admin/users/:userId/history",
        {
          method: "GET",
          use: [sessionMiddleware],
          query: z.object({
            page: z.string().optional().default("1"),
            limit: z.string().optional().default("20"),
          }),
          metadata: {
            openapi: {
              operationId: "getUserHistory",
              description: "Get user modification history with pagination",
              security: [{ bearerAuth: [] }],
            },
          },
        },
        async (ctx) => {
          const { adapter, session } = ctx.context;
          const t = getTranslation(ctx.request?.headers);

          // Check admin permission
          await checkAdminPermission(session!.user.id, adapter, t);

          // Extract userId from URL path params or manually from URL
          let userId: string | undefined;

          // Try to get from params first (Better Call standard)
          if (ctx.params && "userId" in ctx.params) {
            userId = ctx.params.userId as string;
          } else {
            // Fallback: extract from URL path
            if (ctx.request) {
              const url = new URL(ctx.request.url);
              const pathParts = url.pathname.split("/");
              const historyIndex = pathParts.indexOf("history");
              if (historyIndex > 0) {
                userId = pathParts[historyIndex - 1];
              }
            }
          }

          if (!userId) {
            throw new APIError("BAD_REQUEST", {
              message: t("userManagement.errors.userIdRequired"),
            });
          }

          const page = Math.max(parseInt(ctx.query.page || "1"), 1);
          const limit = Math.min(Math.max(parseInt(ctx.query.limit || "20"), 1), 100); // Max 100 per page
          const offset = (page - 1) * limit;

          const whereClause = [
            {
              field: "userId",
              value: userId,
            },
          ];

          // Use count method for efficient total counting
          const total = await adapter.count({
            model: "userHistory",
            where: whereClause,
          });

          const totalPages = Math.ceil(total / limit);

          // Get paginated history
          const history = (await adapter.findMany({
            model: "userHistory",
            where: whereClause,
            limit,
            offset,
            sortBy: {
              field: "createdAt",
              direction: "desc",
            },
          })) as {
            id: string;
            action: string;
            actionType: string;
            actionMaker: string;
            previousValue: string;
            newValue: string;
            createdAt: Date;
          }[];

          // Get unique action maker IDs from the paginated history
          const actionMakerIds = [...new Set(history.map((h) => h.actionMaker))];

          // Get only the action makers we need
          const actionMakers = await Promise.all(
            actionMakerIds.map(async (id) => {
              const user = (await adapter.findOne({
                model: "user",
                where: [{ field: "id", value: id }],
              })) as { id: string; fullName: string } | null;
              return user;
            }),
          );

          const actionMakersMap = new Map(
            actionMakers
              .filter((am): am is { id: string; fullName: string } => am !== null)
              .map((am) => [am.id, am.fullName || "Unknown"]),
          );

          return ctx.json({
            history: history.map((h) => ({
              id: h.id,
              action: h.action,
              actionType: h.actionType,
              createdAt: h.createdAt,
              previousValue: h.previousValue,
              newValue: h.newValue,
              actionMaker: {
                id: h.actionMaker,
                fullName: actionMakersMap.get(h.actionMaker) || "Unknown",
              },
            })),
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNextPage: page < totalPages,
              hasPreviousPage: page > 1,
            },
          });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
