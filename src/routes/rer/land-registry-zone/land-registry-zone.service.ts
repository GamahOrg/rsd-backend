import fp from "fastify-plugin";
import { MapDataSource } from "../../../config/database";
import { TResponse } from "./schemas/GetLandRegistryShapes.schema";

export default fp(async (fastify) => {
  const getLandRegistryShapes = async () => {
    const cached = await fastify.redis.get(`rer_land_registry_zone_shapes:list`);
    if (cached) {
      return { data: JSON.parse(cached) as TResponse };
    }
    const query = MapDataSource.createQueryBuilder()
      .from("rsd.land_registry_zone", "lz")
      .select("lz.objectid", "id")
      .addSelect("lz.region_ar", "region")
      .addSelect("lz.city_ar", "city")
      .addSelect("lz.district_ar", "district")
      .addSelect("lz.announcing_date", "announcing_date")
      .addSelect("lz.register_start_date", "register_start_date")
      .addSelect("lz.register_end_date", "register_end_date")
      .addSelect("lz.landregistry_zone_status_ar", "land_registry_zone_status_ar")
      .addSelect("lz.land_registry_zone_ar")
      .addSelect("ST_AsGeoJSON(lz.shape)::text", "shape");

    const data = await query.getRawMany();

    try {
      await fastify.redis.setex("rer_land_registry_zone_shapes:list", 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }

    return { data: data as TResponse };
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerLandRegistryZoneService", {
    getLandRegistryShapes,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerLandRegistryZoneService: {
      getLandRegistryShapes: () => Promise<{ data: TResponse }>;
    };
  }
}
