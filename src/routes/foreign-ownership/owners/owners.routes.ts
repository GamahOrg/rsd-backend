import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getOwnersSchemaType, getOwnersSchema } from "./schemas/GetOwners.schema";
import { TFilter as GetOwnersFilterType } from "./schemas/GetOwners.schema";
import {
  getOwnerInfoSchema,
  getOwnerInfoSchemaType,
  TParams as GetOwnerInfoParamsType,
} from "./schemas/GetOwnerInfo.schema";
import {
  getOwnerRealestatesSchema,
  getOwnerRealestatesSchemaType,
  TParams as GetOwnerRealestatesParamsType,
} from "./schemas/GetOwnerRealestates.schema";
import {
  getOwnerRealestatesCoordinatesSchema,
  getOwnerRealestatesCoordinatesSchemaType,
  TParams as GetOwnerRealestatesCoordinatesParamsType,
} from "./schemas/GetOwnerRealestatesCoordinates.schema";
import {
  getOwnersStatisticsSchema,
  getOwnersStatisticsSchemaType,
  TFilter as GetOwnersStatisticsFilterType,
} from "./schemas/GetOwnersStatistics.schema";
import { setPaginationHeaders } from "../../../helper/setPaginationHeaders";

const foreignOwnershipOwners: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to registered real estate count
  fastify.route<getOwnersSchemaType>({
    method: "POST",
    url: "/",
    schema: getOwnersSchema,
    handler: async (request, response) => {
      const { filter } = request.body as GetOwnersFilterType;
      const { skip, take } = request.pagination!;
      const { data, totalRecords } = await fastify.foreignOwnershipOwnersService.getOwners(
        { filter },
        { skip, take },
      );
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to registered real estate count
  fastify.route<getOwnersStatisticsSchemaType>({
    method: "POST",
    url: "/statistics",
    schema: getOwnersStatisticsSchema,
    handler: async (request) => {
      const { filter } = request.body as GetOwnersStatisticsFilterType;
      const { data } = await fastify.foreignOwnershipOwnersService.getOwnersStatistics({ filter });
      return data;
    },
  });

  fastify.route<getOwnerInfoSchemaType>({
    method: "GET",
    url: "/info/:ownerIDNumber",
    schema: getOwnerInfoSchema,
    handler: async (request) => {
      const { ownerIDNumber } = request.params as GetOwnerInfoParamsType;
      const { data } = await fastify.foreignOwnershipOwnersService.getOwnerInfo(ownerIDNumber);
      return data;
    },
  });

  fastify.route<getOwnerRealestatesSchemaType>({
    method: "GET",
    url: "/realestates/:ownerIDNumber",
    schema: getOwnerRealestatesSchema,
    handler: async (request) => {
      const { ownerIDNumber } = request.params as GetOwnerRealestatesParamsType;
      const { data } =
        await fastify.foreignOwnershipOwnersService.getOwnerRealestates(ownerIDNumber);
      return data;
    },
  });

  fastify.route<getOwnerRealestatesCoordinatesSchemaType>({
    method: "GET",
    url: "/realestates/coordinates/:ownerIDNumber",
    schema: getOwnerRealestatesCoordinatesSchema,
    handler: async (request) => {
      const { ownerIDNumber } = request.params as GetOwnerRealestatesCoordinatesParamsType;
      const { data } =
        await fastify.foreignOwnershipOwnersService.getOwnerRealestatesCoordinates(ownerIDNumber);
      return data;
    },
  });
};
export default foreignOwnershipOwners;
