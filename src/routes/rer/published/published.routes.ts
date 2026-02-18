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
