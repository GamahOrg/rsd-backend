import { FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    pagination?: {
      skip: number;
      take: number;
    };
  }
}
