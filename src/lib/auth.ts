import { betterAuth } from "better-auth";
import { MssqlDialect } from "kysely";
import * as Tedious from "tedious";
import * as Tarn from "tarn";
import { nafathPlugin } from "../plugins/nafath-plugin";
import { permissionPlugin } from "../plugins/permission-plugin";
import { userManagementPlugin } from "../plugins/user-management-plugin";
import { openAPI } from "better-auth/plugins";

const dialect = new MssqlDialect({
  tarn: {
    ...Tarn,
    options: {
      min: 0,
      max: 10,
    },
  },
  tedious: {
    ...Tedious,
    connectionFactory: () =>
      new Tedious.Connection({
        authentication: {
          options: {
            password: process.env.USERS_DB_PASSWORD,
            userName: process.env.USERS_DB_USERNAME,
          },
          type: "default",
        },
        options: {
          database: process.env.USERS_DB_NAME,
          port: parseInt(process.env.USERS_DB_PORT || "1433"),
          trustServerCertificate: true,
        },
        server: process.env.USERS_DB_HOST || "localhost",
      }),
  },
});

// CLIENT_ORIGIN="https://dev-idm-rsd.rega.gov.sa,http://localhost:3000"
const trustedOrigins = process.env.CLIENT_ORIGIN?.split(",").map((origin) => origin.trim()) || [];
if (trustedOrigins.length === 0) throw new Error("Environment variable CLIENT_ORIGIN is not set");
console.log("trustedOrigins", trustedOrigins);

const baseURL = process.env.BETTER_AUTH_URL;
if (!baseURL) throw new Error("Environment variable BETTER_AUTH_URL is not set");

export const auth = betterAuth({
  database: {
    dialect,
    type: "mssql",
  },
  baseURL,
  basePath: "/api/auth",
  experimental: { joins: true },
  session: {
    expiresIn: 30 * 60, // 30 minutes
    // updateAge: 1 * 60, // 5 minutes
    disableSessionRefresh: true,
  },
  advanced: {
    useSecureCookies: true,
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.COOKIE_DOMAIN || ".rega.gov.sa", // Share cookies across subdomains
    },
    defaultCookieAttributes: {
      sameSite: "none", // Required for cross-origin cookies
      secure: true, // Required when sameSite is "none"
    },
  },
  plugins: [nafathPlugin(), permissionPlugin(), userManagementPlugin(), openAPI()],
  trustedOrigins,
});
