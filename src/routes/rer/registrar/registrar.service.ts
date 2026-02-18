import fp from "fastify-plugin";
import { TResponse as GetRegistrarCountResponse } from "./schemas/GetRegistrarCount.schema";
import { TFilter } from "../../../models/types/rer/filter.type";
import { AppDataSource } from "../../../config/database";
import { TResponse as GetRegionsResponse } from "../general/schemas/getRegions.schema";
import { TResponse as GetCitiesResponse } from "../general/schemas/getCities.schema";
import { TResponse as GetRegistrarLineChartCountResponse } from "./schemas/GetRegistrarLineChartCount.schema";
import { generateDurationCond, DurationParam } from "../../../helper/rer/filterQueryGenerator";

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

  const getRegistrarCount = async (filter: TFilter) => {
    try {
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
        regionClause = `AND T.RegionName IN (${regionParams})`;
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
        cityClause = `AND T.CityName IN (${cityParams})`;
      }

      // Determine grouping level: district > city > region (priority order)
      let labelColumn: string;
      let groupByColumn: string;
      let notNullClause: string;
      if (filter.filter.city && filter.filter.city.length > 0) {
        labelColumn = "T.CityName";
        groupByColumn = "T.RegionName, T.CityName";
        notNullClause = "T.RegionName IS NOT NULL AND T.CityName IS NOT NULL";
      } else {
        labelColumn = "T.RegionName";
        groupByColumn = "T.RegionName";
        notNullClause = "T.RegionName IS NOT NULL";
      }

      // Build the query with duration condition
      const sql = `
        SELECT 
          ${labelColumn} AS label,
          count(NationalId) AS count
        FROM RER_Realestate_Register AS T
        WHERE ${durationCond.clause}
        AND LicenseStatus = 'ApprovedFromApproval'
         AND ${notNullClause}
          ${regionClause}
          ${cityClause}
        GROUP BY ${groupByColumn}
      `;
      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetRegistrarCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered real estate count:", error);
      return { data: [] as unknown as GetRegistrarCountResponse };
    }
  };

  const getRegions = async () => {
    const query = AppDataSource.createQueryBuilder()
      .from("RER_Realestate_Register", "T")
      .select("T.RegionName", "value")
      .addSelect("T.RegionName", "label")
      .distinct(true)
      .where("T.RegionName IS NOT NULL")
      .andWhere("T.RegionName != ''")
      .orderBy("T.RegionName", "ASC");
    const data = await query.getRawMany();
    return { data: data as unknown as GetRegionsResponse };
  };

  const getCities = async (region?: string | undefined) => {
    const cached = await fastify.redis.get(`rer_register_cities:list:${region}`);
    if (cached) {
      return { data: JSON.parse(cached) as GetCitiesResponse };
    }
    const citiesRepo = AppDataSource.createQueryBuilder()
      .from("RER_Realestate_Register", "rrr")
      .select("rrr.CityName", "value")
      .addSelect("rrr.CityName", "label")
      .distinct(true)
      .where("rrr.CityName IS NOT NULL")
      .andWhere("rrr.RegionName IS NOT NULL");

    if (region) {
      citiesRepo.andWhere("rrr.RegionName = :region", { region });
    }
    let data = await citiesRepo.orderBy("rrr.CityName", "ASC").getRawMany();
    try {
      await fastify.redis.setex(`rer_register_cities:list:${region}`, 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetCitiesResponse };
  };

  const getRegistrarLineChartCount = async (filter: TFilter) => {
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
        regionClause = `AND rrr.RegionName IN (${regionParams})`;
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
        cityClause = `AND rrr.CityName IN (${cityParams})`;
      }

      // Determine grouping level: city > region (priority order)
      let labelColumn: string;
      let notNullClause: string;
      let groupByColumn: string;
      if (filter.filter.city && filter.filter.city.length > 0) {
        notNullClause = "rrr.RegionName IS NOT NULL AND rrr.CityName IS NOT NULL";
        groupByColumn = "rrr.RegionName, rrr.CityName";
        labelColumn = "rrr.CityName";
      } else {
        notNullClause = "rrr.RegionName IS NOT NULL";
        groupByColumn = "rrr.RegionName";
        labelColumn = "rrr.RegionName";
      }

      // Build the query with duration condition
      const sql = `
        SELECT 
          ${durationSelect.join(", ")},
          COUNT(*) AS Count,
          ${labelColumn} AS Label
        FROM "RER_Realestate_Register" AS rrr
        WHERE ${durationCond.clause}
        AND rrr.LicenseStatus = 'ApprovedFromApproval'
          AND ${notNullClause}
          ${regionClause}
          ${cityClause}
        GROUP BY 
          ${durationGroupBy.join(", ")},
          ${groupByColumn}
        ORDER BY
          ${durationOrderBy.join(", ")},
          Count DESC
      `;
      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetRegistrarLineChartCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registrar line chart count:", error);
      return { data: [] as unknown as GetRegistrarLineChartCountResponse };
    }
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerRegistrarService", {
    getRegistrarCount,
    getRegions,
    getCities,
    getRegistrarLineChartCount,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerRegistrarService: {
      getRegistrarCount: (filter: TFilter) => Promise<{ data: GetRegistrarCountResponse }>;
      getRegions: () => Promise<{ data: GetRegionsResponse }>;
      getCities: (region?: string | undefined) => Promise<{ data: GetCitiesResponse }>;
      getRegistrarLineChartCount: (
        filter: TFilter,
      ) => Promise<{ data: GetRegistrarLineChartCountResponse }>;
    };
  }
}
