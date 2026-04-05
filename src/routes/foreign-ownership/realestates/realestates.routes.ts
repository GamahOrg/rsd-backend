import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getRealestatesCoordinatesSchema,
  getRealestatesCoordinatesSchemaType,
  TFilter as GetRealestatesCoordinatesFilterType,
} from "./schemas/GetRealestatesCoordinates.schema";

const foreignOwnershipOwners: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to registered real estate count
  fastify.route<getRealestatesCoordinatesSchemaType>({
    method: "POST",
    url: "/coordinates",
    schema: getRealestatesCoordinatesSchema,
    handler: async (request) => {
      const { filter } = request.body as GetRealestatesCoordinatesFilterType;
      const { data } = await fastify.foreignOwnershipRealestatesService.getRealestatesCoordinates({
        filter,
      });
      return data;
    },
  });
};
export default foreignOwnershipOwners;
