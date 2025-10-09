import fp from "fastify-plugin";
import { TResponse as GetCountriesResponse } from "./schemas/getCountries.schema";
import { AppDataSource } from "../../config/database";
import { Country } from "../../database/entity/Country.entity";

export default fp(async (fastify) => {
  const getCountries = async () => {
    const countryRepo = AppDataSource.getRepository(Country);
    const data = await countryRepo.find();
    return { data: data as unknown as GetCountriesResponse };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("generalService", {
    getCountries,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    generalService: {
      getCountries: () => Promise<{ data: GetCountriesResponse }>;
    };
  }
}
