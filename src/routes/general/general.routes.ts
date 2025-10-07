import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getCountriesSchema, countriesSchemaType } from "./schemas/getCountries.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";

const general: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all countries
  fastify.route<countriesSchemaType>({
    method: "GET",
    url: "/countries",
    schema: getCountriesSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { data, totalRecords } = await fastify.generalService.getCountries(skip, take);
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });
};

export default general;
