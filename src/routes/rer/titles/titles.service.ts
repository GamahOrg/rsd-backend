import fp from "fastify-plugin";
import {
  TResponse as GetTitlesByRegionResponse,
  TBody as TTitlesByRegionFilter,
} from "./schemas/getTitlesByRegion.schema";
import { TResponse as GetRegisteredRealEstateCountResponse } from "./schemas/GetRegisteredRealEstateCount.schema";
import { TResponse as GetTransactionsCountByTradeTypeResponse } from "./schemas/GetTransactionsCountByTradeType.schema";
import { TResponse as GetTransactionsCountByTradeChannelResponse } from "./schemas/GetTransactionsCountByTradeChannel.schema";
import { TFilter } from "../../../models/types/rer/filter.type";
import { AppDataSource } from "../../../config/database";
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

  const getTitlesByRegion = async (filter: TTitlesByRegionFilter) => {
    const propertyType = filter.filter?.propertyType;
    const duration = filter.filter?.duration;

    if (!duration) {
      return { data: [] as unknown as GetTitlesByRegionResponse };
    }

    const parameters: DurationParam[] = [];
    // Generate duration WHERE clause using generateDurationCond
    const durationCond = generateDurationCond(duration, 0, "WeekOfYearNumber");
    parameters.push(...durationCond.params);
    let paramIndex = durationCond.nextParamIndex;

    // PropertyType parameter (optional)
    let propertyTypeClause = "";
    if (propertyType) {
      propertyTypeClause = `AND T.PropertyUse = @${paramIndex++}`;
      parameters.push(propertyType);
    }

    const sql = `
      SELECT 
        T.RegionNameAr AS label,
        COUNT(distinct RealEstate_Number) AS count
      FROM "RER_Titles" AS T
      WHERE ${durationCond.clause}
        AND T.requestname='First Registration'
        AND T.RegionNameAr IS NOT NULL
        ${propertyTypeClause}
      GROUP BY T.RegionNameAr
      ORDER BY count DESC
    `;
    const data = await AppDataSource.query(sql, parameters);
    return { data: data as unknown as GetTitlesByRegionResponse };
  };

  const getTitlesAreaByRegion = async (filter: TTitlesByRegionFilter) => {
    const propertyType = filter.filter?.propertyType;
    const duration = filter.filter?.duration;

    if (!duration) {
      return { data: [] as unknown as GetTitlesByRegionResponse };
    }

    const parameters: DurationParam[] = [];

    // Generate duration WHERE clause using generateDurationCond
    const durationCond = generateDurationCond(duration, 0, "WeekOfYearNumber");
    parameters.push(...durationCond.params);
    let paramIndex = durationCond.nextParamIndex;

    // PropertyType parameter (optional)
    let propertyTypeClause = "";
    if (propertyType) {
      propertyTypeClause = `AND T.PropertyUse = @${paramIndex++}`;
      parameters.push(propertyType);
    }

    const sql = `
      SELECT 
        T.RegionNameAr AS label,
        SUM(T.AreaSize) AS count
      FROM "RER_Titles" AS T
      WHERE ${durationCond.clause}
        AND T.requestname='First Registration'
        AND T.RegionNameAr IS NOT NULL
        ${propertyTypeClause}
      GROUP BY T.RegionNameAr
      ORDER BY count DESC
    `;

    const data = await AppDataSource.query(sql, parameters);
    return { data: data as unknown as GetTitlesByRegionResponse };
  };

  const getRegisteredRealEstateCount = async (filter: TFilter) => {
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
        regionClause = `AND T.RegionNameAr IN (${regionParams})`;
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
        cityClause = `AND T.CityNameAr IN (${cityParams})`;
      }

      // District parameters (optional, multi-select)
      let districtClause = "";
      if (filter.filter.district && filter.filter.district.length > 0) {
        const districtParams = filter.filter.district
          .map((district) => {
            parameters.push(district);
            return `@${paramIndex++}`;
          })
          .join(", ");
        districtClause = `AND T.DistrictNameAr IN (${districtParams})`;
      }

      // PropertyType parameter (optional)
      let propertyTypeClause = "";
      if (filter.filter.propertyType) {
        propertyTypeClause = `AND T.PropertyUse = @${paramIndex++}`;
        parameters.push(filter.filter.propertyType);
      }

      // Determine grouping level: district > city > region (priority order)
      let labelColumn: string;
      let groupByColumn: string;
      let selectColumn: string;
      let notNullClause: string;
      if (filter.filter.district && filter.filter.district.length > 0) {
        labelColumn = "T.DistrictNameAr";
        groupByColumn = "T.RegionNameAr, T.CityNameAr, T.DistrictNameAr";
        selectColumn =
          "T.RegionNameAr AS Region, T.CityNameAr as City, T.DistrictNameAr as District";
        notNullClause =
          "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL AND T.DistrictNameAr IS NOT NULL";
      } else if (filter.filter.city && filter.filter.city.length > 0) {
        labelColumn = "T.CityNameAr";
        groupByColumn = "T.RegionNameAr, T.CityNameAr";
        selectColumn = "T.RegionNameAr AS Region, T.CityNameAr as City";
        notNullClause = "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL";
      } else {
        labelColumn = "T.RegionNameAr";
        groupByColumn = "T.RegionNameAr";
        selectColumn = "T.RegionNameAr AS Region";
        notNullClause = "T.RegionNameAr IS NOT NULL";
      }

      // Build the query with duration condition
      const sql = `
        SELECT 
          ${durationSelect.join(", ")},
          ${labelColumn} AS Label,
          COUNT(distinct RealEstate_Number) AS Count,
          ${selectColumn}
        FROM "RER_Titles" AS T 
        WHERE ${durationCond.clause}
        AND T.requestname='First Registration'
          AND ${notNullClause}
          ${regionClause}
          ${cityClause}
          ${districtClause}
          ${propertyTypeClause}
        GROUP BY 
          ${durationGroupBy.join(", ")},
          ${groupByColumn}
        ORDER BY
          ${durationOrderBy.join(", ")},
          Count DESC
      `;

      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetRegisteredRealEstateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered real estate count:", error);
      return { data: [] as unknown as GetRegisteredRealEstateCountResponse };
    }
  };

  const getRegisteredRealEstateTotalArea = async (filter: TFilter) => {
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
        regionClause = `AND T.RegionNameAr IN (${regionParams})`;
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
        cityClause = `AND T.CityNameAr IN (${cityParams})`;
      }

      // District parameters (optional, multi-select)
      let districtClause = "";
      if (filter.filter.district && filter.filter.district.length > 0) {
        const districtParams = filter.filter.district
          .map((district) => {
            parameters.push(district);
            return `@${paramIndex++}`;
          })
          .join(", ");
        districtClause = `AND T.DistrictNameAr IN (${districtParams})`;
      }

      // PropertyType parameter (optional)
      let propertyTypeClause = "";
      if (filter.filter.propertyType) {
        propertyTypeClause = `AND T.PropertyUse = @${paramIndex++}`;
        parameters.push(filter.filter.propertyType);
      }

      // Determine grouping level: district > city > region (priority order)
      let labelColumn: string;
      let groupByColumn: string;
      let selectColumn: string;
      let notNullClause: string;
      if (filter.filter.district && filter.filter.district.length > 0) {
        labelColumn = "T.DistrictNameAr";
        groupByColumn = "T.RegionNameAr, T.CityNameAr, T.DistrictNameAr";
        selectColumn =
          "T.RegionNameAr AS Region, T.CityNameAr as City, T.DistrictNameAr as District";
        notNullClause =
          "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL AND T.DistrictNameAr IS NOT NULL";
      } else if (filter.filter.city && filter.filter.city.length > 0) {
        labelColumn = "T.CityNameAr";
        groupByColumn = "T.RegionNameAr, T.CityNameAr";
        selectColumn = "T.RegionNameAr AS Region, T.CityNameAr as City";
        notNullClause = "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL";
      } else {
        labelColumn = "T.RegionNameAr";
        groupByColumn = "T.RegionNameAr";
        selectColumn = "T.RegionNameAr AS Region";
        notNullClause = "T.RegionNameAr IS NOT NULL";
      }

      // Build the query with duration condition
      const sql = `
        SELECT 
          ${durationSelect.join(", ")},
          ${labelColumn} AS Label,
          SUM(T.AreaSize) AS Count,
          ${selectColumn}
        FROM "RER_Titles" AS T
        WHERE ${durationCond.clause}
        AND T.requestname='First Registration'
          AND ${notNullClause}
          ${regionClause}
          ${cityClause}
          ${districtClause}
          ${propertyTypeClause}
        GROUP BY 
          ${durationGroupBy.join(", ")},
          ${groupByColumn}
        ORDER BY
          ${durationOrderBy.join(", ")},
          Count DESC
      `;

      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetRegisteredRealEstateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered real estate total area:", error);
      return { data: [] as unknown as GetRegisteredRealEstateCountResponse };
    }
  };

  const getTransactionsCountByTradeType = async (filter: TFilter) => {
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
        regionClause = `AND T.RegionNameAr IN (${regionParams})`;
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
        cityClause = `AND T.CityNameAr IN (${cityParams})`;
      }

      // District parameters (optional, multi-select)
      let districtClause = "";
      if (filter.filter.district && filter.filter.district.length > 0) {
        const districtParams = filter.filter.district
          .map((district) => {
            parameters.push(district);
            return `@${paramIndex++}`;
          })
          .join(", ");
        districtClause = `AND T.DistrictNameAr IN (${districtParams})`;
      }

      // PropertyType parameter (optional)
      let propertyTypeClause = "";
      if (filter.filter.propertyType) {
        propertyTypeClause = `AND T.PropertyUse = @${paramIndex++}`;
        parameters.push(filter.filter.propertyType);
      }

      // Determine grouping level: district > city > region (priority order)
      let groupByColumn: string;
      let selectColumn: string;
      let notNullClause: string;
      if (filter.filter.district && filter.filter.district.length > 0) {
        groupByColumn = "T.RegionNameAr, T.CityNameAr, T.DistrictNameAr";
        selectColumn =
          "T.RegionNameAr AS Region, T.CityNameAr as City, T.DistrictNameAr as District";
        notNullClause =
          "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL AND T.DistrictNameAr IS NOT NULL";
      } else if (filter.filter.city && filter.filter.city.length > 0) {
        groupByColumn = "T.RegionNameAr, T.CityNameAr";
        selectColumn = "T.RegionNameAr AS Region, T.CityNameAr as City";
        notNullClause = "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL";
      } else {
        groupByColumn = "T.RegionNameAr";
        selectColumn = "T.RegionNameAr AS Region";
        notNullClause = "T.RegionNameAr IS NOT NULL";
      }

      // Build the query with duration condition
      const sql = `
        SELECT 
          COUNT(*) as Count,
          CASE WHEN TransferType='Gift' THEN N'هبة'
          WHEN TransferType='Sale' THEN N'بيع' WHEN TransferType='Inheritance' THEN N'ورث'
          WHEN TransferType='Compulsory Acquisition' THEN N'الاستحواذ الإلزامي' END as Label
        FROM "RER_Titles" AS T
        WHERE ${durationCond.clause}
        AND T.requestname='Transfer of Ownership'
        AND T.TransferType IS NOT NULL
          AND ${notNullClause}
          ${regionClause}
          ${cityClause}
          ${districtClause}
          ${propertyTypeClause}
        GROUP BY 
          CASE WHEN TransferType='Gift' THEN N'هبة'
          WHEN TransferType='Sale' THEN N'بيع' WHEN TransferType='Inheritance' THEN N'ورث'
          WHEN TransferType='Compulsory Acquisition' THEN N'الاستحواذ الإلزامي' END
      `;

      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetRegisteredRealEstateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered real estate total area:", error);
      return { data: [] as unknown as GetRegisteredRealEstateCountResponse };
    }
  };

  const getTransactionsCountByTradeChannel = async (filter: TFilter) => {
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
        regionClause = `AND T.RegionNameAr IN (${regionParams})`;
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
        cityClause = `AND T.CityNameAr IN (${cityParams})`;
      }

      // District parameters (optional, multi-select)
      let districtClause = "";
      if (filter.filter.district && filter.filter.district.length > 0) {
        const districtParams = filter.filter.district
          .map((district) => {
            parameters.push(district);
            return `@${paramIndex++}`;
          })
          .join(", ");
        districtClause = `AND T.DistrictNameAr IN (${districtParams})`;
      }

      // Build the query with duration condition
      const sql = `
SELECT 
    COUNT(DISTINCT CASE WHEN CaseNumber LIKE 'TR%' THEN CaseNumber END) AS TR_Count,
    COUNT(DISTINCT CASE WHEN CaseNumber LIKE 'DT%' THEN CaseNumber END) AS DT_Count
FROM "RER_Titles" AS T
WHERE ${durationCond.clause}
AND T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL AND T.DistrictNameAr IS NOT NULL
${regionClause}
${cityClause}
${districtClause}`;

      const query = AppDataSource.query(sql, parameters);
      let data = await query;
      data =
        Array.isArray(data) && data.length > 0
          ? [
              {
                label: "فرع",
                count: (data[0] as { TR_Count: number }).TR_Count ?? 0,
              },
              {
                label: "الكتروني",
                count: (data[0] as { DT_Count: number }).DT_Count ?? 0,
              },
            ]
          : [];

      return { data: data as unknown as GetTransactionsCountByTradeChannelResponse };
    } catch (error) {
      console.error("⚠️  Error getting transactions count by trade channel:", error);
      return { data: [] as unknown as GetTransactionsCountByTradeChannelResponse };
    }
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerTitlesService", {
    getTitlesByRegion,
    getTitlesAreaByRegion,
    getRegisteredRealEstateCount,
    getRegisteredRealEstateTotalArea,
    getTransactionsCountByTradeType,
    getTransactionsCountByTradeChannel,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerTitlesService: {
      getRegisteredRealEstateCount: (
        filter: TFilter,
      ) => Promise<{ data: GetRegisteredRealEstateCountResponse }>;
      getTitlesByRegion: (
        filter: TTitlesByRegionFilter,
      ) => Promise<{ data: GetTitlesByRegionResponse }>;
      getTitlesAreaByRegion: (
        filter: TTitlesByRegionFilter,
      ) => Promise<{ data: GetTitlesByRegionResponse }>;
      getRegisteredRealEstateTotalArea: (
        filter: TFilter,
      ) => Promise<{ data: GetRegisteredRealEstateCountResponse }>;
      getTransactionsCountByTradeType: (
        filter: TFilter,
      ) => Promise<{ data: GetTransactionsCountByTradeTypeResponse }>;
      getTransactionsCountByTradeChannel: (
        filter: TFilter,
      ) => Promise<{ data: GetTransactionsCountByTradeChannelResponse }>;
    };
  }
}
