import "reflect-metadata";
import Fastify from "fastify";
import qs from "qs";
import { config } from "dotenv";
import { join } from "path";
import AutoLoad from "@fastify/autoload";
import {
  AppDataSource,
  MapDataSource,
  UsersDataSource,
  initializeAppDatabase,
  initializeXDatabase,
  initializeMapDatabase,
  initializeUsersDatabase,
} from "./config/database";
import { auth } from "./lib/auth";
import fastifyCors from "@fastify/cors";

// Load environment variables
config();

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === "development" ? "info" : "warn",
  },
  querystringParser: (str) => qs.parse(str),
});

// Health check route with database and Redis status
fastify.get("/health", async () => {
  const dbStatus = AppDataSource.isInitialized ? "connected" : "disconnected";

  let redisStatus = "disconnected";
  try {
    if (fastify.redis && fastify.redis.status === "ready") {
      await fastify.redis.ping();
      redisStatus = "connected";
      console.log("✅ Redis connected successfully");
    }
  } catch (error: unknown) {
    redisStatus = "error";
    console.error("❌ Redis connection error:", error);
  }

  return {
    status: "OK",
    database: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  };
});

// Register authentication endpoint
fastify.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try {
      // Construct request URL
      const url = new URL(request.url, `http://${request.headers.host}`);

      // Convert Fastify headers to standard Headers object
      const headers = new Headers();
      Object.entries(request.headers).forEach(([key, value]) => {
        if (value) headers.append(key, value.toString());
      });

      // Create Fetch API-compatible request
      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        body: request.method !== "GET" && request.body ? JSON.stringify(request.body) : undefined,
      });
      // Process authentication request
      const response = await auth.handler(req);

      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      reply.send(response.body ? await response.text() : null);
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

const clientOrigin = process.env.CLIENT_ORIGIN;
if (!clientOrigin) throw new Error("Environment variable CLIENT_ORIGIN is not set");
const clientOrigins = clientOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (clientOrigins.length === 0) throw new Error("Environment variable CLIENT_ORIGIN is not set");

// Configure CORS policies
fastify.register(fastifyCors, {
  origin: clientOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400,
});

// Start server
const start = async () => {
  try {
    console.log("🚀 Starting server initialization...");

    // Initialize database connections
    console.log("📊 Initializing databases connection...");
    await initializeAppDatabase();
    await initializeXDatabase();
    await initializeUsersDatabase();
    if (process.env.RUN_MAP_DB === "true") {
      await initializeMapDatabase();
    }
    console.log("✅ Databases connection established successfully");

    // This loads all plugins defined in plugins
    // those should be support plugins that are reused
    // through your application
    await fastify.register(AutoLoad, {
      dir: join(__dirname, "plugins"),
      options: {},
    });

    // This loads all plugins defined in hooks
    void fastify.register(AutoLoad, {
      dir: join(__dirname, "hooks"),
      options: {},
      encapsulate: false,
    });

    // This loads all plugins defined in services
    void fastify.register(AutoLoad, {
      dir: join(__dirname, "services"),
      options: {},
      encapsulate: false,
    });

    // This loads all plugins defined in routes
    // define your routes in one of these
    await fastify.register(AutoLoad, {
      dir: join(__dirname, "routes"),
      options: { prefix: "/api" },
    });

    // Start the server
    const port = parseInt(process.env.PORT || "3000");
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    console.log(`🌐 Server is running on http://${host}:${port}`);
    console.log(`📋 Health check available at http://${host}:${port}/health`);
    console.log(`📋 API documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    // Close Fastify server
    await fastify.close();
    console.log("✅ Fastify server closed");

    // Close database connections
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("✅ App Database connection closed");
    }
    if (UsersDataSource.isInitialized) {
      await UsersDataSource.destroy();
      console.log("✅ Users Database connection closed");
    }

    if (process.env.RUN_MAP_DB === "true" && MapDataSource.isInitialized) {
      await MapDataSource.destroy();
      console.log("✅ Map Database connection closed");
    }

    console.log("👋 Server shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

start();
