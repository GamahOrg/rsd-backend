import fp from "fastify-plugin";
import { TResponse as GetPublishedRealEstateCountResponse } from "./schemas/GetPublishedRealEstateCount.schema";
import { TFilter } from "../../../models/types/rer/filter.type";
import { AppDataSource } from "../../../config/database";
import { TResponse as GetCitiesResponse } from "../general/schemas/getCities.schema";
import { TResponse as GetRegionsResponse } from "../general/schemas/getRegions.schema";
import { generateDurationCond, DurationParam } from "../../../helper/rer/filterQueryGenerator";
import { TResponse as GetPublishedRealEstateRatioResponse } from "./schemas/GetPublishedRealEstateRatio.schema";
import { TResponse as GetRegisteredToPublishedParcelsRatioResponse } from "./schemas/GetRegisteredToPublishedParcelsRatio.schema";
import {
  TResponse as GetMapGeneralStatisticsResponse,
  TFilter as GetMapGeneralStatisticsFilterType,
} from "./schemas/GetMapGeneralStatistics.schema";
import { TResponse as GetMapStatisticsByRegionsResponse } from "./schemas/GetMapStatisticsByRegions.schema";
export default fp(async (fastify) => {
  const queryHelper = {
    WEEK: {
      select: ["YearNumber", "WeekOfYearNumber"],
      groupBy: ["YearNumber", "WeekOfYearNumber"],
      orderBy: ["YearNumber DESC", "WeekOfYearNumber ASC"],
    },
    MONTH: {
      select: ["YearNumber", "MonthNumber"],
      groupBy: ["YearNumber", "MonthNumber"],
      orderBy: ["YearNumber DESC", "MonthNumber ASC"],
    },
    QUARTER: {
      select: ["YearNumber", "QuarterNumber"],
      groupBy: ["YearNumber", "QuarterNumber"],
      orderBy: ["YearNumber DESC", "QuarterNumber ASC"],
    },
    YEAR: {
      select: ["YearNumber"],
      groupBy: ["YearNumber"],
      orderBy: ["YearNumber DESC"],
    },
  };

  const getPublishedRealEstateCount = async (filter: TFilter) => {
    try {
      const helper = queryHelper[filter.filter.duration.type as keyof typeof queryHelper];
      const durationSelect = helper?.select || [];
      const durationGroupBy = helper?.groupBy || [];
      const durationOrderBy = helper?.orderBy || [];

      // Build parameters array and positional placeholders
      const parameters: DurationParam[] = [];

      // Generate duration WHERE clause using generateDurationCond
      const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");
      parameters.push(...durationCond.params);
      let paramIndex = durationCond.nextParamIndex;

      // Region parameters (optional, multi-select)
      let regionClause = "";
      if (filter.filter.region && filter.filter.region.length > 0) {
        const regionParams = filter.filter.region
          .map((region) => {
            parameters.push(region);
            return `@${paramIndex++}`;
          })
          .join(", ");
        regionClause = `AND RP.regionar IN (${regionParams})`;
      }

      // City parameters (optional, multi-select)
      let cityClause = "";
      if (filter.filter.city && filter.filter.city.length > 0) {
        const cityParams = filter.filter.city
          .map((city) => {
            parameters.push(city);
            return `@${paramIndex++}`;
          })
          .join(", ");
        cityClause = `AND RP.citynamear IN (${cityParams})`;
      }

      // Determine grouping level: city > region (priority order)
      let labelColumn: string;
      let groupByColumn: string;
      let selectColumn: string;
      if (filter.filter.city && filter.filter.city.length > 0) {
        labelColumn = "RP.citynamear";
        groupByColumn = "RP.regionar, RP.citynamear";
        selectColumn = "RP.regionar AS Region, RP.citynamear as City";
      } else {
        labelColumn = "RP.regionar";
        groupByColumn = "RP.regionar";
        selectColumn = "RP.regionar AS Region";
      }

      // Build the query with duration condition
      const sql = `
        SELECT 
          ${durationSelect.join(", ")},
          ${labelColumn} AS Label,
          sum(no_of_realestates) as Count,
          ${selectColumn}
        FROM "RER_Published" AS RP
        WHERE ${durationCond.clause}
        ${regionClause}
        ${cityClause}
        GROUP BY 
          ${durationGroupBy.join(", ")},
          ${groupByColumn}
        ORDER BY
          ${durationOrderBy.join(", ")}
      `;

      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetPublishedRealEstateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting published real estate count:", error);
      return { data: [] as unknown as GetPublishedRealEstateCountResponse };
    }
  };

  const getPublishedRealEstateRatio = async (filter: TFilter) => {
    try {
      // Build parameters array and positional placeholders
      const parameters: DurationParam[] = [];
      let paramIndex = 0;

      // Region parameters (optional, multi-select)
      let regionClause = "";
      if (filter.filter.region && filter.filter.region.length > 0) {
        const regionParams = filter.filter.region
          .map((region) => {
            parameters.push(region);
            return `@${paramIndex++}`;
          })
          .join(", ");
        regionClause = `AND a.regionar IN (${regionParams})`;
      }

      // City parameters (optional, multi-select)
      let cityClause = "";
      if (filter.filter.city && filter.filter.city.length > 0) {
        const cityParams = filter.filter.city
          .map((city) => {
            parameters.push(city);
            return `@${paramIndex++}`;
          })
          .join(", ");
        cityClause = `AND a.citynamear IN (${cityParams})`;
      }

      // Determine grouping level: city > region (priority order)
      let labelColumn: string;
      let groupByColumn: string;
      let selectColumn: string;
      let notNullClause: string;
      if (filter.filter.city && filter.filter.city.length > 0) {
        labelColumn = "a.citynamear";
        groupByColumn = "a.regionar, a.citynamear";
        selectColumn = "a.regionar AS Region, a.citynamear as City";
        notNullClause = "a.regionar IS NOT NULL AND a.citynamear IS NOT NULL";
      } else {
        labelColumn = "a.regionar";
        groupByColumn = "a.regionar";
        selectColumn = "a.regionar AS Region";
        notNullClause = "a.regionar IS NOT NULL";
      }

      // Build the query with duration condition
      const sql = `
       select 
       ${labelColumn} as Label,
       max(b.sdi) as total_no_of_realestates, 
       sum([no_of_realestates]) as no_of_announced_realestates,
                CASE
            WHEN MAX(b.sdi) = 0 THEN 0
            ELSE ROUND(sum([no_of_realestates]) * 100.0 / MAX(b.sdi), 2)
          END AS Ratio,
        ${selectColumn}
  FROM [dbo].[RER_Published] a
  left join  [dbo].[RER_SDI] b
  ON a.regionar LIKE '%' + LTRIM(RTRIM(REPLACE(b.region, CHAR(160), ' '))) + '%'
   WHERE ${notNullClause}
        ${regionClause}
        ${cityClause}
  group by  ${groupByColumn}
          ORDER BY
          ${labelColumn}
`;
      const data = await AppDataSource.query(sql, parameters);
      return { data: data as unknown as GetPublishedRealEstateRatioResponse };
    } catch (error) {
      console.error("⚠️  Error getting published real estate ratio:", error);
      return { data: [] as unknown as GetPublishedRealEstateRatioResponse };
    }
  };

  const getRegisteredToPublishedParcelsRatio = async (filter: TFilter) => {
    try {
      const propertyType = filter.filter?.propertyType;
      const parameters: DurationParam[] = [];
      let paramIndex = 0;

      // PropertyType parameter (optional)
      let propertyTypeClause = "";
      if (propertyType) {
        propertyTypeClause = `AND b.PropertyUse = @${paramIndex++}`;
        parameters.push(propertyType);
      }

      // Region parameters (optional, multi-select)
      let regionClause = "";
      if (filter.filter.region && filter.filter.region.length > 0) {
        const regionParams = filter.filter.region
          .map((region) => {
            parameters.push(region);
            return `@${paramIndex++}`;
          })
          .join(", ");
        regionClause = `AND a.regionar IN (${regionParams})`;
      }

      // City parameters (optional, multi-select)
      let cityClause = "";
      if (filter.filter.city && filter.filter.city.length > 0) {
        const cityParams = filter.filter.city
          .map((city) => {
            parameters.push(city);
            return `@${paramIndex++}`;
          })
          .join(", ");
        cityClause = `AND a.citynamear IN (${cityParams})`;
      }

      // Determine grouping level: city > region (priority order)
      let labelColumn: string;
      let groupByColumn: string;
      let selectColumn: string;
      let notNullClause: string;
      if (filter.filter.city && filter.filter.city.length > 0) {
        labelColumn = "a.citynamear";
        groupByColumn = "a.regionar, a.citynamear";
        selectColumn = "a.regionar AS Region, a.citynamear as City";
        notNullClause = "a.regionar IS NOT NULL AND a.citynamear IS NOT NULL";
      } else {
        labelColumn = "a.regionar";
        groupByColumn = "a.regionar";
        selectColumn = "a.regionar AS Region";
        notNullClause = "a.regionar IS NOT NULL";
      }

      const sql = `
      WITH Titles_Aggregated AS (
    SELECT 
        CASE 
            WHEN RegionNameAr = N'المنطقة الشرقية' THEN N'الشرقية'
            WHEN RegionNameAr = N'منطقة الجوف' THEN N'الجوف'
            WHEN RegionNameAr = N'منطقة الحدود الشمالية' THEN N'الحدود الشمالية '
            WHEN RegionNameAr = N'منطقة الرياض' THEN N'الرياض '
            WHEN RegionNameAr = N'منطقة القصيم' THEN N'القصيم '
            WHEN RegionNameAr = N'منطقة المدينة المنورة' THEN N'المدينة المنورة'
            WHEN RegionNameAr = N'منطقة تبوك' THEN N'تبوك'
            WHEN RegionNameAr = N'منطقة حائل' THEN N'حائل'
            WHEN RegionNameAr = N'منطقة مكة المكرمة' THEN N'مكة المكرمة'
            ELSE RegionNameAr 
        END AS MappedRegion,

        CASE 
            WHEN CityNameAr = N'الزلفى' THEN N'الزلفي'
            WHEN CityNameAr = N'المجمعه' THEN N'المجمعة'
            WHEN CityNameAr = N'وادى الدواسر' THEN N'وادي الدواسر'
            WHEN CityNameAr = N'ضرماء' THEN N'ضرما' 
            ELSE CityNameAr 
        END AS MappedCity,
        COUNT(DISTINCT RealEstate_Number) AS RealEstateNumber_count
    
    FROM [dbo].[RER_Titles]
    GROUP BY 
        CASE 
            WHEN RegionNameAr = N'المنطقة الشرقية' THEN N'الشرقية'
            WHEN RegionNameAr = N'منطقة الجوف' THEN N'الجوف'
            WHEN RegionNameAr = N'منطقة الحدود الشمالية' THEN N'الحدود الشمالية '
            WHEN RegionNameAr = N'منطقة الرياض' THEN N'الرياض '
            WHEN RegionNameAr = N'منطقة القصيم' THEN N'القصيم '
            WHEN RegionNameAr = N'منطقة المدينة المنورة' THEN N'المدينة المنورة'
            WHEN RegionNameAr = N'منطقة تبوك' THEN N'تبوك'
            WHEN RegionNameAr = N'منطقة حائل' THEN N'حائل'
            WHEN RegionNameAr = N'منطقة مكة المكرمة' THEN N'مكة المكرمة'
            ELSE RegionNameAr 
        END,
        CASE 
            WHEN CityNameAr = N'الزلفى' THEN N'الزلفي'
            WHEN CityNameAr = N'المجمعه' THEN N'المجمعة'
            WHEN CityNameAr = N'وادى الدواسر' THEN N'وادي الدواسر'
            WHEN CityNameAr = N'ضرماء' THEN N'ضرما' 
            ELSE CityNameAr 
        END
)

SELECT 
    ${labelColumn} AS Label,
    SUM(a.[no_of_realestates]) AS [no_of_announced_realestates],
    ISNULL(SUM(b.RealEstateNumber_count), 0) AS total_no_of_realestates,
    ${selectColumn}
FROM [dbo].[RER_Published] a
LEFT JOIN Titles_Aggregated b ON 
    a.regionar = b.MappedRegion
    AND a.CityNameAr = b.MappedCity
        WHERE ${notNullClause}
        ${regionClause}
        ${cityClause}
        ${propertyTypeClause}
GROUP BY 
    ${groupByColumn}
            ORDER BY
          ${labelColumn}
      `;
      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetRegisteredToPublishedParcelsRatioResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered to published parcels ratio:", error);
      return { data: [] as unknown as GetRegisteredToPublishedParcelsRatioResponse };
    }
  };

  const getCities = async (region?: string | undefined) => {
    const cached = await fastify.redis.get(`rer_published_cities:list:${region}`);
    if (cached) {
      return { data: JSON.parse(cached) as GetCitiesResponse };
    }
    const citiesRepo = AppDataSource.createQueryBuilder()
      .from("RER_Published", "RP")
      .select("RP.citynamear", "value")
      .addSelect("RP.citynamear", "label")
      .distinct(true)
      .where("RP.citynamear IS NOT NULL")
      .andWhere("RP.regionar != ''");

    if (region) {
      citiesRepo.andWhere("RP.regionar = :region", { region });
    }
    let data = await citiesRepo.orderBy("RP.citynamear", "ASC").getRawMany();
    try {
      await fastify.redis.setex(`rer_published_cities:list:${region}`, 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetCitiesResponse };
  };

  const getRegions = async () => {
    const cached = await fastify.redis.get("rer_published_regions:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetRegionsResponse };
    }
    const query = AppDataSource.createQueryBuilder()
      .from("RER_Published", "RP")
      .select("RP.regionar", "value")
      .addSelect("RP.regionar", "label")
      .distinct(true)
      .where("RP.regionar IS NOT NULL")
      .andWhere("RP.regionar != ''")
      .orderBy("RP.regionar", "ASC");
    const data = await query.getRawMany();
    try {
      await fastify.redis.setex("rer_published_regions:list", 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetRegionsResponse };
  };

  const getMapGeneralStatistics = async (filter: GetMapGeneralStatisticsFilterType) => {
    try {
      let queries: Array<Array<{ count: number | string }>> = [];
      if (filter.filter.region && filter.filter.region.length > 0) {
        queries = await Promise.all([
          AppDataSource.query(
            `SELECT count( distinct CityNameAr) AS count FROM "RER_Published" WHERE 1=1 ${generateWhereClause(filter)}`,
          ), //no_of_announced
          AppDataSource.query(
            `SELECT COUNT(distinct CityNameAr) AS count FROM "RER_Published" WHERE GETDATE() between Register_start_date and Register_end_date ${generateWhereClause(filter)}`, //no_of_announced_active
          ),
          AppDataSource.query(
            `SELECT COUNT(distinct CityNameAr) AS count FROM "RER_Published" WHERE GETDATE() >   Register_end_date`, //no_of_announced_expired
          ),
          AppDataSource.query(`SELECT count (distinct RealEstate_Number) as count FROM [dbo].[RER_Titles]  where requestname='First Registration' 
          AND RegionNameAr IN (${filter.filter.region.map((region) => `N'${region}'`).join(", ")})
        `), //no_of_registered_realestates
        ]);
      } else {
        queries = await Promise.all([
          AppDataSource.query(`SELECT COUNT(*) AS count FROM "RER_Published"`), //no_of_announced
          AppDataSource.query(
            `SELECT COUNT(*) AS count FROM "RER_Published" WHERE GETDATE() between Register_start_date and Register_end_date`, //no_of_announced_active
          ),
          AppDataSource.query(
            `SELECT COUNT(*) AS count FROM "RER_Published" WHERE GETDATE() >   Register_end_date`, //no_of_announced_expired
          ),
          AppDataSource.query(
            `SELECT count (distinct RealEstate_Number) as count FROM [dbo].[RER_Titles]  where requestname='First Registration' `,
          ), //no_of_registered_realestates
        ]);
      }

      const [
        no_of_announced,
        no_of_announced_active,
        no_of_announced_expired,
        no_of_registered_realestates,
      ] = queries;
      const data = {
        no_of_announced_active: parseInt(no_of_announced_active?.[0]?.count?.toString() ?? "0", 10),
        no_of_announced_expired: parseInt(
          no_of_announced_expired?.[0]?.count?.toString() ?? "0",
          10,
        ),
        no_of_announced: parseInt(no_of_announced?.[0]?.count?.toString() ?? "0", 10),
        no_of_registered_realestates: parseInt(
          no_of_registered_realestates?.[0]?.count?.toString() ?? "0",
          10,
        ),
      };
      return { data: data as unknown as GetMapGeneralStatisticsResponse };
    } catch (error) {
      console.error("⚠️  Error getting map general statistics:", error);
      return {
        data: {
          no_of_announced_active: 0,
          no_of_announced_expired: 0,
          no_of_announced: 0,
          no_of_registered_realestates: 0,
        } as GetMapGeneralStatisticsResponse,
      };
    }
  };

  const generateWhereClause = (filter: GetMapGeneralStatisticsFilterType) => {
    let whereClause = "";
    if (filter.filter.region && filter.filter.region.length > 0) {
      whereClause += `AND RegionAr IN (${filter.filter.region.map((region) => `N'${region}'`).join(", ")})`;
    }
    return whereClause;
  };

  const getMapStatisticsByRegions = async () => {
    try {
      const query = AppDataSource.query(`WITH Published_Aggregates AS (
    SELECT 
        RegionAr,
        region_shape,
        -- إجمالي عدد القطع المعلنة
        SUM([no_of_realestates]) AS no_of_announced_realestates,
        -- إجمالي القطع النشطة
        SUM(CASE 
            WHEN GETDATE() BETWEEN CONVERT(DATE, [Register_start_date]) AND CONVERT(DATE, [Register_end_date]) 
            THEN [no_of_realestates] 
            ELSE 0 
        END) AS Active_RealEstates,
        
        -- إجمالي القطع المنتهية
        SUM(CASE 
            WHEN GETDATE() > CONVERT(DATE, [Register_end_date]) 
            THEN [no_of_realestates] 
            ELSE 0 
        END) AS Ended_RealEstates,
        
        -- إجمالي القطع التي ستعلن قريبا
        SUM(CASE 
            WHEN GETDATE() < CONVERT(DATE, Published_Date) 
            THEN [no_of_realestates] 
            ELSE 0 
        END) AS Soon_RealEstates
    FROM [dbo].[RER_Published]
    GROUP BY 
        RegionAr,
        region_shape
),

SDI_Data AS (
    -- إجمالي عدد القطع 
    SELECT 
        Region, 
        region_shape, 
        MAX(sdi) AS Max_SDI
    FROM [dbo].[RER_SDI]
    GROUP BY 
        Region, 
        region_shape
),

Titles_Data AS (
    -- عدد العقارات المسجله حسب المنطقة (Updated for Regional Totals)
    SELECT 
        RegionNameAr, -- Update this if your region column in RER_Titles has a different name
        COUNT(DISTINCT RealEstate_Number) AS RealEstateNumber_count
    FROM [dbo].[RER_Titles] 
    WHERE requestname = 'First Registration'
    GROUP BY 
        RegionNameAr
)

SELECT 
    p.RegionAr as region_ar,
    p.no_of_announced_realestates as no_of_announced_realestates,
    p.Active_RealEstates as no_of_active_realestates,
    p.Ended_RealEstates as no_of_expired_realestates,
    p.Soon_RealEstates as no_of_to_be_announced_realestates,
   ISNULL(t.RealEstateNumber_count, 0) AS no_of_registered_realestates, 
    s.Max_SDI as total_no_of_realestates
FROM Published_Aggregates p
LEFT JOIN SDI_Data s 
    ON p.region_shape = s.region_shape 
LEFT JOIN Titles_Data t 
    ON p.RegionAr = t.RegionNameAr
    ORDER BY no_of_announced_realestates DESC;
`);
      const data = await query;
      return { data: data as unknown as GetMapStatisticsByRegionsResponse };
    } catch (error) {
      console.error("⚠️  Error getting map statistics by regions:", error);
      return { data: [] as unknown as GetMapStatisticsByRegionsResponse };
    }
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerPublishedService", {
    getPublishedRealEstateCount,
    getPublishedRealEstateRatio,
    getRegisteredToPublishedParcelsRatio,
    getCities,
    getRegions,
    getMapGeneralStatistics,
    getMapStatisticsByRegions,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerPublishedService: {
      getMapStatisticsByRegions: () => Promise<{ data: GetMapStatisticsByRegionsResponse }>;
      getPublishedRealEstateCount: (
        filter: TFilter,
      ) => Promise<{ data: GetPublishedRealEstateCountResponse }>;
      getPublishedRealEstateRatio: (
        filter: TFilter,
      ) => Promise<{ data: GetPublishedRealEstateRatioResponse }>;
      getRegisteredToPublishedParcelsRatio: (
        filter: TFilter,
      ) => Promise<{ data: GetRegisteredToPublishedParcelsRatioResponse }>;
      getCities: (region?: string | undefined) => Promise<{ data: GetCitiesResponse }>;
      getRegions: () => Promise<{ data: GetRegionsResponse }>;
      getMapGeneralStatistics: (
        filter: GetMapGeneralStatisticsFilterType,
      ) => Promise<{ data: GetMapGeneralStatisticsResponse }>;
    };
  }
}
