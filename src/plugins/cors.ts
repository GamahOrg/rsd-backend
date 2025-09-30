import { FastifyInstance, FastifyPluginOptions } from "fastify";
import cors from "@fastify/cors";

export async function corsPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  await fastify.register(cors, {});
}
