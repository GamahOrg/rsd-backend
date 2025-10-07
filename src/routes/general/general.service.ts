import fp from "fastify-plugin";
import { TResponse as GetCountriesResponse } from "./schemas/getCountries.schema";
import { AppDataSource } from "../../config/database";
import { Country } from "../../database/entity/Country.entity";

export default fp(async (fastify) => {
  const getCountries = async (skip: number, take: number) => {
    const countryRepo = AppDataSource.getRepository(Country);
    const data = await countryRepo.find({ skip, take });
    return { data: data as unknown as GetCountriesResponse, totalRecords: data.length };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("generalService", {
    getCountries,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    generalService: {
      getCountries: (
        skip: number,
        take: number,
      ) => Promise<{ data: GetCountriesResponse; totalRecords: number }>;
    };
  }
}
