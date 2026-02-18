import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getTitlesByRegionSchema,
  getTitlesByRegionSchemaType,
  TBody,
} from "./schemas/getTitlesByRegion.schema";
import {
  getRegisteredRealEstateCountSchema,
  getRegisteredRealEstateCountSchemaType,
} from "./schemas/GetRegisteredRealEstateCount.schema";
import { TFilter } from "@/models/types/rer/filter.type";
import {
  getRegisteredRealEstateTotalAreaSchema,
  getRegisteredRealEstateTotalAreaSchemaType,
} from "./schemas/GetRegisteredRealEstateTotalArea.schema";
import {
  getTransactionsCountByTradeTypeSchema,
  getTransactionsCountByTradeTypeSchemaType,
} from "./schemas/GetTransactionsCountByTradeType.schema";
import {
  getTransactionsCountByTradeChannelSchema,
  getTransactionsCountByTradeChannelSchemaType,
} from "./schemas/GetTransactionsCountByTradeChannel.schema";

const rerTitles: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get request chart
  fastify.route<getTitlesByRegionSchemaType>({
    method: "POST",
    url: "/count/by-region",
    schema: getTitlesByRegionSchema,
    handler: async (request) => {
      const { filter } = request.body as TBody;
      const { data } = await fastify.rerTitlesService.getTitlesByRegion({ filter });
      return data;
    },
  });

  // api to get request chart
  fastify.route<getTitlesByRegionSchemaType>({
    method: "POST",
    url: "/area/by-region",
    schema: getTitlesByRegionSchema,
    handler: async (request) => {
      const { filter } = request.body as TBody;
      const { data } = await fastify.rerTitlesService.getTitlesAreaByRegion({ filter });
      return data;
    },
  });

  // api to registered real estate count
  fastify.route<getRegisteredRealEstateCountSchemaType>({
    method: "POST",
    url: "/count/registered-real-estate",
    schema: getRegisteredRealEstateCountSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerTitlesService.getRegisteredRealEstateCount({ filter });
      return data;
    },
  });

  // api to registered real estate total area
  fastify.route<getRegisteredRealEstateTotalAreaSchemaType>({
    method: "POST",
    url: "/area/registered-real-estate",
    schema: getRegisteredRealEstateTotalAreaSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerTitlesService.getRegisteredRealEstateTotalArea({ filter });
      return data;
    },
  });

  // api to transactions count by trade type
  fastify.route<getTransactionsCountByTradeTypeSchemaType>({
    method: "POST",
    url: "/count/by-trade-type",
    schema: getTransactionsCountByTradeTypeSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerTitlesService.getTransactionsCountByTradeType({ filter });
      return data;
    },
  });

  // api to transactions count by trade channel
  fastify.route<getTransactionsCountByTradeChannelSchemaType>({
    method: "POST",
    url: "/count/by-trade-channel",
    schema: getTransactionsCountByTradeChannelSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerTitlesService.getTransactionsCountByTradeChannel({
        filter,
      });
      return data;
    },
  });
};
export default rerTitles;
