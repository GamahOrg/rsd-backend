import fp from "fastify-plugin";
import { TResponse as GetCountriesResponse } from "./schemas/getCountries.schema";
import { XDataSource } from "../../config/database";
import { Country } from "../../database/entity/Country.entity";

export default fp(async (fastify) => {
  const getCountries = async () => {
    const cached = await fastify.redis.get("rsd_countries:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetCountriesResponse };
    }

    const countryRepo = XDataSource.getRepository(Country);
    const data = await countryRepo.find();

    try {
      await fastify.redis.setex("rsd_countries:list", 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }

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
