import { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

export async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors);
}
