import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getClaimsByStatusSchema,
  getClaimsByStatusSchemaType,
} from "./schemas/GetClaimsByStatusCount.schema";
import { TFilter } from "../../../models/types/rer/filter.type";
import {
  getClaimsByStatusGroupByDateSchema,
  getClaimsByStatusGroupByDateSchemaType,
} from "./schemas/GetClaimsGroupByDateCount.schema";
const rerClaims: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get request chart
  fastify.route<getClaimsByStatusSchemaType>({
    method: "POST",
    url: "/count/by-status",
    schema: getClaimsByStatusSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerClaimsService.getClaimsByStatusCount({ filter });
      return data;
    },
  });

  // api to registered real estate total area
  fastify.route<getClaimsByStatusGroupByDateSchemaType>({
    method: "POST",
    url: "/count/by-date",
    schema: getClaimsByStatusGroupByDateSchema,
    handler: async (request) => {
      const { filter } = request.body as TFilter;
      const { data } = await fastify.rerClaimsService.getClaimsByStatusGroupByDateCount({ filter });
      return data;
    },
  });
};
export default rerClaims;
