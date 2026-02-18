import fp from "fastify-plugin";
import { TResponse as GetStatisticsResponse } from "./schemas/getStatistics.schema";
import { TResponse as GetCitiesResponse } from "./schemas/getCities.schema";
import { TResponse as GetDistrictsResponse } from "./schemas/getDistricts.schema";
import { TResponse as GetPropertyTypesResponse } from "./schemas/getPropertyTypes.schema";
import { TResponse as GetRegionsResponse } from "./schemas/getRegions.schema";
import { AppDataSource } from "../../../config/database";

export default fp(async (fastify) => {
  const getStatistics = async () => {
    const cached = await fastify.redis.get("rer_general_statistics:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetStatisticsResponse };
    }
    const queries = await Promise.all([
      AppDataSource.query(`SELECT COUNT(*) AS count FROM "RER_Published"`),
      AppDataSource.query(
        `SELECT COUNT(*) AS count FROM "RER_Published"
         WHERE GETDATE() BETWEEN Register_start_date AND Register_end_date`,
      ),
      AppDataSource.query(
        `SELECT COUNT(*) AS count FROM "RER_Published"
         WHERE GETDATE() > Register_end_date`,
      ),
      AppDataSource.query(
        `SELECT COUNT(*) AS count FROM "RER_Published"
         WHERE GETDATE() < Published_Date`,
      ),
      AppDataSource.query(
        `SELECT COUNT(DISTINCT RealEstate_Number) AS count
         FROM "RER_Titles"
         WHERE requestname = 'First Registration'`,
      ),
    ]);

    const [
      totalAnnouncedRegions,
      activeAnnouncedRegions,
      expiredAnnouncedRegions,
      upcomingAnnouncedRegions,
      registeredRealEstates,
    ] = queries as Array<Array<{ count: number | string }>>;

    const result = {
      total_announced_regions: parseInt(totalAnnouncedRegions?.[0]?.count?.toString() ?? "0", 10),
      total_active_announced_regions: parseInt(
        activeAnnouncedRegions?.[0]?.count?.toString() ?? "0",
        10,
      ),
      total_expired_regions: parseInt(expiredAnnouncedRegions?.[0]?.count?.toString() ?? "0", 10),
      total_upcoming_regions: parseInt(upcomingAnnouncedRegions?.[0]?.count?.toString() ?? "0", 10),
      total_registered_real_estates: parseInt(
        registeredRealEstates?.[0]?.count?.toString() ?? "0",
        10,
      ),
    };
    try {
      await fastify.redis.setex("rer_general_statistics:list", 86400, JSON.stringify(result));
      return { data: result as unknown as GetStatisticsResponse };
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
      return {
        data: {
          total_announced_regions: 0,
          total_active_announced_regions: 0,
          total_expired_regions: 0,
          total_upcoming_regions: 0,
          total_registered_real_estates: 0,
        } as unknown as GetStatisticsResponse,
      };
    }
  };

  const getCities = async (region?: string | undefined) => {
    const cached = await fastify.redis.get(`rer_cities:list:${region}`);
    if (cached) {
      return { data: JSON.parse(cached) as GetCitiesResponse };
    }
    const citiesRepo = AppDataSource.createQueryBuilder()
      .from("RER_Titles", "T")
      .select("T.CityNameAr", "value")
      .addSelect("T.CityNameAr", "label")
      .distinct(true)
      .where("T.CityNameAr IS NOT NULL")
      .andWhere("T.RegionNameAr != ''");

    if (region) {
      citiesRepo.andWhere("T.RegionNameAr = :region", { region });
    }
    let data = await citiesRepo.orderBy("T.CityNameAr", "ASC").getRawMany();
    try {
      await fastify.redis.setex(`rer_cities:list:${region}`, 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetCitiesResponse };
  };

  const getDistricts = async (city: string) => {
    const cached = await fastify.redis.get(`rer_districts:list:${city}`);
    if (cached) {
      return { data: JSON.parse(cached) as GetDistrictsResponse };
    }
    const districtsRepo = AppDataSource.createQueryBuilder()
      .from("RER_Titles", "T")
      .select("T.DistrictNameAr", "value")
      .addSelect("T.DistrictNameAr", "label")
      .distinct(true)
      .where("T.CityNameAr = :city", { city })
      .andWhere("T.DistrictNameAr IS NOT NULL")
      .andWhere("T.DistrictNameAr != ''")
      .orderBy("T.DistrictNameAr", "ASC");
    let data = await districtsRepo.getRawMany();
    try {
      await fastify.redis.setex(`rer_districts:list:${city}`, 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetDistrictsResponse };
  };

  const getPropertyTypes = async () => {
    const cached = await fastify.redis.get("rer_property_types:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetPropertyTypesResponse };
    }
    const propertyTypesRepo = AppDataSource.createQueryBuilder()
      .from("RER_Titles", "T")
      .select("T.PropertyUse", "value")
      .addSelect("T.PropertyUse", "label")
      .distinct(true)
      .where("T.PropertyUse IS NOT NULL")
      .andWhere("T.PropertyUse != ''")
      .orderBy("T.PropertyUse", "ASC");
    let data = await propertyTypesRepo.getRawMany();
    try {
      await fastify.redis.setex("rer_property_types:list", 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetPropertyTypesResponse };
  };

  const getRegions = async () => {
    const cached = await fastify.redis.get("rer_regions:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetRegionsResponse };
    }
    const query = AppDataSource.createQueryBuilder()
      .from("RER_Titles", "T")
      .select("T.RegionNameAr", "value")
      .addSelect("T.RegionNameAr", "label")
      .distinct(true)
      .where("T.RegionNameAr IS NOT NULL")
      .andWhere("T.RegionNameAr != ''")
      .orderBy("T.RegionNameAr", "ASC");
    const data = await query.getRawMany();
    try {
      await fastify.redis.setex("rer_regions:list", 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetRegionsResponse };
  };

  // No percentage helper needed for these counts

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerGeneralService", {
    getStatistics,
    getCities,
    getDistricts,
    getPropertyTypes,
    getRegions,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerGeneralService: {
      getStatistics: () => Promise<{ data: GetStatisticsResponse }>;
      getCities: (region?: string | undefined) => Promise<{ data: GetCitiesResponse }>;
      getDistricts: (city: string) => Promise<{ data: GetDistrictsResponse }>;
      getPropertyTypes: () => Promise<{ data: GetPropertyTypesResponse }>;
      getRegions: () => Promise<{ data: GetRegionsResponse }>;
    };
  }
}
