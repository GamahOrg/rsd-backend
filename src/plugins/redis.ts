import { FastifyInstance, FastifyPluginOptions } from "fastify";
import Redis from "ioredis";

declare module "fastify" {
  interface FastifyInstance {
    redis: Redis;
  }
}

export async function redisPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0"),
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  // Handle Redis connection events
  redis.on("connect", () => {
    fastify.log.info("Redis connected successfully");
  });

  redis.on("error", (error) => fastify.log.error(error, "Redis connection error"));

  redis.on("close", () => {
    fastify.log.warn("Redis connection closed");
  });

  redis.on("reconnecting", () => {
    fastify.log.info("Redis reconnecting...");
  });

  // Decorate fastify instance with redis
  fastify.decorate("redis", redis);

  // Graceful shutdown
  fastify.addHook("onClose", async (instance) => {
    await redis.quit();
    fastify.log.info("Redis connection closed gracefully");
  });
}
