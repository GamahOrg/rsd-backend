import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

async function redisPlugin(fastify: FastifyInstance) {
  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: 3,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  // Handle Redis connection events
  redis.on("connect", () => {
    console.log("✅ Redis connected successfully");
  });

  redis.on("ready", () => {
    console.log("✅ Redis ready to accept commands");
  });

  redis.on("error", (error: Error) => {
    console.error("❌ Redis connection error:", error);
  });

  redis.on("close", () => {
    console.warn("⚠️  Redis connection closed");
  });

  redis.on("reconnecting", () => {
    console.log("🔄 Redis reconnecting...");
  });

  // Wait for Redis to be ready
  try {
    await redis.ping();
    console.log("✅ Redis ping successful");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    throw error;
  }

  // Decorate fastify instance with redis
  fastify.decorate("redis", redis);

  // Graceful shutdown
  fastify.addHook("onClose", async () => {
    await redis.quit();
    console.log("✅ Redis connection closed gracefully");
  });
}

export default fp(redisPlugin);
