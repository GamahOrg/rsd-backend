import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getRegistrarCountSchema,
  getRegistrarCountSchemaType,
} from "./schemas/GetRegistrarCount.schema";
import { TFilter } from "../../../models/types/rer/filter.type";
import { getRegionsSchema } from "../general/schemas/getRegions.schema";
import { getRegionsSchemaType } from "../general/schemas/getRegions.schema";
import { getCitiesSchema } from "../general/schemas/getCities.schema";
import { getCitiesSchemaType } from "../general/schemas/getCities.schema";
import {
  getRegistrarLineChartCountSchema,
  getRegistrarLineChartCountSchemaType,
} from "./schemas/GetRegistrarLineChartCount.schema";

const rerRegistrar: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get registrar count
  fastify.route<getRegistrarCountSchemaType>({
    method: "POST",
    url: "/count",
    schema: getRegistrarCountSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerRegistrarService.getRegistrarCount({ filter });
      return data;
    },
  });

  // api to get all regions
  fastify.route<getRegionsSchemaType>({
    method: "GET",
    url: "/regions",
    schema: getRegionsSchema,
    handler: async () => {
      const { data } = await fastify.rerRegistrarService.getRegions();
      return data;
    },
  });

  // api to get all cities
  fastify.route<getCitiesSchemaType>({
    method: "GET",
    url: "/cities",
    schema: getCitiesSchema,
    handler: async (request) => {
      const { region } = request.query;
      const { data } = await fastify.rerRegistrarService.getCities(region);
      return data;
    },
  });

  // api to registrar count (bar Chart)
  fastify.route<getRegistrarLineChartCountSchemaType>({
    method: "POST",
    url: "/count/line-chart",
    schema: getRegistrarLineChartCountSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerRegistrarService.getRegistrarLineChartCount({ filter });
      return data;
    },
  });
};
export default rerRegistrar;
