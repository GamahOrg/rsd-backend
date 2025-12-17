import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getCountriesSchema, countriesSchemaType } from "./schemas/getCountries.schema";

const general: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all countries
  fastify.route<countriesSchemaType>({
    method: "GET",
    url: "/countries",
    schema: getCountriesSchema,
    handler: async () => {
      const { data } = await fastify.generalService.getCountries();
      return data;
    },
  });
};

export default general;
