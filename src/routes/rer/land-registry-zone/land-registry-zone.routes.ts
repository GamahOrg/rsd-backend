import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getLandRegistryShapesSchema,
  getLandRegistryShapesSchemaType,
} from "./schemas/GetLandRegistryShapes.schema";
import { getCitiesSchema, getCitiesSchemaType } from "./schemas/getCities.schema";
import { getRegionsSchema, getRegionsSchemaType } from "./schemas/getRegions.schema";

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

  // api to get all regions
  fastify.route<getRegionsSchemaType>({
    method: "GET",
    url: "/list/regions",
    schema: getRegionsSchema,
    handler: async () => {
      const { data } = await fastify.rerLandRegistryZoneService.getRegions();
      return data;
    },
  });

  // api to get all cities
  fastify.route<getCitiesSchemaType>({
    method: "GET",
    url: "/list/cities",
    schema: getCitiesSchema,
    handler: async (request) => {
      const { region } = request.query;
      const { data } = await fastify.rerLandRegistryZoneService.getCities(region);
      return data;
    },
  });
};
export default rerLandRegistryZone;
