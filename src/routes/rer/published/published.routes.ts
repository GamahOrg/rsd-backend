import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { TFilter } from "@/models/types/rer/filter.type";
import {
  getPublishedRealEstateCountSchema,
  getPublishedRealEstateCountSchemaType,
} from "./schemas/GetPublishedRealEstateCount.schema";
import { getRegionsSchema, getRegionsSchemaType } from "../general/schemas/getRegions.schema";
import { getCitiesSchema, getCitiesSchemaType } from "../general/schemas/getCities.schema";
import {
  getPublishedRealEstateRatioSchema,
  getPublishedRealEstateRatioSchemaType,
} from "./schemas/GetPublishedRealEstateRatio.schema";
import {
  getRegisteredToPublishedParcelsRatioSchema,
  getRegisteredToPublishedParcelsRatioSchemaType,
} from "./schemas/GetRegisteredToPublishedParcelsRatio.schema";
import {
  getMapGeneralStatisticsSchema,
  getMapGeneralStatisticsSchemaType,
  TFilter as GetMapGeneralStatisticsFilterType,
} from "./schemas/GetMapGeneralStatistics.schema";
import {
  getMapStatisticsByRegionsSchema,
  getMapStatisticsByRegionsSchemaType,
} from "./schemas/GetMapStatisticsByRegions.schema";

const rerPublished: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to published real estate count
  fastify.route<getPublishedRealEstateCountSchemaType>({
    method: "POST",
    url: "/real-estate/count",
    schema: getPublishedRealEstateCountSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerPublishedService.getPublishedRealEstateCount({ filter });
      return data;
    },
  });

  // api to get all regions
  fastify.route<getMapStatisticsByRegionsSchemaType>({
    method: "GET",
    url: "/regions/maps/statistics",
    schema: getMapStatisticsByRegionsSchema,
    handler: async () => {
      const { data } = await fastify.rerPublishedService.getMapStatisticsByRegions();
      return data;
    },
  });

  // TOBEREVIEWED: this api is not used in the app yet
  fastify.route<getMapGeneralStatisticsSchemaType>({
    method: "POST",
    url: "/map/general-statistics",
    schema: getMapGeneralStatisticsSchema,
    handler: async (request) => {
      const { filter } = request.body as GetMapGeneralStatisticsFilterType;
      const { data } = await fastify.rerPublishedService.getMapGeneralStatistics({ filter });
      return data;
    },
  });

  fastify.route<getPublishedRealEstateRatioSchemaType>({
    method: "POST",
    url: "/real-estate/ratio",
    schema: getPublishedRealEstateRatioSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerPublishedService.getPublishedRealEstateRatio({ filter });
      return data;
    },
  });

  fastify.route<getRegisteredToPublishedParcelsRatioSchemaType>({
    method: "POST",
    url: "/real-estate/ratio/registered-to-published",
    schema: getRegisteredToPublishedParcelsRatioSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerPublishedService.getRegisteredToPublishedParcelsRatio({
        filter,
      });
      return data;
    },
  });

  // api to get all regions
  fastify.route<getRegionsSchemaType>({
    method: "GET",
    url: "/regions",
    schema: getRegionsSchema,
    handler: async () => {
      const { data } = await fastify.rerPublishedService.getRegions();
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
      const { data } = await fastify.rerPublishedService.getCities(region);
      return data;
    },
  });
};
export default rerPublished;
