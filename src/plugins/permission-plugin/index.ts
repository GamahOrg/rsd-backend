import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, APIError, sessionMiddleware } from "better-auth/api";

// Types for the pages endpoint response
interface PermissionRecord {
  id: string;
  type: string;
  name: string;
  labelAr: string | null;
  displayOrder: number | null;
  autoEnable: boolean | null;
  parentPermissionId: string | null;
  enablesWith: string | null;
  paths: string | null;
  hidden: boolean | null;
}

export interface PagePermission {
  id: string;
  name: string;
  type: string;
  labelAr: string;
  displayOrder: number;
  autoEnable: boolean;
  parentPermissionId: string | null;
  enablesWith: string | null;
  paths: string[];
  children: PagePermission[];
  writeAccess: PagePermission[];
}

export const permissionPlugin = () => {
  return {
    id: "permission",
    schema: {
      // Permission lookup table - contains all available permissions
      permission: {
        fields: {
          type: {
            type: "string",
            required: true,
          },
          name: {
            type: "string",
            required: true,
          },
          description: {
            type: "string",
            required: false,
          },
          displayOrder: {
            type: "number",
            required: false,
          },
          autoEnable: {
            type: "boolean",
            required: false,
          },
          parentPermissionId: {
            type: "string",
            required: false,
            references: {
              model: "permission",
              field: "id",
            },
          },
          labelAr: {
            type: "string",
            required: false,
          },
          enablesWith: {
            type: "string",
            required: false,
            references: {
              model: "permission",
              field: "id",
            },
          },
          paths: {
            type: "string",
            required: false,
          },
          hidden: {
            type: "boolean",
            required: false,
          },
        },
      },
      // User permissions - links users to permissions
      userPermission: {
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
          permissionId: {
            type: "string",
            required: true,
            references: {
              model: "permission",
              field: "id",
              onDelete: "cascade",
            },
          },
        },
      },
    },
    endpoints: {
      // GET /api/auth/session/verify - Verify session token from cookie
      verifySession: createAuthEndpoint(
        "/session/verify",
        {
          method: "GET",
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              operationId: "verifySession",
              description: "Verify a session token from cookie.",
              responses: {
                200: {
                  description: "Session is valid",
                },
                401: {
                  description: "Unauthorized - Invalid or expired session",
                },
              },
            },
          },
        },
        async (ctx) => {
          const session = ctx.context.session;

          if (!session || !session.user)
            throw new APIError("UNAUTHORIZED", {
              message: "No valid session found",
            });

          return ctx.json({ valid: true });
        },
      ),

      // Get permissions for the current authenticated user
      getMyPermissions: createAuthEndpoint(
        "/permission/me",
        {
          method: "GET",
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              operationId: "getMyPermissions",
              description: "Get all permissions for the currently authenticated user.",
              security: [{ bearerAuth: [] }],
              responses: {
                200: {
                  description: "Permissions retrieved successfully.",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          permissions: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                type: { type: "string" },
                                value: { type: "string" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                401: {
                  description: "Unauthorized - No valid session found.",
                },
              },
            },
          },
        },
        async (ctx) => {
          const session = ctx.context.session;

          if (!session || !session.user) {
            throw new APIError("UNAUTHORIZED", {
              message: "No valid session found",
            });
          }

          const { adapter } = ctx.context;

          // Get user permissions with permission details including paths
          const userPermissions = await adapter.findMany<{
            id: string;
            userId: string;
            permissionId: string;
            permission: {
              id: string;
              type: string;
              name: string;
              paths: string | null;
              hidden: boolean | null;
            };
          }>({
            model: "userPermission",
            join: {
              permission: true,
            },
            where: [
              {
                field: "userId",
                value: session.user.id,
              },
            ],
          });

          // Check if user has any non-hidden permission (for hidden page access)
          const hasAnyVisiblePermission = userPermissions.some(
            (p) => p.permission.type === "page" && !p.permission.hidden,
          );

          // Get hidden pages if user has any visible permission
          let hiddenPagePaths: string[] = [];
          if (hasAnyVisiblePermission) {
            const hiddenPages = await adapter.findMany<{
              paths: string | null;
            }>({
              model: "permission",
              where: [
                { field: "type", value: "page" },
                { field: "hidden", value: true },
              ],
            });
            hiddenPagePaths = hiddenPages.flatMap((p) => (p.paths ? JSON.parse(p.paths) : []));
          }

          // Build permissions response with paths
          const permissions = userPermissions.map((p) => ({
            id: p.permission.id,
            type: p.permission.type,
            value: p.permission.name,
            paths: p.permission.paths ? JSON.parse(p.permission.paths) : [],
          }));

          // Collect all accessible paths for easy frontend authorization
          const allAccessiblePaths = [...permissions.flatMap((p) => p.paths), ...hiddenPagePaths];

          return ctx.json({
            nationalId: session.user.nationalId,
            permissions,
            allAccessiblePaths, // Flat array of all paths user can access
          });
        },
      ),

      // GET /api/auth/pages - Get all page permissions with hierarchy for admin UI
      getPages: createAuthEndpoint(
        "/pages",
        {
          method: "GET",
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              operationId: "getPages",
              description:
                "Get all page permissions with hierarchy structure for the permissions management UI.",
              security: [{ bearerAuth: [] }],
              responses: {
                200: {
                  description: "Pages retrieved successfully.",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          pages: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                id: { type: "string" },
                                name: { type: "string" },
                                type: { type: "string" },
                                labelAr: { type: "string" },
                                displayOrder: { type: "number" },
                                autoEnable: { type: "boolean" },
                                paths: {
                                  type: "array",
                                  items: { type: "string" },
                                },
                                children: { type: "array" },
                                writeAccess: { type: "array" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                401: {
                  description: "Unauthorized - No valid session found.",
                },
              },
            },
          },
        },
        async (ctx) => {
          const session = ctx.context.session;

          if (!session || !session.user) {
            throw new APIError("UNAUTHORIZED", {
              message: "No valid session found",
            });
          }

          const { adapter } = ctx.context;

          // Get all page and write_access permissions with metadata (exclude hidden)
          const allPermissions = await adapter.findMany<PermissionRecord>({
            model: "permission",
            where: [
              {
                field: "hidden",
                operator: "ne",
                value: true,
              },
            ],
          });

          // Filter to only include permissions with displayOrder (new consolidated ones)
          const permissionsWithOrder = allPermissions.filter(
            (p) => p.displayOrder !== null && (p.type === "page" || p.type === "write_access"),
          );

          // Build nested structure
          const parentPages: PagePermission[] = [];
          const childrenMap = new Map<string, PagePermission[]>();
          const writeAccessMap = new Map<string, PagePermission[]>();

          // First pass: identify all permissions and group by parent
          for (const perm of permissionsWithOrder) {
            const pagePermission: PagePermission = {
              id: perm.id,
              name: perm.name,
              type: perm.type,
              labelAr: perm.labelAr || perm.name,
              displayOrder: perm.displayOrder || 0,
              autoEnable: perm.autoEnable || false,
              parentPermissionId: perm.parentPermissionId,
              enablesWith: perm.enablesWith,
              paths: perm.paths ? JSON.parse(perm.paths) : [],
              children: [],
              writeAccess: [],
            };

            if (perm.parentPermissionId) {
              // This is a child permission
              if (perm.type === "write_access") {
                // Add to writeAccess map
                const existing = writeAccessMap.get(perm.parentPermissionId) || [];
                existing.push(pagePermission);
                writeAccessMap.set(perm.parentPermissionId, existing);
              } else {
                // Add to children map
                const existing = childrenMap.get(perm.parentPermissionId) || [];
                existing.push(pagePermission);
                childrenMap.set(perm.parentPermissionId, existing);
              }
            } else if (perm.type === "page") {
              // This is a parent page (no parentPermissionId)
              parentPages.push(pagePermission);
            }
          }

          // Second pass: attach children and writeAccess to parents
          for (const parent of parentPages) {
            parent.children = (childrenMap.get(parent.id) || []).sort(
              (a, b) => a.displayOrder - b.displayOrder,
            );
            parent.writeAccess = (writeAccessMap.get(parent.id) || []).sort(
              (a, b) => a.displayOrder - b.displayOrder,
            );
          }

          // Sort parent pages by displayOrder
          parentPages.sort((a, b) => a.displayOrder - b.displayOrder);

          return ctx.json({
            pages: parentPages,
          });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
