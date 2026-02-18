import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getStatisticsSchema, statisticsSchemaType } from "./schemas/getStatistics.schema";
import { getCitiesSchema, getCitiesSchemaType } from "./schemas/getCities.schema";
import { getDistrictsSchema, getDistrictsSchemaType } from "./schemas/getDistricts.schema";
import {
  getPropertyTypesSchema,
  getPropertyTypesSchemaType,
} from "./schemas/getPropertyTypes.schema";
import { getRegionsSchema, getRegionsSchemaType } from "./schemas/getRegions.schema";
import {
  getNationalitiesSchema,
  getNationalitiesSchemaType,
} from "./schemas/getNationalities.schema";

const foreignOwnershipGeneral: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all statistics
  fastify.route<statisticsSchemaType>({
    method: "GET",
    url: "/statistics",
    schema: getStatisticsSchema,
    handler: async () => {
      const { data } = await fastify.foreignOwnershipGeneralService.getStatistics();
      return data;
    },
  });

  // api to get all cities and accept optional region parameter
  fastify.route<getCitiesSchemaType>({
    method: "GET",
    url: "/cities",
    schema: getCitiesSchema,
    handler: async (request) => {
      const { region } = request.query;
      const { data } = await fastify.foreignOwnershipGeneralService.getCities(region);
      return data;
    },
  });
  // api to get all districts
  fastify.route<getDistrictsSchemaType>({
    method: "GET",
    url: "/districts/:city",
    schema: getDistrictsSchema,
    handler: async (request) => {
      const { city } = request.params as { city: string };
      const { data } = await fastify.foreignOwnershipGeneralService.getDistricts(city);
      return data;
    },
  });

  // api to get all property types
  fastify.route<getPropertyTypesSchemaType>({
    method: "GET",
    url: "/property-types",
    schema: getPropertyTypesSchema,
    handler: async () => {
      const { data } = await fastify.foreignOwnershipGeneralService.getPropertyTypes();
      return data;
    },
  });

  // api to get all regions
  fastify.route<getRegionsSchemaType>({
    method: "GET",
    url: "/regions",
    schema: getRegionsSchema,
    handler: async () => {
      const { data } = await fastify.foreignOwnershipGeneralService.getRegions();
      return data;
    },
  });

  // api to get all nationalities
  fastify.route<getNationalitiesSchemaType>({
    method: "GET",
    url: "/nationalities",
    schema: getNationalitiesSchema,
    handler: async () => {
      const { data } = await fastify.foreignOwnershipGeneralService.getNationalities();
      return data;
    },
  });
};

export default foreignOwnershipGeneral;
