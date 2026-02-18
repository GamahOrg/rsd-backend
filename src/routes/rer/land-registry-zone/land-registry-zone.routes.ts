import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getLandRegistryShapesSchema,
  getLandRegistryShapesSchemaType,
} from "./schemas/GetLandRegistryShapes.schema";

const rerLandRegistryZone: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all regions shapes
  fastify.route<getLandRegistryShapesSchemaType>({
    method: "GET",
    url: "/regions",
    schema: getLandRegistryShapesSchema,
    handler: async () => {
      const { data } = await fastify.rerLandRegistryZoneService.getLandRegistryShapes();
      return data;
    },
  });
};
export default rerLandRegistryZone;
