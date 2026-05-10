import fp from "fastify-plugin";
import { MapDataSource } from "../../../config/database";
import { TResponse } from "./schemas/GetLandRegistryShapes.schema";
import { TResponse as GetCitiesResponse } from "./schemas/getCities.schema";
import { TResponse as GetRegionsResponse } from "./schemas/getRegions.schema";

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
      await fastify.redis.setex("rer_land_registry_zone_shapes:list", 7200, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }

    return { data: data as TResponse };
  };

  const getRegions = async () => {
    const cached = await fastify.redis.get("rer_land_registry_zone_regions:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetRegionsResponse };
    }
    const query = MapDataSource.createQueryBuilder()
      .from("rsd.land_registry_zone", "lz")
      .select("lz.region_ar", "value")
      .addSelect("lz.region_ar", "label")
      .distinct(true)
      .where("lz.region_ar IS NOT NULL")
      .andWhere("lz.region_ar != ''")
      .orderBy("lz.region_ar", "ASC");
    const data = await query.getRawMany();
    try {
      await fastify.redis.setex("rer_land_registry_zone_regions:list", 7200, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as GetRegionsResponse };
  };

  const getCities = async (region?: string | undefined) => {
    const cached = await fastify.redis.get(`rer_land_registry_zone_cities:list:${region ?? ""}`);
    if (cached) {
      return { data: JSON.parse(cached) as GetCitiesResponse };
    }
    const query = MapDataSource.createQueryBuilder()
      .from("rsd.land_registry_zone", "lz")
      .select("lz.city_ar", "value")
      .addSelect("lz.city_ar", "label")
      .distinct(true)
      .where("lz.region_ar = :region", { region })
      .andWhere("lz.city_ar IS NOT NULL")
      .andWhere("lz.city_ar != ''")
      .orderBy("lz.city_ar", "ASC");
    const data = await query.getRawMany();
    try {
      await fastify.redis.setex(
        `rer_land_registry_zone_cities:list:${region ?? ""}`,
        7200,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as GetCitiesResponse };
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerLandRegistryZoneService", {
    getLandRegistryShapes,
    getRegions,
    getCities,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerLandRegistryZoneService: {
      getLandRegistryShapes: () => Promise<{ data: TResponse }>;
      getRegions: () => Promise<{ data: GetRegionsResponse }>;
      getCities: (region?: string | undefined) => Promise<{ data: GetCitiesResponse }>;
    };
  }
}
