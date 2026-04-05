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

type MostOwnedNationality = {
  rank: number;
  nationality: string;
  countryEn: string | null;
  total_owners: number;
  total_properties: number;
  ownersPct?: number;
  topCity?: string;
};

type GetMostOwnedNationalitiesResponse = MostOwnedNationality[];

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
    const duration = filter.filter?.duration;
    let parametersList: DurationParam[] = [];

    if (!duration) {
      return { data: [] as unknown as GetTitlesByRegionResponse };
    }
    // Generate duration WHERE clause using generateDurationCond
    const durationCond = generateDurationCond(duration, 0, "WeekOfYearNumber");

    // Build where clause and parameters
    const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
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
  };

  const getTitlesAreaByRegion = async (filter: TTitlesByRegionFilter) => {
    const duration = filter.filter?.duration;
    let parametersList: DurationParam[] = [];
    if (!duration) {
      return { data: [] as unknown as GetTitlesByRegionResponse };
    }

    // Generate duration WHERE clause using generateDurationCond
    const durationCond = generateDurationCond(duration, 0, "WeekOfYearNumber");
    const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
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
  };

  const getRealEstateCount = async (filter: TFilterWithNationality) => {
    try {
      const helper = queryHelper[filter.filter.duration.type as keyof typeof queryHelper];
      const durationSelect = helper?.select || [];
      const durationGroupBy = helper?.groupBy || [];
      const durationOrderBy = helper?.orderBy || [];
      let parametersList: DurationParam[] = [];
      // Generate duration WHERE clause using generateDurationCond
      const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");

      // Build where clause and parameters
      const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
      parametersList.push(...durationCond.params, ...parameters);

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
        AND T.RRR_Nationality != ''
          AND T.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
          AND T.TitleStatus = 'Active'
          AND ${notNullClause}
          ${whereClause}
        GROUP BY 
          ${durationGroupBy.join(", ")},
          ${groupByColumn}
        ORDER BY
          ${durationOrderBy.join(", ")},
          Count DESC
      `;

      const query = AppDataSource.query(sql, parametersList);
      const data = await query;
      return { data: data as unknown as GetRealEstateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered real estate count:", error);
      return { data: [] as unknown as GetRealEstateCountResponse };
    }
  };

  const getRealEstateTotalArea = async (filter: TFilterWithNationality) => {
    try {
      const helper = queryHelper[filter.filter.duration.type as keyof typeof queryHelper];
      const durationSelect = helper?.select || [];
      const durationGroupBy = helper?.groupBy || [];
      const durationOrderBy = helper?.orderBy || [];
      let parametersList: DurationParam[] = [];

      // Generate duration WHERE clause using generateDurationCond
      const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");

      // Build where clause and parameters
      const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
      parametersList.push(...durationCond.params, ...parameters);

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
        AND T.RRR_Nationality != ''
          AND T.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
          AND T.TitleStatus = 'Active'
          AND ${notNullClause}
          ${whereClause}
        GROUP BY 
          ${durationGroupBy.join(", ")},
          ${groupByColumn}
        ORDER BY
          ${durationOrderBy.join(", ")},
          Count DESC
      `;
      const query = AppDataSource.query(sql, parametersList);
      const data = await query;
      return { data: data as unknown as GetRealEstateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered real estate total area:", error);
      return { data: [] as unknown as GetRealEstateCountResponse };
    }
  };

  const getTransactionsCountByTradeType = async (filter: TFilter) => {
    try {
      let parametersList: DurationParam[] = [];
      // Generate duration WHERE clause using generateDurationCond
      const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");
      // Build where clause and parameters
      const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
      parametersList.push(...durationCond.params, ...parameters);

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
          ${whereClause}
        GROUP BY 
          CASE WHEN TransferType='Gift' THEN N'هبة'
          WHEN TransferType='Sale' THEN N'بيع' WHEN TransferType='Inheritance' THEN N'ورث'
          WHEN TransferType='Compulsory Acquisition' THEN N'الاستحواذ الإلزامي' END
      `;

      const query = AppDataSource.query(sql, parametersList);
      const data = await query;
      return { data: data as unknown as GetRealEstateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting registered real estate total area:", error);
      return { data: [] as unknown as GetRealEstateCountResponse };
    }
  };

  const getTransactionsCountByIdentityType = async (filter: TFilterWithExtra) => {
    try {
      // Build where clause and parameters
      let parametersList: DurationParam[] = [];
      // Generate duration WHERE clause using generateDurationCond
      const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");
      const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
      // Generate duration WHERE clause using generateDurationCond
      parametersList.push(...durationCond.params, ...parameters);

      // Build the query with duration condition
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

      const query = AppDataSource.query(sql, parametersList);
      const data = await query;
      return { data: data as unknown as GetTransactionsCountByIdentityTypeResponse };
    } catch (error) {
      console.error("⚠️  Error getting transactions count by identity type:", error);
      return { data: [] as unknown as GetTransactionsCountByIdentityTypeResponse };
    }
  };

  const getMostOwnedNationalities = async () => {
    try {
      const sql = `
SELECT
TOP 10
    m.name,
    COUNT(DISTINCT rt.RRR_GovIdentityValue) AS total,
    COUNT(DISTINCT rt.RealEstate_Number) AS totalProperties
FROM dbo.RER_Titles rt
CROSS APPLY (
    SELECT NULLIF(LTRIM(RTRIM(rt.RRR_Nationality)), N'') AS nat
) n
CROSS APPLY (
    SELECT
        CASE
            -- الخليج / الشام / دول عربية
            WHEN n.nat IN (N'كويتي', N'الكويت') THEN N'الكويت'
            WHEN n.nat IN (N'يمني', N'اليمن') THEN N'اليمن'
            WHEN n.nat IN (N'سوري', N'سوريا') THEN N'سوريا'
            WHEN n.nat IN (N'أردني', N'الاردن', N'الأردن') THEN N'الاردن'
            WHEN n.nat IN (N'فلسطيني', N'فلسطين') THEN N'فلسطين'
            WHEN n.nat IN (N'مصري', N'مصر') THEN N'مصر'
            WHEN n.nat IN (N'قطري', N'قطر') THEN N'قطر'
            WHEN n.nat IN (N'أماراتي', N'الإمارات', N'الامارات', N'الامارات العربية', N'الامارات  العربية') THEN N'الإمارات'
            WHEN n.nat IN (N'بحريني', N'البحرين') THEN N'البحرين'
            WHEN n.nat IN (N'عراقي', N'العراق') THEN N'العراق'
            WHEN n.nat IN (N'سوداني', N'السودان') THEN N'السودان'
            WHEN n.nat IN (N'لبناني', N'لبنان') THEN N'لبنان'
            WHEN n.nat IN (N'مغربي', N'المغرب') THEN N'المغرب'
            WHEN n.nat IN (N'تونسي', N'تونس') THEN N'تونس'
            WHEN n.nat IN (N'جزائري', N'الجزائر') THEN N'الجزائر'
            WHEN n.nat IN (N'عماني', N'عمان') THEN N'عمان'
            WHEN n.nat IN (N'سعودي', N'السعودية') THEN N'السعودية'

            -- قبائل/نازحين/مقيمين
            WHEN n.nat IN (N'قبائل نازحة', N'القبائل النازحه', N'القبائل النازحة', N'القبائل النازحه') THEN N'القبائل النازحة'
            WHEN n.nat IN (N'قبائل نازحة/الكويت') THEN N'قبائل نازحة/الكويت'
            WHEN n.nat IN (N'قبائل نازحة/الحليفه', N'قبائل نازحة/الحليفة') THEN N'قبائل نازحة/الحليفه'
            WHEN n.nat IN (N'أفراد القبائل') THEN N'القبائل النازحة'
            WHEN n.nat IN (N'النازح من الدول العربية') THEN N'النازح من الدول العربية'
            WHEN n.nat IN (N'مقيم / نازح', N'مقيم/نازح') THEN N'مقيم / نازح'
            WHEN n.nat IN (N'مقيم') THEN N'مقيم'

            -- فلسطين بوثائق
            WHEN n.nat IN (N'فلسطيني-وثيقةمصرية', N'فلسطيني بوثيقة مصرية') THEN N'فلسطيني بوثيقة مصرية'
            WHEN n.nat IN (N'فلسطيني-وثيقة لبنانية', N'فلسطيني-وثيقةلبنانية', N'فلسطيني بوثيقةلبناني', N'فلسطيني بوثيقة لبنانية') THEN N'فلسطيني-وثيقة لبنانية'
            WHEN n.nat IN (N'فلسطيني بوثيقة سورية', N'فلسطيني بوثيقة سورية') THEN N'فلسطيني بوثيقة سورية'

            -- آسيا
            WHEN n.nat IN (N'هندي', N'الهند') THEN N'الهند'
            WHEN n.nat IN (N'باكستانى', N'باكستاني', N'باكستان') THEN N'باكستان'
            WHEN n.nat IN (N'بنجلاديشي', N'بنجلاديشى', N'بنجلاديش') THEN N'بنجلاديش'
            WHEN n.nat IN (N'إندونيسي', N'اندونيسيا', N'إندونيسيا') THEN N'اندونيسيا'
            WHEN n.nat IN (N'أفغاني', N'افغانستان', N'أفغانستان') THEN N'افغانستان'
            WHEN n.nat IN (N'تركي', N'تركيا') THEN N'تركيا'
            WHEN n.nat IN (N'صيني', N'الصين الشعبية') THEN N'الصين الشعبية'
            WHEN n.nat IN (N'سنغافوري', N'سنغافورة') THEN N'سنغافورة'
            WHEN n.nat IN (N'سرلنكي', N'سريلانكي', N'سريلانكا') THEN N'سريلانكا'
            WHEN n.nat IN (N'كازاخستاني') THEN N'كازاخستان'
            WHEN n.nat IN (N'تركستاني') THEN N'تركستان'
            WHEN n.nat IN (N'فلبيني', N'الفلبين') THEN N'الفلبين'
            WHEN n.nat IN (N'ماليزي', N'ماليزيا') THEN N'ماليزيا'

            -- بلوشي
            WHEN n.nat IN (N'بلوشي', N'مقيم بلوشي') THEN N'بلوشي'

            -- أفريقيا
            WHEN n.nat IN (N'صومالي', N'الصومال') THEN N'الصومال'
            WHEN n.nat IN (N'أثيوبي', N'اثيوبيا', N'أثيوبيا') THEN N'اثيوبيا'
            WHEN n.nat IN (N'إريتري', N'ارتيريا', N'ارتيري', N'إريتريا') THEN N'إريتريا'
            WHEN n.nat IN (N'مالي') THEN N'مالي'
            WHEN n.nat IN (N'تشادي', N'تشاد') THEN N'تشاد'
            WHEN n.nat IN (N'بوركينافاسو') THEN N'بوركينافاسو'
            WHEN n.nat IN (N'السنغال') THEN N'السنغال'
            WHEN n.nat IN (N'نيجري', N'النيجر') THEN N'النيجر'
            WHEN n.nat IN (N'نيجيري', N'نيجيريا') THEN N'نيجيريا'
            WHEN n.nat IN (N'جنوب  افريقيا', N'جنوب افريقيا', N'جنوب أفريقيا') THEN N'جنوب أفريقيا'
            WHEN n.nat IN (N'موريتاني') THEN N'موريتانيا'
            WHEN n.nat IN (N'كيني', N'كينيا') THEN N'كينيا'

            -- أوروبا / أمريكا الشمالية
            WHEN n.nat IN (N'بريطاني', N'المملكة المتحدة') THEN N'المملكة المتحدة'
            WHEN n.nat IN (N'كندي', N'كندا') THEN N'كندا'
            WHEN n.nat IN (N'أمريكي', N'الولايات المتحدة', N'الولايات  المتحدة') THEN N'الولايات المتحدة'
            WHEN n.nat IN (N'ألماني', N'المانيا', N'ألمانيا') THEN N'المانيا'
            WHEN n.nat IN (N'فرنسي', N'فرنسا') THEN N'فرنسا'
            WHEN n.nat IN (N'ايرلندي', N'أيرلندي', N'ايرلندا', N'أيرلندا') THEN N'ايرلندا'
            WHEN n.nat IN (N'نمساوي', N'النمسا') THEN N'النمسا'
            WHEN n.nat IN (N'اوكراني', N'اوكرانيا', N'أوكرانيا') THEN N'اوكرانيا'
            WHEN n.nat IN (N'نرويجي', N'النرويج') THEN N'النرويج'
            WHEN n.nat IN (N'هولندي', N'هولندا') THEN N'هولندا'
            WHEN n.nat IN (N'بلجيكي', N'بلجيكا') THEN N'بلجيكا'
            WHEN n.nat IN (N'بولندا') THEN N'بولندا'
            WHEN n.nat IN (N'السويد', N'السويدية', N' السويدية') THEN N'السويد'
            WHEN n.nat IN (N'ايطاليا', N'إيطاليا') THEN N'ايطاليا'
            WHEN n.nat IN (N'البرتغال', N'برتغالي') THEN N'البرتغال'
            WHEN n.nat IN (N'لوكسمبورغ') THEN N'لوكسمبورغ'
            WHEN n.nat IN (N'سويسرا') THEN N'سويسرا'
            WHEN n.nat IN (N'أسباني', N'اسبانيا', N'أسبانيا') THEN N'اسبانيا'
            WHEN n.nat IN (N'روسي', N'روسيا الاتحادية') THEN N'روسيا الاتحادية'

            -- الأمريكيتين + جزر
            WHEN n.nat IN (N'برازيلي', N'البرازيل') THEN N'البرازيل'
            WHEN n.nat IN (N'الارجنتين', N'الأرجنتين') THEN N'الارجنتين'
            WHEN n.nat IN (N'فنزويلي', N'فنزويلا') THEN N'فنزويلا'
            WHEN n.nat IN (N'دومينيكا') THEN N'دومينيكا'
            WHEN n.nat IN (N'انتيكوا', N'أنتيكوا') THEN N'انتيكوا'
            WHEN n.nat IN (N'سانت  لوسيا', N'سانت لوسيا') THEN N'سانت  لوسيا'
            WHEN n.nat IN (N'سانت كيتس  ونافيس', N'سان كريستوفر نيفز') THEN N'سانت كيتس  ونافيس'

            -- أوقيانوسيا
            WHEN n.nat IN (N'استراليا', N'أستراليا', N'أسترالي') THEN N'استراليا'
            WHEN n.nat IN (N'فانيوتو', N'فانواتو') THEN N'فانيوتو'

            -- قيم غير صالحة
            WHEN n.nat IN (N'107', N'حصر ح 1') THEN N'غير محدد'

            ELSE n.nat
        END AS name
) m
WHERE
    n.nat IS NOT NULL
    AND rt.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
    AND rt.TitleStatus = 'Active'
GROUP BY
    m.name
ORDER BY
    total DESC,
    m.name  ASC;
      `;

      const countryEnMap: Record<string, string> = {
        الكويت: "Kuwait",
        اليمن: "Yemen",
        سوريا: "Syria",
        الاردن: "Jordan",
        فلسطين: "Palestine",
        مصر: "Egypt",
        قطر: "Qatar",
        الإمارات: "United Arab Emirates",
        البحرين: "Bahrain",
        العراق: "Iraq",
        السودان: "Sudan",
        لبنان: "Lebanon",
        المغرب: "Morocco",
        تونس: "Tunisia",
        الجزائر: "Algeria",
        عمان: "Oman",
        السعودية: "Saudi Arabia",
        "القبائل النازحة": "Displaced Tribes",
        "قبائل نازحة/الكويت": "Displaced Tribes/Kuwait",
        "قبائل نازحة/الحليفه": "Displaced Tribes/Al-Hulayfah",
        "النازح من الدول العربية": "Displaced from Arab countries",
        "مقيم / نازح": "Resident/Displaced",
        مقيم: "Resident",
        "فلسطيني بوثيقة مصرية": "Palestinian (Egyptian document)",
        "فلسطيني-وثيقة لبنانية": "Palestinian (Lebanese document)",
        "فلسطيني بوثيقة سورية": "Palestinian (Syrian document)",
        الهند: "India",
        باكستان: "Pakistan",
        بنجلاديش: "Bangladesh",
        اندونيسيا: "Indonesia",
        افغانستان: "Afghanistan",
        تركيا: "Turkey",
        "الصين الشعبية": "PR China",
        سنغافورة: "Singapore",
        سريلانكا: "Sri Lanka",
        كازاخستان: "Kazakhstan",
        تركستان: "Turkestan",
        الفلبين: "Philippines",
        ماليزيا: "Malaysia",
        بلوشي: "Balochi",
        الصومال: "Somalia",
        اثيوبيا: "Ethiopia",
        إريتريا: "Eritrea",
        مالي: "Mali",
        تشاد: "Chad",
        بوركينافاسو: "Burkina Faso",
        السنغال: "Senegal",
        النيجر: "Niger",
        نيجيريا: "Nigeria",
        "جنوب أفريقيا": "South Africa",
        موريتانيا: "Mauritania",
        كينيا: "Kenya",
        "المملكة المتحدة": "United Kingdom",
        كندا: "Canada",
        "الولايات المتحدة": "USA",
        المانيا: "Germany",
        فرنسا: "France",
        ايرلندا: "Ireland",
        النمسا: "Austria",
        اوكرانيا: "Ukraine",
        النرويج: "Norway",
        هولندا: "Netherlands",
        بلجيكا: "Belgium",
        بولندا: "Poland",
        السويد: "Sweden",
        ايطاليا: "Italy",
        البرتغال: "Portugal",
        لوكسمبورغ: "Luxembourg",
        سويسرا: "Switzerland",
        اسبانيا: "Spain",
        "روسيا الاتحادية": "Russian Federation",
        البرازيل: "Brazil",
        الارجنتين: "Argentina",
        فنزويلا: "Venezuela",
        دومينيكا: "Dominica",
        انتيكوا: "Antigua",
        "سانت  لوسيا": "Saint Lucia",
        "سانت كيتس  ونافيس": "Saint Kitts and Nevis",
        استراليا: "Australia",
        فانيوتو: "Vanuatu",
        "غير محدد": "Unspecified",
      };

      const rows = (await AppDataSource.query(sql)) as Array<{
        name: string;
        total: number;
        totalProperties: number;
        ownersPct: number;
        topCity: string;
      }>;

      const data: GetMostOwnedNationalitiesResponse = rows.map((row, index) => {
        const value = Number(row.total ?? 0);
        return {
          rank: index + 1,
          nationality: row.name,
          countryEn: countryEnMap[row.name] ?? null,
          total_owners: value,
          total_properties: row.totalProperties,
          ownersPct: row.ownersPct,
          topCity: row.topCity,
        };
      });

      return { data };
    } catch (error) {
      console.error("⚠️  Error getting most owned nationalities:", error);
      return { data: [] as unknown as GetMostOwnedNationalitiesResponse };
    }
  };

  const getTransactionsCount = async (filter: TFilterWithNationality) => {
    try {
      const helper = queryHelper[filter.filter.duration.type as keyof typeof queryHelper];
      const durationSelect = helper?.select || [];
      const durationGroupBy = helper?.groupBy || [];
      const durationOrderBy = helper?.orderBy || [];

      let parametersList: DurationParam[] = [];
      // Generate duration WHERE clause using generateDurationCond
      const durationCond = generateDurationCond(filter.filter.duration, 0, "WeekOfYearNumber");

      // Build where clause and parameters
      const { whereClause, parameters } = generateWhereClause(filter, durationCond.nextParamIndex);
      parametersList.push(...durationCond.params, ...parameters);

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
          COUNT(RealEstate_Number) AS Count,
          ${selectColumn}
        FROM "RER_Titles" AS T 
        WHERE ${durationCond.clause}
        AND T.RRR_Nationality != ''
          AND T.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
          AND T.TransferType='Sale'
          AND ${notNullClause}
          ${whereClause}
        GROUP BY 
          ${durationGroupBy.join(", ")},
          ${groupByColumn}
        ORDER BY
          ${durationOrderBy.join(", ")},
          Count DESC
      `;
      const query = AppDataSource.query(sql, parametersList);
      const data = await query;
      return { data: data as unknown as GetTransactionsCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting transactions count:", error);
      return { data: [] as unknown as GetTransactionsCountResponse };
    }
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
    getMostOwnedNationalities,
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
      getMostOwnedNationalities: () => Promise<{ data: GetMostOwnedNationalitiesResponse }>;
    };
  }
}
