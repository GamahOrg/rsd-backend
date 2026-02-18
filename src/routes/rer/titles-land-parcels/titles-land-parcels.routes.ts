import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getLandParcelsShapesSchema,
  getLandParcelsShapesSchemaType,
} from "./schemas/GetLandParcelsShapes.schema";

const rerLandParcels: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all regions shapes
  fastify.route<getLandParcelsShapesSchemaType>({
    method: "POST",
    url: "/parcels",
    schema: getLandParcelsShapesSchema,
    handler: async (request) => {
      const { bounds } = request.body;
      const { data } = await fastify.rerLandParcelsService.getLandParcelsShapes(bounds);
      return data;
    },
  });
};
export default rerLandParcels;
