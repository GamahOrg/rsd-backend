import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, APIError, sessionMiddleware } from "better-auth/api";
import { jwtDecode } from "jwt-decode";
import type {
  NafathInitRequest,
  NafathCheckRequest,
  NafathCheckResponse,
  NafathUserDetails,
} from "./nafath-types";
import { getNafathToken } from "./nafath-token";
import { z } from "zod";

const APIGEE_URL = process.env.APIGEE_URL || "https://api-test.rega.gov.sa";

// Utility function to log user history
async function logUserHistory(
  adapter: {
    create: (params: { model: string; data: Record<string, unknown> }) => Promise<unknown>;
  },
  userId: string,
  action: string,
  actionType: string,
  actionMaker: string,
  previousValue?: string,
  newValue?: string,
) {
  try {
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
  } catch (error) {
    // Log the error but don't fail the main action
    console.error("Failed to log user history:", error);
  }
}

export const nafathPlugin = () => {
  return {
    id: "nafath",
    schema: {
      user: {
        fields: {
          nationalId: {
            type: "string",
            unique: true,
            required: false,
          },
          firstName: {
            type: "string",
            required: false,
          },
          fatherName: {
            type: "string",
            required: false,
          },
          grandName: {
            type: "string",
            required: false,
          },
          familyName: {
            type: "string",
            required: false,
          },
          fullName: {
            type: "string",
            required: false,
          },
          gender: {
            type: "string",
            required: false,
          },
          nationality: {
            type: "string",
            required: false,
          },
          language: {
            type: "string",
            required: false,
          },
          idIssueDate: {
            type: "string",
            required: false,
          },
          idExpiryDate: {
            type: "string",
            required: false,
          },
          birthDateG: {
            type: "string",
            required: false,
          },
          birthDateH: {
            type: "string",
            required: false,
          },
        },
      },
      loginHistory: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
            },
          },
          loginAt: {
            type: "date",
            required: true,
          },
          ipAddress: {
            type: "string",
            required: false,
          },
          userAgent: {
            type: "string",
            required: false,
          },
        },
      },
    },
    endpoints: {
      nafathInit: createAuthEndpoint(
        "/nafath/init",
        {
          method: "POST",
          body: z.object({
            nationalId: z.string().length(10),
          }),
          metadata: {
            openapi: {
              operationId: "nafathInit",
              description:
                "Initialize Nafath authentication and request a challenge for the given national ID.",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        nationalId: {
                          type: "string",
                          minLength: 10,
                          maxLength: 10,
                          description: "The 10-digit Saudi National ID",
                        },
                      },
                      required: ["nationalId"],
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: "Nafath challenge initialized successfully.",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          random: { type: "string", description: "Challenge random string" },
                          transId: {
                            type: "string",
                            description: "Transaction ID for this authentication attempt",
                          },
                        },
                        required: ["random", "transId"],
                      },
                    },
                  },
                },
                400: {
                  description: "Failed to initialize Nafath authentication",
                },
              },
            },
          },
        },
        async (ctx) => {
          const { nationalId } = ctx.body;

          const accessToken = await getNafathToken();

          const requestBody: NafathInitRequest = {
            Action: "SpRequest",
            Parameters: {
              service: "AdvancedLogin",
              id: nationalId,
            },
          };

          const response = await fetch(APIGEE_URL + "/v2/iam/nafath", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestBody),
          });
          console.log(response);

          if (!response.ok) {
            throw new APIError("BAD_REQUEST", {
              message: "Failed to initialize Nafath authentication",
            });
          }

          const data = await response.json();

          // Check if user exists and log the init attempt
          return ctx.json({
            random: data.random,
            transId: data.transId,
          });
        },
      ),

      nafathStatus: createAuthEndpoint(
        "/nafath/status",
        {
          method: "POST",
          body: z.object({
            nationalId: z.string().length(10),
            random: z.string(),
            transId: z.string(),
          }),
          metadata: {
            openapi: {
              operationId: "nafathStatus",
              description:
                "Check the status of a Nafath authentication request using the given national ID, random, and transaction ID.",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        nationalId: {
                          type: "string",
                          minLength: 10,
                          maxLength: 10,
                          description: "The 10-digit Saudi National ID",
                        },
                        random: {
                          type: "string",
                          description: "Challenge random string returned from nafathInit.",
                        },
                        transId: {
                          type: "string",
                          description: "Transaction ID returned from nafathInit.",
                        },
                      },
                      required: ["nationalId", "random", "transId"],
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: "Nafath authentication status response.",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          status: {
                            type: "string",
                            description:
                              "Status of the Nafath authentication (e.g., COMPLETED, PENDING, REJECTED).",
                          },
                          // When status is COMPLETED, other user/session info may be included in the implementation.
                        },
                        required: ["status"],
                      },
                    },
                  },
                },
                400: {
                  description: "Failed to check Nafath authentication status.",
                },
              },
            },
          },
        },
        async (ctx) => {
          const { nationalId, random, transId } = ctx.body;

          const accessToken = await getNafathToken();

          const requestBody: NafathCheckRequest = {
            Action: "CheckSpRequest",
            Parameters: {
              id: nationalId,
              random,
              transId,
            },
          };

          const response = await fetch(APIGEE_URL + "/v2/iam/nafath", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            throw new APIError("BAD_REQUEST", {
              message: "Failed to check Nafath status",
            });
          }

          const statusData: NafathCheckResponse = await response.json();

          // If not completed, return status
          if (statusData.status !== "COMPLETED")
            return ctx.json({
              status: statusData.status,
            });

          // Status is COMPLETED - get user info and create session
          if (!statusData.accessToken)
            throw new APIError("BAD_REQUEST", {
              message: "No access token received from Nafath",
            });

          // Fetch user details from Nafath
          const userInfoResponse = await fetch(`${APIGEE_URL}/v2/iam/identityServices/userInfo`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              "nafath-token": statusData.accessToken,
            },
          });

          if (!userInfoResponse.ok) {
            throw new APIError("BAD_REQUEST", {
              message: "Failed to get user details from Nafath",
            });
          }

          const jwtToken = await userInfoResponse.text();
          const userDetails = jwtDecode<NafathUserDetails>(jwtToken);

          const nafathUser = {
            nationalId: userDetails.user_info.id.toString(),
            name: userDetails.user_info["two_names#ar"],
            firstName: userDetails.user_info["first_name#ar"],
            fatherName: userDetails.user_info["father_name#ar"],
            grandName: userDetails.user_info["grand_name#ar"],
            familyName: userDetails.user_info["family_name#ar"],
            fullName: userDetails.user_info["full_name#ar"],
            gender: userDetails.user_info.gender,
            nationality: userDetails.user_info["nationality#ar"],
            idIssueDate: userDetails.user_info["id_issue_date#g"],
            idExpiryDate: userDetails.user_info["id_expiry_date#g"],
            birthDateG: userDetails.user_info["dob#g"],
            birthDateH: userDetails.user_info["dob#h"].toString(),
            language: userDetails.user_info.language,
          };

          // Find existing user - do NOT create automatically
          const { internalAdapter } = ctx.context;

          const userResult = await internalAdapter.findUserByEmail(
            `${nafathUser.nationalId}@email.com`,
          );
          const user = userResult?.user;

          // If user doesn't exist, reject login
          if (!user)
            throw new APIError("FORBIDDEN", {
              message: "لا يوجد لديك صلاحيات للدخول إلى النظام",
            });

          // Check user status
          // @ts-expect-error - user is of type BetterAuthUser
          const userStatus = user.status || "pending";

          // If user is inactive, reject login
          if (userStatus === "inactive") {
            throw new APIError("FORBIDDEN", {
              message: "الحساب معطل، يرجى التواصل مع مدير النظام",
            });
          }

          // If user is pending (first login after admin added them), activate the account
          if (userStatus === "pending") {
            await internalAdapter.updateUserByEmail(`${nafathUser.nationalId}@email.com`, {
              ...nafathUser,
              status: "active",
              emailVerified: true,
            });
          } else {
            // User is active - only update Nafath data, do NOT change status
            await internalAdapter.updateUserByEmail(`${nafathUser.nationalId}@email.com`, {
              ...nafathUser,
              emailVerified: true,
            });
          }

          // Create session
          const session = await internalAdapter.createSession(user.id);

          // Record login in history
          const { adapter } = ctx.context;
          await adapter.create({
            model: "loginHistory",
            data: {
              userId: user.id,
              loginAt: new Date(),
              ipAddress:
                ctx.request?.headers.get("x-forwarded-for") ||
                ctx.request?.headers.get("x-real-ip") ||
                null,
              userAgent: ctx.request?.headers.get("user-agent") || null,
            },
          });

          // Log successful authentication in user history
          await logUserHistory(
            adapter,
            user.id,
            "تسجيل الدخول بنجاح",
            "nafath_completed",
            user.id, // User authenticated themselves
            undefined,
            JSON.stringify({
              nationalId: nafathUser.nationalId,
              sessionId: session.id,
              loginAt: new Date(),
            }),
          );

          // Set session cookie with cross-subdomain support
          const cookieDomain = process.env.COOKIE_DOMAIN || ".rega.gov.sa";
          const cookieName = "__Secure-better-auth.session_token";
          await ctx.setSignedCookie(cookieName, session.token, ctx.context.secret, {
            secure: true,
            sameSite: "none",
            domain: cookieDomain, // Share cookie across subdomains
            path: "/",
            httpOnly: true,
          });

          return ctx.json({
            status: "COMPLETED",
            session: {
              token: session.token,
              expiresAt: session.expiresAt,
            },
          });
        },
      ),

      getLastLoginTime: createAuthEndpoint(
        "/nafath/last-login",
        {
          method: "GET",
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              operationId: "getLastLoginTime",
              description:
                "Get the last login time for the authenticated user from the login history. Returns the second most recent login (before the current one). Requires a valid session.",
              security: [
                {
                  bearerAuth: [],
                },
              ],
              responses: {
                200: {
                  description: "Last login time retrieved successfully.",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          lastLoginAt: {
                            type: "string",
                            format: "date-time",
                            description:
                              "ISO 8601 timestamp of the previous login from login history",
                            nullable: true,
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
          // Get the current session
          const session = ctx.context.session;

          if (!session || !session.user) {
            throw new APIError("UNAUTHORIZED", {
              message: "No valid session found",
            });
          }

          // Query database to get the previous login (second most recent)
          const { adapter } = ctx.context;

          // Get the last 2 logins, sorted by loginAt descending
          const recentLogins = await adapter.findMany({
            model: "loginHistory",
            limit: 2,
            sortBy: {
              field: "loginAt",
              direction: "desc",
            },
            where: [
              {
                field: "userId",
                value: session.user.id,
              },
            ],
          });

          // Return the second most recent login (index 1)
          // If there's only 1 login (current), return null
          const previousLogin = recentLogins?.[1] as { loginAt?: Date } | undefined;

          return ctx.json({
            lastLoginAt: previousLogin?.loginAt || null,
          });
        },
      ),

      extendSession: createAuthEndpoint(
        "/nafath/extend-session",
        {
          method: "GET",
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              operationId: "extendSession",
              description:
                "Extend the current session expiration time. Requires a valid session. The session will be extended by the configured session duration.",
              security: [
                {
                  bearerAuth: [],
                },
              ],
              responses: {
                200: {
                  description: "Session extended successfully.",
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          session: {
                            type: "object",
                            properties: {
                              token: {
                                type: "string",
                                description: "Session token",
                              },
                              expiresAt: {
                                type: "string",
                                format: "date-time",
                                description: "New expiration time for the session",
                              },
                            },
                            required: ["token", "expiresAt"],
                          },
                        },
                        required: ["session"],
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
          // Get the current session
          const session = ctx.context.session;
          const sessionToken = session?.session.token;

          if (!session || !session.user || !sessionToken) {
            throw new APIError("UNAUTHORIZED", {
              message: "No valid session found",
            });
          }

          const { internalAdapter, options } = ctx.context;
          const sessionDuration = options.session?.expiresIn || 2 * 60; // 2 minutes
          const newExpiresAt = new Date(Date.now() + sessionDuration * 1000);

          // Update the session expiration time using the adapter
          const updatedSessionResult = await internalAdapter.updateSession(sessionToken, {
            expiresAt: newExpiresAt,
          });

          if (!updatedSessionResult) {
            throw new APIError("BAD_REQUEST", {
              message: "Failed to extend session",
            });
          }

          return ctx.json({
            message: "Session extended successfully",
          });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
};
