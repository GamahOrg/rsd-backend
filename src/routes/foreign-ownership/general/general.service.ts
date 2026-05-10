import fp from "fastify-plugin";
import { TResponse as GetStatisticsResponse } from "./schemas/getStatistics.schema";
import { TResponse as GetCitiesResponse } from "./schemas/getCities.schema";
import { TResponse as GetDistrictsResponse } from "./schemas/getDistricts.schema";
import { TResponse as GetPropertyTypesResponse } from "./schemas/getPropertyTypes.schema";
import { TResponse as GetRegionsResponse } from "./schemas/getRegions.schema";
import { TResponse as GetNationalitiesResponse } from "./schemas/getNationalities.schema";
import { AppDataSource } from "../../../config/database";
import { withCache } from "../../../helper/cache";
import { MostOwnedNationalityData } from "./schemas/GetMostOwnedNationalities.schema";
import { MostOwnedRegionData } from "./schemas/GetMostOwnedRegions.schema";

export default fp(async (fastify) => {
  const getStatistics = async () => {
    const cached = await fastify.redis.get("foreign_ownership_general_statistics:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetStatisticsResponse };
    }
    const data = await AppDataSource.query(`
    
WITH latest_period AS (
    SELECT MAX(start_date) AS max_date
    FROM dbo.non_saudies_individuals_ownership_national_unique_owners
    ),
    total_owners AS (
    SELECT SUM(total_owners) AS total_foreign_owners
    FROM dbo.non_saudies_individuals_ownership_national_unique_owners
    WHERE start_date = (SELECT max_date FROM latest_period)
    ),
    national_metrics AS (
    SELECT
    SUM(property_share) AS total_owned_properties,
    SUM(owned_sqm)      AS total_owned_sqm
    FROM dbo.non_saudies_individuals_ownership_ksa
    WHERE start_date = (SELECT max_date FROM latest_period)
    ),
    grand_total_properties AS (
    SELECT SUM(property_share) AS total
    FROM dbo.non_saudies_individuals_ownership_ksa
    WHERE start_date = (SELECT max_date FROM latest_period)
    ),
    top_category AS (
    SELECT TOP 1
    category_ar,
    main_category_ar,
    SUM(property_share) AS total_owned_properties
    FROM dbo.non_saudies_individuals_ownership_ksa
    WHERE start_date = (SELECT max_date FROM latest_period)
    GROUP BY category_ar, main_category_ar
    ORDER BY total_owned_properties DESC
    ),
    top_city AS (
    SELECT TOP 1
    city_ar,
    SUM(property_share) AS total_owned_properties
    FROM dbo.non_saudies_individuals_ownership_cities
    WHERE start_date = (SELECT max_date FROM latest_period)
    GROUP BY city_ar
    ORDER BY total_owned_properties DESC
    ),
    top_district AS (
    SELECT TOP 1
    city_ar,district_ar,
    SUM(property_share) AS total_owned_properties
    FROM dbo.non_saudies_individuals_ownership_districts
    WHERE start_date = (SELECT max_date FROM latest_period) and district_ar != 'غير معروف'
    GROUP BY city_ar , district_ar
    ORDER BY total_owned_properties DESC
    ),

    top_nationality AS (
    SELECT TOP 1
    nationality_ar,
    SUM(total_owners) AS total_owners
    FROM dbo.non_saudies_individuals_ownership_national_unique_owners
    WHERE start_date = (SELECT max_date FROM latest_period)
    GROUP BY nationality_ar
    ORDER BY total_owners DESC
    )
SELECT
    o.total_foreign_owners,
    m.total_owned_properties,
    m.total_owned_sqm,
    tc.category_ar          AS top_category,
    tc.main_category_ar     AS top_main_category,
    ci.city_ar              AS top_city_ar,
    td.district_ar          AS top_district_ar ,
    tn.nationality_ar       AS top_nationality
FROM total_owners o
         CROSS JOIN national_metrics m
         CROSS JOIN grand_total_properties gt
         CROSS JOIN top_category tc
         CROSS JOIN top_city ci
         CROSS JOIN top_district td
         CROSS JOIN top_nationality tn`);
    const result = {
      total_realestate: data?.[0]?.total_owned_properties ?? undefined,
      total_owners: data?.[0]?.total_foreign_owners ?? undefined,
      total_owners_p_iqama: data?.[0]?.total_owners_p_iqama ?? undefined,
      total_area: data?.[0]?.total_owned_sqm ?? undefined,
      top_property_type: data?.[0]?.top_category?.toString() ?? undefined,
      top_city: data?.[0]?.top_city_ar?.toString() ?? undefined,
      top_district: data?.[0]?.top_district_ar?.toString() ?? undefined,
      top_nationality: data?.[0]?.top_nationality?.toString() ?? undefined,
    };
    try {
      await fastify.redis.setex(
        "foreign_ownership_general_statistics:list",
        86400,
        JSON.stringify(result),
      );
      return { data: result as unknown as GetStatisticsResponse };
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
      return {
        data: {
          total_realestate: undefined,
          total_owners: undefined,
          total_owners_p_iqama: undefined,
          total_area: undefined,
          top_property_type: undefined,
          top_city: undefined,
          top_district: undefined,
          top_nationality: undefined,
        } as unknown as GetStatisticsResponse,
      };
    }
  };
  const getCities = async (region?: string | undefined) => {
    const cached = await fastify.redis.get(`foreign_ownership_cities:list:${region}:new`);
    if (cached) {
      return { data: JSON.parse(cached) as GetCitiesResponse };
    }
    const citiesRepo = AppDataSource.createQueryBuilder()
      .from("dbo.non_saudies_individuals_ownership_all_levels", "T")
      .select("T.city_ar", "value")
      .addSelect("T.city_ar", "label")
      .distinct(true)
      .where("T.city_ar IS NOT NULL")
      .andWhere("T.region_ar != ''");

    if (region) {
      citiesRepo.andWhere("T.region_ar = :region", { region });
    }
    let data = await citiesRepo.orderBy("T.city_ar", "ASC").getRawMany();
    try {
      await fastify.redis.setex(
        `foreign_ownership_cities:list:${region}:new`,
        86400,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetCitiesResponse };
  };

  const getDistricts = async (city: string) => {
    const cached = await fastify.redis.get(`foreign_ownership_districts:list:${city}:new`);
    if (cached) {
      return { data: JSON.parse(cached) as GetDistrictsResponse };
    }
    const districtsRepo = AppDataSource.createQueryBuilder()
      .from("dbo.non_saudies_individuals_ownership_all_levels", "T")
      .select("T.district_ar", "value")
      .addSelect("T.district_ar", "label")
      .distinct(true)
      .where("T.city_ar = :city", { city })
      .andWhere("T.district_ar IS NOT NULL")
      .andWhere("T.district_ar != ''")
      .orderBy("T.district_ar", "ASC");
    let data = await districtsRepo.getRawMany();
    try {
      await fastify.redis.setex(
        `foreign_ownership_districts:list:${city}:new`,
        86400,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetDistrictsResponse };
  };

  const getPropertyTypes = async () => {
    const cached = await fastify.redis.get("foreign_ownership_property_types:list:new");
    if (cached) {
      return { data: JSON.parse(cached) as GetPropertyTypesResponse };
    }
    const propertyTypesRepo = AppDataSource.createQueryBuilder()
      .from("dbo.non_saudies_individuals_ownership_all_levels", "T")
      .select("T.main_category_ar", "value")
      .addSelect("T.main_category_ar", "label")
      .distinct(true)
      .where("T.main_category_ar IS NOT NULL")
      .andWhere("T.main_category_ar != ''")
      .orderBy("T.main_category_ar", "ASC");
    let data = await propertyTypesRepo.getRawMany();
    try {
      await fastify.redis.setex(
        "foreign_ownership_property_types:list:new",
        86400,
        JSON.stringify(data),
      );
      return { data: data as unknown as GetPropertyTypesResponse };
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
      return { data: [] };
    }
  };

  const getRegions = async () => {
    const cached = await fastify.redis.get("foreign_ownership_regions:list:new");
    if (cached) {
      return { data: JSON.parse(cached) as GetRegionsResponse };
    }
    const query = AppDataSource.createQueryBuilder()
      .from("dbo.non_saudies_individuals_ownership_all_levels", "T")
      .select("T.region_ar", "value")
      .addSelect("T.region_ar", "label")
      .distinct(true)
      .where("T.region_ar IS NOT NULL")
      .andWhere("T.region_ar != ''")
      .orderBy("T.region_ar", "ASC");
    const data = await query.getRawMany();
    try {
      await fastify.redis.setex("foreign_ownership_regions:list:new", 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetRegionsResponse };
  };

  const getNationalities = async () => {
    const cached = await fastify.redis.get(`foreign_ownership_nationalities:list:new`);
    if (cached) {
      return { data: JSON.parse(cached) as GetNationalitiesResponse };
    }
    const nationalitiesRepo = AppDataSource.createQueryBuilder()
      .from("dbo.non_saudies_individuals_ownership_all_levels", "T")
      .select("T.nationality_ar", "value")
      .addSelect("T.nationality_ar", "label")
      .where("T.nationality_ar IS NOT NULL")
      .andWhere("T.nationality_ar != ''")
      .groupBy("T.nationality_ar")
      .orderBy("T.nationality_ar", "DESC");
    let data = await nationalitiesRepo.getRawMany();
    try {
      await fastify.redis.setex(
        `foreign_ownership_nationalities:list:new`,
        86400,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetNationalitiesResponse };
  };

  const getMostOwnedNationalities = async (pagination?: { skip: number; take: number }) => {
    return withCache(
      fastify.redis,
      `foreign_ownership_most_owned_nationalities:list:${pagination?.skip}:${pagination?.take}`,
      7200,
      () => _getMostOwnedNationalities(pagination),
    );
  };

  const getMostOwnedRegions = async (pagination?: { skip: number; take: number }) => {
    try {
      const skip = Math.max(0, pagination?.skip ?? 0);
      const take = Math.max(1, pagination?.take ?? 10);
      const cached = await fastify.redis.get(
        `foreign_ownership_most_owned_regions:list:${skip}:${take}`,
      );
      if (cached) {
        const cachedData = JSON.parse(cached) as {
          data: MostOwnedRegionData[];
          totalRecords: number;
        };
        return { data: cachedData.data, totalRecords: cachedData.totalRecords };
      }
      const sql = `
WITH latest_period AS (
    SELECT MAX(start_date) AS max_date
    FROM dbo.non_saudies_individuals_ownership_regions_unique_owners
    WHERE start_date BETWEEN '2025-12-01' AND '2026-02-01'
    ),
    owners_per_region AS (
    SELECT
    region_ar,
    SUM(total_owners) AS total_owners
    FROM dbo.non_saudies_individuals_ownership_regions_unique_owners
    WHERE start_date = (SELECT max_date FROM latest_period) and region_ar != 'غير معروف'
    GROUP BY region_ar
    ),
    properties_per_region AS (
    SELECT
    region_ar,
    SUM(property_share) AS total_owned_properties
    FROM dbo.non_saudies_individuals_ownership_regions
    WHERE start_date = (SELECT max_date FROM latest_period) and region_ar != 'غير معروف'
    GROUP BY region_ar
    ),
    grand_total AS (
    SELECT SUM(total_owned_properties) AS total
    FROM properties_per_region
    ),
    top_nationality AS (
    SELECT
    region_ar,
    nationality_ar AS top_nationality,
    ROW_NUMBER() OVER (
    PARTITION BY region_ar
    ORDER BY SUM(property_share) DESC
    ) AS rn
    FROM dbo.non_saudies_individuals_ownership_regions
    WHERE start_date = (SELECT max_date FROM latest_period)
    GROUP BY region_ar, nationality_ar
    )
SELECT
    o.region_ar,
    o.total_owners,
    p.total_owned_properties,
    ROUND(p.total_owned_properties / NULLIF(gt.total, 0) * 100, 2) AS ownership_pct,
    tn.top_nationality
FROM owners_per_region o
         LEFT JOIN properties_per_region p  ON o.region_ar = p.region_ar
         LEFT JOIN top_nationality tn        ON o.region_ar = tn.region_ar AND tn.rn = 1
         CROSS JOIN grand_total gt
 ORDER BY o.total_owners DESC
OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
      `;

      const count = (await AppDataSource.query(`
        SELECT count(distinct region_ar) as count
FROM non_saudies_individuals_ownership_regions_unique_owners
`)) as Array<{
        count: number;
      }>;
      const totalRecords = Number(count[0]?.count ?? 0);

      const rows = (await AppDataSource.query(sql)) as Array<{
        region_ar: string;
        total_owners: number;
        total_owned_properties: number;
        ownership_pct: number;
        top_nationality: string;
      }>;
      const data = rows.map((row, index) => {
        const value = Number(row.total_owners ?? 0);
        return {
          rank: skip + index + 1,
          region: row.region_ar,
          total_owners: value,
          total_properties: row.total_owned_properties,
          owners_percentage: row.ownership_pct,
          top_nationality: row.top_nationality,
        };
      });

      await fastify.redis.setex(
        `foreign_ownership_most_owned_regions:list:${skip}:${take}`,
        86400,
        JSON.stringify({ data, totalRecords }),
      );

      return { data, totalRecords };
    } catch (error) {
      console.error("⚠️  Error getting most owned regions:", error);
      return { data: [] as MostOwnedRegionData[], totalRecords: 0 };
    }
  };

  const _getMostOwnedNationalities = async (pagination?: { skip: number; take: number }) => {
    try {
      const skip = Math.max(0, pagination?.skip ?? 0);
      const take = Math.max(1, pagination?.take ?? 10);
      const cached = await fastify.redis.get(
        `foreign_ownership_most_owned_nationalities:list:${skip}:${take}`,
      );
      if (cached) {
        const cachedData = JSON.parse(cached) as {
          data: MostOwnedNationalityData[];
          totalRecords: number;
        };
        return { data: cachedData.data, totalRecords: cachedData.totalRecords };
      }
      const sql = `
WITH latest_period AS (
    SELECT MAX(start_date) AS max_date
    FROM dbo.non_saudies_individuals_ownership_national_unique_owners
    WHERE start_date BETWEEN '2025-12-01' AND '2026-02-01'
    ),
    owners_per_nationality AS (
    SELECT
    nationality_ar,
    SUM(total_owners) AS total_owners
    FROM dbo.non_saudies_individuals_ownership_national_unique_owners
    WHERE start_date = (SELECT max_date FROM latest_period)
    GROUP BY nationality_ar
    ),
    properties_per_nationality AS (
    SELECT
    nationality_ar,
    SUM(property_share) AS total_owned_properties
    FROM dbo.non_saudies_individuals_ownership_cities
    WHERE start_date = (SELECT max_date FROM latest_period)
    GROUP BY nationality_ar
    ),
    grand_total AS (
    SELECT SUM(total_owned_properties) AS total
    FROM properties_per_nationality
    ),
    top_city AS (
    SELECT
    nationality_ar,
    city_ar,
    ROW_NUMBER() OVER (
    PARTITION BY nationality_ar
    ORDER BY SUM(property_share) DESC
    ) AS rn
    FROM dbo.non_saudies_individuals_ownership_cities
    WHERE start_date = (SELECT max_date FROM latest_period)
    GROUP BY nationality_ar, city_ar
    )
SELECT
    o.nationality_ar,
    o.total_owners,
    p.total_owned_properties,
    ROUND(p.total_owned_properties / NULLIF(gt.total, 0) * 100, 2) AS ownership_pct,
    tc.city_ar                                                       AS top_city_ar
FROM owners_per_nationality o
         LEFT JOIN properties_per_nationality p  ON o.nationality_ar = p.nationality_ar
         LEFT JOIN top_city tc                   ON o.nationality_ar = tc.nationality_ar AND tc.rn = 1
         CROSS JOIN grand_total gt
ORDER BY p.total_owned_properties DESC
OFFSET ${skip} ROWS FETCH NEXT ${take} ROWS ONLY
      `;

      const countryEnMap: Record<string, string> = {
        كويتي: "Kuwait",
        يمني: "Yemen",
        سوري: "Syria",
        فلسطيني: "West Bank",
        أردني: "Jordan",
        قطري: "Qatar",
        بحريني: "Bahrain",
        مصري: "Egypt",
        إماراتي: "United Arab Emirates",
        بدون: "Unspecified",
        باكستاني: "Pakistan",
        سوداني: "Sudan",
        هندي: "India",
        لبناني: "Lebanon",
        كندي: "Canada",
        أمريكي: "USA",
        "غير سعودي - غير معروف": "Unspecified",
        بريطاني: "England",
        تركي: "Turkey",
        عماني: "Oman",
        أفغاني: "Afghanistan",
        عراقي: "Iraq",
        مغربي: "Morocco",
        اريتيري: "Eritrea",
        صيني: "China",
        بنجلاديشي: "Bangladesh",
        دومينيكا: "Dominican Republic",
        فرنسي: "France",
        ألماني: "Germany",
        اندونيسي: "Indonesia",
        تونسي: "Tunisia",
        أسباني: "Spain",
        جزائري: "Algeria",
        نيجيري: "Nigeria",
        "سانت كيتس ونيفيس": "Saint Kitts and Nevis",
        صومالي: "Somalia",
        استرالي: "Australia",
        مالي: "Mali",
        ايرلندي: "Ireland",
        موريتاني: "Mauritania",
        قبرصي: "Cyprus",
        أثيوبي: "Ethiopia",
        بلجيكي: "Belgium",
        هولندي: "Netherlands",
        تشادي: "Chad",
        روسي: "Russia",
        سويدي: "Sweden",
        نمساوي: "Austria",
        برازيلي: "Brazil",
        ماليزي: "Malaysia",
        كيني: "Kenya",
        اوكراني: "Ukraine",
        إيطالي: "Italy",
        سيرلانكي: "Sri Lanka",
        سنغافوري: "Singapore",
        تايواني: "Taiwan",
        كازاخي: "Kazakhstan",
        برتغالي: "Portugal",
        سويسري: "Switzerland",
        "جنوب افريقي": "South Africa",
        فنزويلي: "Venezuela",
        نرويجي: "Norway",
        "بوركينا فاسو": "Burkina Faso",
        جيبوتي: "Djibouti",
        بلغاري: "Bulgaria",
        مالطي: "Malta",
        بولندي: "Poland",
        بليز: "Belize",
        فلبيني: "Philippines",
        ليبي: "Libya",
        تايلندي: "Thailand",
        سلوفاكي: "Slovakia",
        "سانت لويسا": "Saint Lucia",
        جورجي: "Georgia",
        سنغالي: "Senegal",
        إيراني: "Iran",
        ياباني: "Japan",
        "أفريقيا الوسطى": "Central African Republic",
        بوسني: "Bosnia and Herzegovina",
        أرميني: "Armenia",
        ارجنتيني: "Argentina",
        "ساحل العاج": "Ivory Coast",
        فانواتو: "Vanuatu",
        لوكسمبورغ: "Luxembourg",
        "أنتيجوا وبربودا": "Antigua and Barbuda",
        "كوري جنوبي": "South Korea",
        نيوزلندي: "New Zealand",
        لاتوني: "Latvia",
        اكوادوري: "Ecuador",
        النيجر: "Niger",
        تنزاني: "United Republic of Tanzania",
        بورمي: "Myanmar",
        بيرو: "Peru",
        كاميروني: "Cameroon",
      };

      const count = (await AppDataSource.query(`
        SELECT count(distinct nationality_ar) as count
FROM non_saudies_individuals_ownership_national_unique_owners
`)) as Array<{
        count: number;
      }>;
      const totalRecords = Number(count[0]?.count ?? 0);

      const rows = (await AppDataSource.query(sql)) as Array<{
        nationality_ar: string;
        total_owners: number;
        total_owned_properties: number;
        ownership_pct: number;
        top_city_ar: string;
      }>;
      const data = rows.map((row, index) => {
        const value = Number(row.total_owners ?? 0);
        return {
          rank: skip + index + 1,
          nationality: row.nationality_ar,
          country_en: countryEnMap[row.nationality_ar] ?? null,
          total_owners: value,
          total_properties: row.total_owned_properties,
          owners_percentage: row.ownership_pct,
          top_city: row.top_city_ar,
        };
      });

      await fastify.redis.setex(
        `foreign_ownership_most_owned_nationalities:list:${skip}:${take}`,
        86400,
        JSON.stringify({ data, totalRecords }),
      );

      return { data, totalRecords };
    } catch (error) {
      console.error("⚠️  Error getting most owned nationalities:", error);
      return { data: [] as MostOwnedNationalityData[], totalRecords: 0 };
    }
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("foreignOwnershipGeneralService", {
    getStatistics,
    getCities,
    getDistricts,
    getPropertyTypes,
    getRegions,
    getNationalities,
    getMostOwnedNationalities,
    getMostOwnedRegions,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    foreignOwnershipGeneralService: {
      getStatistics: () => Promise<{ data: GetStatisticsResponse }>;
      getCities: (region?: string | undefined) => Promise<{ data: GetCitiesResponse }>;
      getDistricts: (city: string) => Promise<{ data: GetDistrictsResponse }>;
      getPropertyTypes: () => Promise<{ data: GetPropertyTypesResponse }>;
      getRegions: () => Promise<{ data: GetRegionsResponse }>;
      getNationalities: () => Promise<{ data: GetNationalitiesResponse }>;
      getMostOwnedNationalities: (pagination?: {
        skip: number;
        take: number;
      }) => Promise<{ data: MostOwnedNationalityData[]; totalRecords: number }>;
      getMostOwnedRegions: (pagination?: {
        skip: number;
        take: number;
      }) => Promise<{ data: MostOwnedRegionData[]; totalRecords: number }>;
    };
  }
}
