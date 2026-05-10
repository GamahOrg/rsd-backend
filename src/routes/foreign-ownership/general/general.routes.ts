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

import {
  getMostOwnedNationalitiesSchema,
  getMostOwnedNationalitiesSchemaType,
} from "../general/schemas/GetMostOwnedNationalities.schema";
import { setPaginationHeaders } from "../../../helper/setPaginationHeaders";
import {
  getMostOwnedRegionsSchema,
  getMostOwnedRegionsSchemaType,
} from "./schemas/GetMostOwnedRegions.schema";

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

  // api to get most owned nationalities
  fastify.route<getMostOwnedNationalitiesSchemaType>({
    method: "GET",
    url: "/most-owned-nationalities",
    schema: getMostOwnedNationalitiesSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { data, totalRecords } =
        await fastify.foreignOwnershipGeneralService.getMostOwnedNationalities({ skip, take });
      setPaginationHeaders(response, totalRecords, take);
      return { data, totalRecords };
    },
  });

  // api to get most owned regions
  fastify.route<getMostOwnedRegionsSchemaType>({
    method: "GET",
    url: "/most-owned-regions",
    schema: getMostOwnedRegionsSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { data, totalRecords } =
        await fastify.foreignOwnershipGeneralService.getMostOwnedRegions({ skip, take });
      setPaginationHeaders(response, totalRecords, take);
      return { data, totalRecords };
    },
  });
};

export default foreignOwnershipGeneral;
