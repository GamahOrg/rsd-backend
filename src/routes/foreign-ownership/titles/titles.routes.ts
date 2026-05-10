import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getTitlesByRegionSchema,
  getTitlesByRegionSchemaType,
  TBody,
} from "./schemas/getTitlesByRegion.schema";
import {
  getRealEstateCountSchemaType,
  getRealEstateCountSchema,
} from "./schemas/GetRealEstateCount.schema";
import { TFilter } from "@/models/types/rer/filter.type";
import {
  getRegisteredRealEstateTotalAreaSchema,
  getRegisteredRealEstateTotalAreaSchemaType,
} from "./schemas/GetRegisteredRealEstateTotalArea.schema";
import {
  getTransactionsCountByIdentityTypeSchema,
  getTransactionsCountByIdentityTypeSchemaType,
} from "./schemas/GetTransactionsCountByIdentityType.schema";
import {
  getTransactionsCountSchema,
  getTransactionsCountSchemaType,
  TFilterWithNationality,
} from "./schemas/GetTransactionsCount.schema";
const foreignOwnershipTitles: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get request chart
  // fastify.route<getTitlesByRegionSchemaType>({
  //   method: "POST",
  //   url: "/count/by-region",
  //   schema: getTitlesByRegionSchema,
  //   handler: async (request) => {
  //     const { filter } = request.body as TBody;
  //     const { data } = await fastify.foreignOwnershipTitlesService.getTitlesByRegion({ filter });
  //     return data;
  //   },
  // });

  // // api to get request chart
  // fastify.route<getTitlesByRegionSchemaType>({
  //   method: "POST",
  //   url: "/area/by-region",
  //   schema: getTitlesByRegionSchema,
  //   handler: async (request) => {
  //     const { filter } = request.body as TBody;
  //     const { data } = await fastify.foreignOwnershipTitlesService.getTitlesAreaByRegion({ filter });
  //     return data;
  //   },
  // });

  // api to registered real estate count
  fastify.route<getRealEstateCountSchemaType>({
    method: "POST",
    url: "/count/registered-real-estate",
    schema: getRealEstateCountSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilterWithNationality;
      const { data } = await fastify.foreignOwnershipTitlesService.getRealEstateCount({ filter });
      return data;
    },
  });

  // // api to registered real estate total area
  fastify.route<getRegisteredRealEstateTotalAreaSchemaType>({
    method: "POST",
    url: "/area/registered-real-estate",
    schema: getRegisteredRealEstateTotalAreaSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilterWithNationality;
      const { data } = await fastify.foreignOwnershipTitlesService.getRealEstateTotalArea({
        filter,
      });
      return data;
    },
  });

  // api to get transactions count
  fastify.route<getTransactionsCountSchemaType>({
    method: "POST",
    url: "/count/transactions",
    schema: getTransactionsCountSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilterWithNationality;
      const { data } = await fastify.foreignOwnershipTitlesService.getTransactionsCount({ filter });
      return data;
    },
  });

  // // api to transactions count by trade type
  // fastify.route<getTransactionsCountByTradeTypeSchemaType>({
  //   method: "POST",
  //   url: "/count/by-trade-type",
  //   schema: getTransactionsCountByTradeTypeSchema,
  //   handler: async (request) => {
  //     const { filter } = request.body as TFilter;
  //     const { data } = await fastify.foreignOwnershipTitlesService.getTransactionsCountByTradeType({ filter });
  //     return data;
  //   },
  // });

  // api to transactions count by trade channel
  fastify.route<getTransactionsCountByIdentityTypeSchemaType>({
    method: "POST",
    url: "/count/real-estate/by-identity-type",
    schema: getTransactionsCountByIdentityTypeSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } =
        await fastify.foreignOwnershipTitlesService.getTransactionsCountByIdentityType({
          filter,
        });
      return data;
    },
  });
};
export default foreignOwnershipTitles;
