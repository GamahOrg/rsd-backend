import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getRootMapStyleSchema, getRootMapStyleSchemaType } from "./schemas/getRootMapStyle.schema";

const general: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get root map style
  fastify.route<getRootMapStyleSchemaType>({
    method: "GET",
    url: "/map-style",
    schema: getRootMapStyleSchema,
    handler: async (request, reply) => {
      const { rawJson } = await fastify.generalRsdService.getMapStyle();
      return reply.type("application/json").send(rawJson);
    },
  });
};

export default general;
