import type Redis from "ioredis";

export async function withCache<T>(
  redis: Redis,
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis get failed, proceed without cache
  }

  let result: T;
  try {
    result = await fn();
  } catch (error) {
    console.error(`⚠️  Cache miss DB query failed [key: ${key}]:`, error);
    throw error;
  }

  try {
    await redis.setex(key, ttl, JSON.stringify(result));
  } catch (error) {
    console.error("⚠️  Redis cache storage failed:", error);
  }

  return result;
}
