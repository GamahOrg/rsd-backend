import fp from "fastify-plugin";
import {
  TResponse as GetTitlesByRegionResponse,
  TBody as TTitlesByRegionFilter,
} from "./schemas/getTitlesByRegion.schema";
import { TResponse as GetRealEstateCountResponse } from "./schemas/GetRealEstateCount.schema";
import { TResponse as GetTransactionsCountByTradeTypeResponse } from "./schemas/GetTransactionsCountByTradeType.schema";
import {
  TResponse as GetTransactionsCountByIdentityTypeResponse,
  TFilterWithExtra,
} from "./schemas/GetTransactionsCountByIdentityType.schema";
import {
  TResponse as GetTransactionsCountResponse,
  TFilterWithNationality,
} from "./schemas/GetTransactionsCount.schema";
import { TFilter } from "../../../models/types/rer/filter.type";
import { AppDataSource } from "../../../config/database";
import { generateDurationCond, DurationParam } from "../../../helper/rer/filterQueryGenerator";
import { withCache } from "../../../helper/cache";

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

  const newQueryHelper = {
    DAY: {
      select: ["year as YearNumber", "month as MonthNumber", "day as DayNumber"],
      groupBy: ["year", "month", "day"],
      orderBy: ["year DESC", "month ASC", "day ASC"],
    },
    MONTH: {
      select: ["year as YearNumber", "month as MonthNumber"],
      groupBy: ["year", "month"],
      orderBy: ["year DESC", "month ASC"],
    },
    QUARTER: {
      select: ["year as YearNumber", "quarter as QuarterNumber"],
      groupBy: ["year", "quarter"],
      orderBy: ["year DESC", "quarter ASC"],
    },
    YEAR: {
      select: ["year as YearNumber"],
      groupBy: ["year"],
      orderBy: ["year DESC"],
    },
  };

  const getTitlesByRegion = async (filter: TTitlesByRegionFilter) => {
    const duration = filter.filter?.duration;

    if (!duration) {
      return { data: [] as unknown as GetTitlesByRegionResponse };
    }

    return withCache(
      fastify.redis,
      `fo_titles:count_by_region:${JSON.stringify(filter)}`,
      7200,
      async () => {
        let parametersList: DurationParam[] = [];
        const durationCond = generateDurationCond(duration, 0, "WeekOfYearNumber");
        const { whereClause, parameters } = generateWhereClause(
          filter,
          durationCond.nextParamIndex,
        );
        parametersList.push(...durationCond.params, ...parameters);

        const sql = `
          SELECT 
            T.RegionNameAr AS label,
            COUNT(distinct RealEstate_Number) AS count
          FROM "RER_Titles" AS T
          WHERE ${durationCond.clause}
            AND T.requestname='First Registration'
            AND T.RegionNameAr IS NOT NULL
            ${whereClause}
          GROUP BY T.RegionNameAr
          ORDER BY count DESC
        `;
        const data = await AppDataSource.query(sql, parametersList);
        return { data: data as unknown as GetTitlesByRegionResponse };
      },
    );
  };

  const getTitlesAreaByRegion = async (filter: TTitlesByRegionFilter) => {
    const duration = filter.filter?.duration;
    if (!duration) {
      return { data: [] as unknown as GetTitlesByRegionResponse };
    }

    return withCache(
      fastify.redis,
      `fo_titles:area_by_region:${JSON.stringify(filter)}`,
      7200,
      async () => {
        let parametersList: DurationParam[] = [];
        const durationCond = generateDurationCond(duration, 0, "WeekOfYearNumber");
        const { whereClause, parameters } = generateWhereClause(
          filter,
          durationCond.nextParamIndex,
        );
        parametersList.push(...durationCond.params, ...parameters);
        const sql = `
          SELECT 
            T.RegionNameAr AS label,
            SUM(T.AreaSize) AS count
          FROM "RER_Titles" AS T
          WHERE ${durationCond.clause}
            AND T.requestname='First Registration'
            AND T.RegionNameAr IS NOT NULL
            ${whereClause}
          GROUP BY T.RegionNameAr
          ORDER BY count DESC
        `;
        const data = await AppDataSource.query(sql, parametersList);
        return { data: data as unknown as GetTitlesByRegionResponse };
      },
    );
  };

  const getRealEstateCount = async (filter: TFilterWithNationality) => {
    return withCache(
      fastify.redis,
      `fo_titles:real_estate_count:${JSON.stringify(filter)}`,
      7200,
      () => _getRealEstateCount(filter),
    );
  };

  const _getRealEstateCount = async (filter: TFilterWithNationality) => {
    const durationType = filter.filter.duration.type;
    const helper = newQueryHelper[filter.filter.duration.type as keyof typeof newQueryHelper];
    const durationSelect = helper?.select || [];
    const durationGroupBy = helper?.groupBy || [];
    const durationOrderBy = helper?.orderBy || [];
    let parametersList: DurationParam[] = [];
    const durationCond = {
      clause: "start_date between @0 and @1",
      nextParamIndex: 2,
      params: [filter.filter.duration.from.date, filter.filter.duration.to.date],
    };
    if (durationType != "YEAR") {
      durationCond.clause += " AND time_period = @2";
      durationCond.nextParamIndex++;
      durationCond.params.push(getTimePeriod(durationType));
    }

    const { whereClause, parameters } = NewGenerateWhereClause(filter, durationCond.nextParamIndex);
    parametersList.push(...durationCond.params, ...parameters);

    let labelColumn: string;
    let groupByColumn: string;
    let selectColumn: string;
    let extraWhereClause: string;
    if (filter.filter.district && filter.filter.district.length > 0) {
      labelColumn = "T.district_ar";
      groupByColumn = "T.region_ar, T.city_ar, T.district_ar";
      selectColumn = "T.region_ar AS Region, T.city_ar as City, T.district_ar as District";
      extraWhereClause =
        "T.region_ar IS NOT NULL AND T.city_ar IS NOT NULL AND T.district_ar IS NOT NULL AND T.level = 'district'";
    } else if (filter.filter.city && filter.filter.city.length > 0) {
      labelColumn = "T.city_ar";
      groupByColumn = "T.region_ar, T.city_ar";
      selectColumn = "T.region_ar AS Region, T.city_ar as City";
      extraWhereClause = "T.region_ar IS NOT NULL AND T.city_ar IS NOT NULL AND T.level = 'city'";
    } else {
      labelColumn = "T.region_ar";
      groupByColumn = "T.region_ar";
      selectColumn = "T.region_ar AS Region";
      extraWhereClause = "T.region_ar IS NOT NULL AND T.level = 'region'";
    }

    const sql = `
      SELECT 
        ${durationSelect.join(", ")},
        ${labelColumn} AS Label,
        SUM(total_units) AS Count,
        ${selectColumn}
      FROM dbo.non_saudies_individuals_ownership_all_levels AS T 
      WHERE ${durationCond.clause}
      AND ${extraWhereClause}
        ${whereClause}
      GROUP BY 
        ${durationGroupBy.join(", ")},
        ${groupByColumn}
      ORDER BY
        ${durationOrderBy.join(", ")},
        Count DESC
    `;
    const data = await AppDataSource.query(sql, parametersList);
    return { data: data as unknown as GetRealEstateCountResponse };
  };

  const getRealEstateTotalArea = async (filter: TFilterWithNationality) => {
    return withCache(
      fastify.redis,
      `fo_titles:real_estate_area:${JSON.stringify(filter)}`,
      7200,
      () => _getRealEstateTotalArea(filter),
    );
  };

  const _getRealEstateTotalArea = async (filter: TFilterWithNationality) => {
    const durationType = filter.filter.duration.type;
    const helper = newQueryHelper[filter.filter.duration.type as keyof typeof newQueryHelper];
    const durationSelect = helper?.select || [];
    const durationGroupBy = helper?.groupBy || [];
    const durationOrderBy = helper?.orderBy || [];
    let parametersList: DurationParam[] = [];
    const durationCond = {
      clause: "start_date between @0 and @1",
      nextParamIndex: 2,
      params: [filter.filter.duration.from.date, filter.filter.duration.to.date],
    };
    if (durationType != "YEAR") {
      durationCond.clause += " AND time_period = @2";
      durationCond.nextParamIndex++;
      durationCond.params.push(getTimePeriod(durationType));
    }

    const { whereClause, parameters } = NewGenerateWhereClause(filter, durationCond.nextParamIndex);
    parametersList.push(...durationCond.params, ...parameters);

    let labelColumn: string;
    let groupByColumn: string;
    let selectColumn: string;
    let extraWhereClause: string;
    if (filter.filter.district && filter.filter.district.length > 0) {
      labelColumn = "T.district_ar";
      groupByColumn = "T.region_ar, T.city_ar, T.district_ar";
      selectColumn = "T.region_ar AS Region, T.city_ar as City, T.district_ar as District";
      extraWhereClause =
        "T.region_ar IS NOT NULL AND T.city_ar IS NOT NULL AND T.district_ar IS NOT NULL AND T.level = 'district'";
    } else if (filter.filter.city && filter.filter.city.length > 0) {
      labelColumn = "T.city_ar";
      groupByColumn = "T.region_ar, T.city_ar";
      selectColumn = "T.region_ar AS Region, T.city_ar as City";
      extraWhereClause = "T.region_ar IS NOT NULL AND T.city_ar IS NOT NULL AND T.level = 'city'";
    } else {
      labelColumn = "T.region_ar";
      groupByColumn = "T.region_ar";
      selectColumn = "T.region_ar AS Region";
      extraWhereClause = "T.region_ar IS NOT NULL AND T.level = 'region'";
    }
    const sql = `
      SELECT 
        ${durationSelect.join(", ")},
        ${labelColumn} AS Label,
        SUM(owned_sqm) AS Count,
        ${selectColumn}
      FROM dbo.non_saudies_individuals_ownership_all_levels AS T 
      WHERE ${durationCond.clause}
      AND ${extraWhereClause}
        ${whereClause}
      GROUP BY 
        ${durationGroupBy.join(", ")},
        ${groupByColumn}
      ORDER BY
        ${durationOrderBy.join(", ")},
        Count DESC
    `;
    const data = await AppDataSource.query(sql, parametersList);
    return { data: data as unknown as GetRealEstateCountResponse };
  };

  const getTransactionsCountByTradeType = async (filter: TFilter) => {
    return withCache(
      fastify.redis,
      `fo_titles:trade_type_count:${JSON.stringify(filter)}`,
      7200,
      () => _getTransactionsCountByTradeType(filter),
    );
  };

  const _getTransactionsCountByTradeType = async (filter: TFilter) => {
    let parametersList: DurationParam[] = [];
    const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");
    const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
    parametersList.push(...durationCond.params, ...parameters);

    let groupByColumn: string;
    let notNullClause: string;
    if (filter.filter.district && filter.filter.district.length > 0) {
      groupByColumn = "T.RegionNameAr, T.CityNameAr, T.DistrictNameAr";
      notNullClause =
        "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL AND T.DistrictNameAr IS NOT NULL";
    } else if (filter.filter.city && filter.filter.city.length > 0) {
      groupByColumn = "T.RegionNameAr, T.CityNameAr";
      notNullClause = "T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL";
    } else {
      groupByColumn = "T.RegionNameAr";
      notNullClause = "T.RegionNameAr IS NOT NULL";
    }

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
        ${whereClause}
      GROUP BY 
        CASE WHEN TransferType='Gift' THEN N'هبة'
        WHEN TransferType='Sale' THEN N'بيع' WHEN TransferType='Inheritance' THEN N'ورث'
        WHEN TransferType='Compulsory Acquisition' THEN N'الاستحواذ الإلزامي' END
    `;

    const data = await AppDataSource.query(sql, parametersList);
    return { data: data as unknown as GetTransactionsCountByTradeTypeResponse };
  };

  const getTransactionsCountByIdentityType = async (filter: TFilterWithExtra) => {
    return withCache(
      fastify.redis,
      `fo_titles:identity_type_count:${JSON.stringify(filter)}`,
      7200,
      () => _getTransactionsCountByIdentityType(filter),
    );
  };

  const _getTransactionsCountByIdentityType = async (filter: TFilterWithExtra) => {
    let parametersList: DurationParam[] = [];
    const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");
    const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
    parametersList.push(...durationCond.params, ...parameters);

    const sql = `
SELECT 
count(distinct RealEstate_Number) count, CASE
            WHEN RRR_IdentityType = 'GCCIdentity' THEN N'هوية خليجية'
            WHEN RRR_IdentityType = 'GCCPassport' THEN N'جواز سفر خليجي'
            WHEN RRR_IdentityType = 'IqamaIdentity' THEN N'إقامة'
            WHEN RRR_IdentityType = 'Premium Iqama' THEN N'إقامة مميزة'
            else RRR_IdentityType end as label
FROM "RER_Titles" AS T
WHERE ${durationCond.clause}
AND T.RegionNameAr IS NOT NULL AND T.CityNameAr IS NOT NULL AND T.DistrictNameAr IS NOT NULL 
AND T.RRR_Nationality != '' and T.RRR_IdentityType not in (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
AND T.TitleStatus = 'Active'
${whereClause}
group by T.RRR_IdentityType`;

    const data = await AppDataSource.query(sql, parametersList);
    return { data: data as unknown as GetTransactionsCountByIdentityTypeResponse };
  };

  const getTransactionsCount = async (filter: TFilterWithNationality) => {
    return withCache(
      fastify.redis,
      `fo_titles:transactions_count:${JSON.stringify(filter)}`,
      7200,
      () => _getTransactionsCount(filter),
    );
  };

  const getTimePeriod = (durationType: string) =>
    ({
      MONTH: "Monthly",
      QUARTER: "Quarterly",
    })[durationType] || "";

  const _getTransactionsCount = async (filter: TFilterWithNationality) => {
    const helper = newQueryHelper[filter.filter.duration.type as keyof typeof newQueryHelper];
    const durationSelect = helper?.select || [];
    const durationGroupBy = helper?.groupBy || [];
    const durationOrderBy = helper?.orderBy || [];

    let parametersList: DurationParam[] = [];
    const durationCond = {
      clause: "date between @0 and @1",
      nextParamIndex: 2,
      params: [filter.filter.duration.from.date, filter.filter.duration.to.date],
    };
    const { whereClause, parameters } = NewGenerateWhereClause(filter, durationCond.nextParamIndex);
    parametersList.push(...durationCond.params, ...parameters);

    let labelColumn: string;
    let groupByColumn: string;
    let selectColumn: string;
    let notNullClause: string;
    if (filter.filter.district && filter.filter.district.length > 0) {
      labelColumn = "T.district_ar";
      groupByColumn = "T.region_ar, T.city_ar, T.district_ar";
      selectColumn = "T.region_ar AS Region, T.city_ar as City, T.district_ar as District";
      notNullClause =
        "T.region_ar IS NOT NULL AND T.city_ar IS NOT NULL AND T.district_ar IS NOT NULL";
    } else if (filter.filter.city && filter.filter.city.length > 0) {
      labelColumn = "T.city_ar";
      groupByColumn = "T.region_ar, T.city_ar";
      selectColumn = "T.region_ar AS Region, T.city_ar as City";
      notNullClause = "T.region_ar IS NOT NULL AND T.city_ar IS NOT NULL";
    } else {
      labelColumn = "T.region_ar";
      groupByColumn = "T.region_ar";
      selectColumn = "T.region_ar AS Region";
      notNullClause = "T.region_ar IS NOT NULL";
    }

    const sql = `
      SELECT 
        ${durationSelect.join(", ")},
        ${labelColumn} AS Label,
        COUNT(*) AS Count,
        ${selectColumn}
      FROM dbo.non_saudies_sales_transactions AS T 
      WHERE ${durationCond.clause}
        AND ${notNullClause}
        ${whereClause}
      GROUP BY 
        ${durationGroupBy.join(", ")},
        ${groupByColumn}
      ORDER BY
        ${durationOrderBy.join(", ")},
        Count DESC
    `;
    const data = await AppDataSource.query(sql, parametersList);
    return { data: data as unknown as GetTransactionsCountResponse };
  };

  const NewGenerateWhereClause = (
    filter: TFilterWithNationality | TFilter | TFilterWithExtra | TTitlesByRegionFilter,
    parametersIndex: number = 0,
  ) => {
    let whereClause = "";
    const parameters: DurationParam[] = [];
    if ("region" in filter.filter && filter.filter.region && filter.filter.region.length > 0) {
      const regionParams = filter.filter.region
        .map((region) => {
          parameters.push(region);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.region_ar IN (${regionParams})`;
    }
    if ("city" in filter.filter && filter.filter.city && filter.filter.city.length > 0) {
      const cityParams = filter.filter.city
        .map((city) => {
          parameters.push(city);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.city_ar IN (${cityParams})`;
    }
    if (
      "district" in filter.filter &&
      filter.filter.district &&
      filter.filter.district.length > 0
    ) {
      const districtParams = filter.filter.district
        .map((district) => {
          parameters.push(district);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.district_ar IN (${districtParams})`;
    }
    if (
      "nationality" in filter.filter &&
      filter.filter.nationality &&
      filter.filter.nationality.length > 0
    ) {
      const nationalityParams = filter.filter.nationality
        .map((nationality) => {
          parameters.push(nationality);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.nationality_ar IN (${nationalityParams})`;
    }
    if ("propertyType" in filter.filter && filter.filter.propertyType) {
      parameters.push(filter.filter.propertyType);
      whereClause += `AND T.main_category_ar = @${parametersIndex++}`;
    }
    return { whereClause, parameters, parametersIndex };
  };

  const generateWhereClause = (
    filter: TFilterWithNationality | TFilter | TFilterWithExtra | TTitlesByRegionFilter,
    parametersIndex: number = 0,
  ) => {
    let whereClause = "";
    const parameters: DurationParam[] = [];
    if ("region" in filter.filter && filter.filter.region && filter.filter.region.length > 0) {
      const regionParams = filter.filter.region
        .map((region) => {
          parameters.push(region);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.RegionNameAr IN (${regionParams})`;
    }
    if ("city" in filter.filter && filter.filter.city && filter.filter.city.length > 0) {
      const cityParams = filter.filter.city
        .map((city) => {
          parameters.push(city);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.CityNameAr IN (${cityParams})`;
    }
    if (
      "district" in filter.filter &&
      filter.filter.district &&
      filter.filter.district.length > 0
    ) {
      const districtParams = filter.filter.district
        .map((district) => {
          parameters.push(district);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.DistrictNameAr IN (${districtParams})`;
    }
    if (
      "nationality" in filter.filter &&
      filter.filter.nationality &&
      filter.filter.nationality.length > 0
    ) {
      const nationalityParams = filter.filter.nationality
        .map((nationality) => {
          parameters.push(nationality);
          return `@${parametersIndex++}`;
        })
        .join(", ");
      whereClause += `AND T.RRR_Nationality IN (${nationalityParams})`;
    }
    if ("propertyType" in filter.filter && filter.filter.propertyType) {
      parameters.push(filter.filter.propertyType);
      whereClause += `AND T.PropertyUse = @${parametersIndex++}`;
    }
    return { whereClause, parameters, parametersIndex };
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("foreignOwnershipTitlesService", {
    getTitlesByRegion,
    getTitlesAreaByRegion,
    getRealEstateCount,
    getRealEstateTotalArea,
    getTransactionsCount,
    getTransactionsCountByTradeType,
    getTransactionsCountByIdentityType,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    foreignOwnershipTitlesService: {
      getRealEstateCount: (
        filter: TFilterWithNationality,
      ) => Promise<{ data: GetRealEstateCountResponse }>;
      getRealEstateTotalArea: (
        filter: TFilterWithNationality,
      ) => Promise<{ data: GetRealEstateCountResponse }>;
      getTransactionsCount: (
        filter: TFilterWithNationality,
      ) => Promise<{ data: GetTransactionsCountResponse }>;
      getTitlesByRegion: (
        filter: TTitlesByRegionFilter,
      ) => Promise<{ data: GetTitlesByRegionResponse }>;
      getTitlesAreaByRegion: (
        filter: TTitlesByRegionFilter,
      ) => Promise<{ data: GetTitlesByRegionResponse }>;
      getTransactionsCountByTradeType: (
        filter: TFilter,
      ) => Promise<{ data: GetTransactionsCountByTradeTypeResponse }>;
      getTransactionsCountByIdentityType: (
        filter: TFilter,
      ) => Promise<{ data: GetTransactionsCountByIdentityTypeResponse }>;
    };
  }
}
