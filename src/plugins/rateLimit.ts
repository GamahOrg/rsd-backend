import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // Maximum number of requests
    timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || '1 minute', // Time window
  });
}
