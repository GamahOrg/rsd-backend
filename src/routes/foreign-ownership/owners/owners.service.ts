import fp from "fastify-plugin";
import {
  TResponse as GetOwnersResponse,
  TFilter as GetOwnersFilterType,
} from "./schemas/GetOwners.schema";
import { TResponse as GetOwnerInfoResponse } from "./schemas/GetOwnerInfo.schema";
import { TResponse as GetOwnerRealestatesResponse } from "./schemas/GetOwnerRealestates.schema";
import { TResponse as GetOwnerRealestatesCoordinatesResponse } from "./schemas/GetOwnerRealestatesCoordinates.schema";
import {
  TResponse as GetOwnersStatisticsResponse,
  TFilter as GetOwnersStatisticsFilterType,
} from "./schemas/GetOwnersStatistics.schema";
import { AppDataSource } from "../../../config/database";
import { DurationParam } from "../../../helper/rer/filterQueryGenerator";

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

  const getOwners = async (
    filter: GetOwnersFilterType,
    pagination?: { skip: number; take: number },
  ) => {
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
        regionClause = `AND rt.RegionNameAr IN (${regionParams})`;
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
        cityClause = `AND rt.CityNameAr IN (${cityParams})`;
      }

      // Nationality parameters (optional, multi-select)
      let nationalityClause = "";
      if (filter.filter.nationality && filter.filter.nationality.length > 0) {
        const nationalityParams = filter.filter.nationality
          .map((nationality) => {
            parameters.push(nationality);
            return `@${paramIndex++}`;
          })
          .join(", ");
        nationalityClause = `AND rt.RRR_Nationality IN (${nationalityParams})`;
      }

      let identityTypeClause = "";
      if (filter.filter.identityType && filter.filter.identityType.length > 0) {
        const identityTypeParams = filter.filter.identityType
          .map((identityType) => {
            parameters.push(identityType);
            return `@${paramIndex++}`;
          })
          .join(", ");
        identityTypeClause = `AND rt.RRR_IdentityType IN (${identityTypeParams})`;
      }

      // Order by parameters (optional)
      let orderByClause = "";
      if (filter.filter.orderBy) {
        orderByClause = `ORDER BY ${filter.filter.orderBy.column} ${filter.filter.orderBy.direction}`;
      } else {
        orderByClause = "ORDER BY rt.RRR_GovIdentityValue";
      }

      const take = Math.max(1, pagination?.take ?? filter.filter.dataSize ?? 100);
      const skip = Math.max(0, pagination?.skip ?? 0);
      const offsetParam = paramIndex++;
      const takeParam = paramIndex++;
      const dataSql = `
       SELECT
        rt.RRR_GovIdentityValue AS OwnerIDNumber,
        rt.RRR_IdentityType     AS IdentityType,
        rt.RRR_NameAr           AS OwnerName,
        rt.RRR_Nationality      AS Nationality,
        count(distinct rt.RealEstate_Number)  AS totalDeeds,
        sum(COALESCE(rt.UnitAreaSize, rt.AreaSize)) AS totalOwnedArea
    FROM RER_Titles rt
    WHERE rt.TitleStatus = 'Active'
      AND rt.RRR_IdentityType NOT IN (
            N'NationalIdentity',
            N'Government Entity Number',
            N'Unified Number',
            N'Commercial Number'
      )
      AND NULLIF(LTRIM(RTRIM(rt.RRR_GovIdentityValue)), N'') IS NOT NULL
      ${regionClause}
      ${cityClause}
      ${nationalityClause}
      ${identityTypeClause}
    GROUP BY
        rt.RRR_GovIdentityValue,
        rt.RRR_IdentityType,
        rt.RRR_NameAr,
        rt.RRR_Nationality
    ${orderByClause}
    OFFSET @${offsetParam} ROWS FETCH NEXT @${takeParam} ROWS ONLY;`;

      // Get total record count using a proper COUNT(*) query
      const countSql = `
        SELECT COUNT(DISTINCT rt.RRR_GovIdentityValue) as totalRecords
        FROM RER_Titles rt
        WHERE rt.TitleStatus = 'Active'
          AND rt.RRR_IdentityType NOT IN (
                N'NationalIdentity',
                N'Government Entity Number',
                N'Unified Number',
                N'Commercial Number'
          )
          AND NULLIF(LTRIM(RTRIM(rt.RRR_GovIdentityValue)), N'') IS NOT NULL
          ${regionClause}
          ${cityClause}
          ${nationalityClause}
          ${identityTypeClause}
      `;
      const totalRecordsResult = await AppDataSource.query(countSql, parameters);
      const totalRecords = Number(totalRecordsResult?.[0]?.totalRecords ?? 0);
      let data = await AppDataSource.query(dataSql, [...parameters, skip, take]);
      data = data.map((item: any) => {
        return {
          OwnerIDNumber: item.OwnerIDNumber,
          OwnerName: item.OwnerName,
          Nationality: item.Nationality,
          IdentityType: item.IdentityType,
          totalArea: Number(item.totalOwnedArea),
          totalDeeds: Number(item.totalDeeds),
          realestates: {
            moj: {
              deeds: 0,
              area: 0,
            },
            rer: {
              deeds: item.totalDeeds,
              area: item.totalOwnedArea,
            },
          },
        };
      });
      return {
        data: data.map((item: any) => item) as unknown as GetOwnersResponse,
        totalRecords,
      };
    } catch (error) {
      console.error("⚠️  Error getting owners data:", error);
      return { data: [] as unknown as GetOwnersResponse, totalRecords: 0 };
    }
  };

  const getOwnersStatistics = async (filter: GetOwnersStatisticsFilterType) => {
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
        regionClause = `AND rt.RegionNameAr IN (${regionParams})`;
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
        cityClause = `AND rt.CityNameAr IN (${cityParams})`;
      }

      // Nationality parameters (optional, multi-select)
      let nationalityClause = "";
      if (filter.filter.nationality && filter.filter.nationality.length > 0) {
        const nationalityParams = filter.filter.nationality
          .map((nationality) => {
            parameters.push(nationality);
            return `@${paramIndex++}`;
          })
          .join(", ");
        nationalityClause = `AND rt.RRR_Nationality IN (${nationalityParams})`;
      }

      let identityTypeClause = "";
      if (filter.filter.identityType && filter.filter.identityType.length > 0) {
        const identityTypeParams = filter.filter.identityType
          .map((identityType) => {
            parameters.push(identityType);
            return `@${paramIndex++}`;
          })
          .join(", ");
        identityTypeClause = `AND rt.RRR_IdentityType IN (${identityTypeParams})`;
      }

      const sql = `
SELECT 
count(distinct rt.RRR_GovIdentityValue) as totalOwners,
   count(distinct rt.RealEstate_Number)  AS totalRealEstates,
     sum(COALESCE(rt.UnitAreaSize, rt.AreaSize)) AS totalArea
    FROM RER_Titles rt
    WHERE rt.TitleStatus = 'Active'
      AND rt.RRR_IdentityType NOT IN (
            N'NationalIdentity',
            N'Government Entity Number',
            N'Unified Number',
            N'Commercial Number'
      )
      AND NULLIF(LTRIM(RTRIM(rt.RRR_GovIdentityValue)), N'') IS NOT NULL
      ${regionClause}
      ${cityClause}
      ${nationalityClause}
      ${identityTypeClause}
      `;
      const data = await AppDataSource.query(sql, parameters);
      return { data: data[0] as unknown as GetOwnersStatisticsResponse };
    } catch (error) {
      console.error("⚠️  Error getting owners statistics data:", error);
      return { data: [] as unknown as GetOwnersStatisticsResponse };
    }
  };

  const getOwnerInfo = async (ownerIDNumber: string) => {
    try {
      const query = `SELECT 
      rt.RRR_GovIdentityValue AS OwnerIDNumber,
      rt.RRR_IdentityType     AS IdentityType,
      rt.RRR_NameAr           AS OwnerName,
      count(distinct rt.RealEstate_Number)    AS totalDeeds,
      sum(COALESCE(rt.UnitAreaSize, rt.AreaSize)) AS totalAreaSize,
      CASE
              -- الخليج / الشام / دول عربية
              WHEN rt.RRR_Nationality IN (N'كويتي', N'الكويت') THEN N'الكويت'
              WHEN rt.RRR_Nationality IN (N'يمني', N'اليمن') THEN N'اليمن'
              WHEN rt.RRR_Nationality IN (N'سوري', N'سوريا') THEN N'سوريا'
              WHEN rt.RRR_Nationality IN (N'أردني', N'الاردن', N'الأردن') THEN N'الاردن'
              WHEN rt.RRR_Nationality IN (N'فلسطيني', N'فلسطين') THEN N'فلسطين'
              WHEN rt.RRR_Nationality IN (N'مصري', N'مصر') THEN N'مصر'
              WHEN rt.RRR_Nationality IN (N'قطري', N'قطر') THEN N'قطر'
              WHEN rt.RRR_Nationality IN (N'أماراتي', N'الإمارات', N'الامارات', N'الامارات العربية', N'الامارات  العربية') THEN N'الإمارات'
              WHEN rt.RRR_Nationality IN (N'بحريني', N'البحرين') THEN N'البحرين'
              WHEN rt.RRR_Nationality IN (N'عراقي', N'العراق') THEN N'العراق'
              WHEN rt.RRR_Nationality IN (N'سوداني', N'السودان') THEN N'السودان'
              WHEN rt.RRR_Nationality IN (N'لبناني', N'لبنان') THEN N'لبنان'
              WHEN rt.RRR_Nationality IN (N'مغربي', N'المغرب') THEN N'المغرب'
              WHEN rt.RRR_Nationality IN (N'تونسي', N'تونس') THEN N'تونس'
              WHEN rt.RRR_Nationality IN (N'جزائري', N'الجزائر') THEN N'الجزائر'
              WHEN rt.RRR_Nationality IN (N'عماني', N'عمان') THEN N'عمان'
              WHEN rt.RRR_Nationality IN (N'سعودي', N'السعودية') THEN N'السعودية'

              -- قبائل/نازحين/مقيمين
              WHEN rt.RRR_Nationality IN (N'قبائل نازحة', N'القبائل النازحه', N'القبائل النازحة', N'القبائل النازحه') THEN N'القبائل النازحة'
              WHEN rt.RRR_Nationality IN (N'قبائل نازحة/الكويت') THEN N'قبائل نازحة/الكويت'
              WHEN rt.RRR_Nationality IN (N'قبائل نازحة/الحليفه', N'قبائل نازحة/الحليفة') THEN N'قبائل نازحة/الحليفه'
              WHEN rt.RRR_Nationality IN (N'أفراد القبائل') THEN N'القبائل النازحة'
              WHEN rt.RRR_Nationality IN (N'النازح من الدول العربية') THEN N'النازح من الدول العربية'
              WHEN rt.RRR_Nationality IN (N'مقيم / نازح', N'مقيم/نازح') THEN N'مقيم / نازح'
              WHEN rt.RRR_Nationality IN (N'مقيم') THEN N'مقيم'

              -- فلسطين بوثائق
              WHEN rt.RRR_Nationality IN (N'فلسطيني-وثيقةمصرية', N'فلسطيني بوثيقة مصرية') THEN N'فلسطيني بوثيقة مصرية'
              WHEN rt.RRR_Nationality IN (N'فلسطيني-وثيقة لبنانية', N'فلسطيني-وثيقةلبنانية', N'فلسطيني بوثيقةلبناني', N'فلسطيني بوثيقة لبنانية') THEN N'فلسطيني-وثيقة لبنانية'
              WHEN rt.RRR_Nationality IN (N'فلسطيني بوثيقة سورية', N'فلسطيني بوثيقة سورية') THEN N'فلسطيني بوثيقة سورية'

              -- آسيا
              WHEN rt.RRR_Nationality IN (N'هندي', N'الهند') THEN N'الهند'
              WHEN rt.RRR_Nationality IN (N'باكستانى', N'باكستاني', N'باكستان') THEN N'باكستان'
              WHEN rt.RRR_Nationality IN (N'بنجلاديشي', N'بنجلاديشى', N'بنجلاديش') THEN N'بنجلاديش'
              WHEN rt.RRR_Nationality IN (N'إندونيسي', N'اندونيسيا', N'إندونيسيا') THEN N'اندونيسيا'
              WHEN rt.RRR_Nationality IN (N'أفغاني', N'افغانستان', N'أفغانستان') THEN N'افغانستان'
              WHEN rt.RRR_Nationality IN (N'تركي', N'تركيا') THEN N'تركيا'
              WHEN rt.RRR_Nationality IN (N'صيني', N'الصين الشعبية') THEN N'الصين الشعبية'
              WHEN rt.RRR_Nationality IN (N'سنغافوري', N'سنغافورة') THEN N'سنغافورة'
              WHEN rt.RRR_Nationality IN (N'سرلنكي', N'سريلانكي', N'سريلانكا') THEN N'سريلانكا'
              WHEN rt.RRR_Nationality IN (N'كازاخستاني') THEN N'كازاخستان'
              WHEN rt.RRR_Nationality IN (N'تركستاني') THEN N'تركستان'
              WHEN rt.RRR_Nationality IN (N'فلبيني', N'الفلبين') THEN N'الفلبين'
              WHEN rt.RRR_Nationality IN (N'ماليزي', N'ماليزيا') THEN N'ماليزيا'

              -- بلوشي
              WHEN rt.RRR_Nationality IN (N'بلوشي', N'مقيم بلوشي') THEN N'بلوشي'

              -- أفريقيا
              WHEN rt.RRR_Nationality IN (N'صومالي', N'الصومال') THEN N'الصومال'
              WHEN rt.RRR_Nationality IN (N'أثيوبي', N'اثيوبيا', N'أثيوبيا') THEN N'اثيوبيا'
              WHEN rt.RRR_Nationality IN (N'إريتري', N'ارتيريا', N'ارتيري', N'إريتريا') THEN N'إريتريا'
              WHEN rt.RRR_Nationality IN (N'مالي') THEN N'مالي'
              WHEN rt.RRR_Nationality IN (N'تشادي', N'تشاد') THEN N'تشاد'
              WHEN rt.RRR_Nationality IN (N'بوركينافاسو') THEN N'بوركينافاسو'
              WHEN rt.RRR_Nationality IN (N'السنغال') THEN N'السنغال'
              WHEN rt.RRR_Nationality IN (N'نيجري', N'النيجر') THEN N'النيجر'
              WHEN rt.RRR_Nationality IN (N'نيجيري', N'نيجيريا') THEN N'نيجيريا'
              WHEN rt.RRR_Nationality IN (N'جنوب  افريقيا', N'جنوب افريقيا', N'جنوب أفريقيا') THEN N'جنوب أفريقيا'
              WHEN rt.RRR_Nationality IN (N'موريتاني') THEN N'موريتانيا'
              WHEN rt.RRR_Nationality IN (N'كيني', N'كينيا') THEN N'كينيا'

              -- أوروبا / أمريكا الشمالية
              WHEN rt.RRR_Nationality IN (N'بريطاني', N'المملكة المتحدة') THEN N'المملكة المتحدة'
              WHEN rt.RRR_Nationality IN (N'كندي', N'كندا') THEN N'كندا'
              WHEN rt.RRR_Nationality IN (N'أمريكي', N'الولايات المتحدة', N'الولايات  المتحدة') THEN N'الولايات المتحدة'
              WHEN rt.RRR_Nationality IN (N'ألماني', N'المانيا', N'ألمانيا') THEN N'المانيا'
              WHEN rt.RRR_Nationality IN (N'فرنسي', N'فرنسا') THEN N'فرنسا'
              WHEN rt.RRR_Nationality IN (N'ايرلندي', N'أيرلندي', N'ايرلندا', N'أيرلندا') THEN N'ايرلندا'
              WHEN rt.RRR_Nationality IN (N'نمساوي', N'النمسا') THEN N'النمسا'
              WHEN rt.RRR_Nationality IN (N'اوكراني', N'اوكرانيا', N'أوكرانيا') THEN N'اوكرانيا'
              WHEN rt.RRR_Nationality IN (N'نرويجي', N'النرويج') THEN N'النرويج'
              WHEN rt.RRR_Nationality IN (N'هولندي', N'هولندا') THEN N'هولندا'
              WHEN rt.RRR_Nationality IN (N'بلجيكي', N'بلجيكا') THEN N'بلجيكا'
              WHEN rt.RRR_Nationality IN (N'بولندا') THEN N'بولندا'
              WHEN rt.RRR_Nationality IN (N'السويد', N'السويدية', N' السويدية') THEN N'السويد'
              WHEN rt.RRR_Nationality IN (N'ايطاليا', N'إيطاليا') THEN N'ايطاليا'
              WHEN rt.RRR_Nationality IN (N'البرتغال', N'برتغالي') THEN N'البرتغال'
              WHEN rt.RRR_Nationality IN (N'لوكسمبورغ') THEN N'لوكسمبورغ'
              WHEN rt.RRR_Nationality IN (N'سويسرا') THEN N'سويسرا'
              WHEN rt.RRR_Nationality IN (N'أسباني', N'اسبانيا', N'أسبانيا') THEN N'اسبانيا'
              WHEN rt.RRR_Nationality IN (N'روسي', N'روسيا الاتحادية') THEN N'روسيا الاتحادية'

              -- الأمريكيتين + جزر
              WHEN rt.RRR_Nationality IN (N'برازيلي', N'البرازيل') THEN N'البرازيل'
              WHEN rt.RRR_Nationality IN (N'الارجنتين', N'الأرجنتين') THEN N'الارجنتين'
              WHEN rt.RRR_Nationality IN (N'فنزويلي', N'فنزويلا') THEN N'فنزويلا'
              WHEN rt.RRR_Nationality IN (N'دومينيكا') THEN N'دومينيكا'
              WHEN rt.RRR_Nationality IN (N'انتيكوا', N'أنتيكوا') THEN N'انتيكوا'
              WHEN rt.RRR_Nationality IN (N'سانت  لوسيا', N'سانت لوسيا') THEN N'سانت  لوسيا'
              WHEN rt.RRR_Nationality IN (N'سانت كيتس  ونافيس', N'سان كريستوفر نيفز') THEN N'سانت كيتس  ونافيس'

              -- أوقيانوسيا
              WHEN rt.RRR_Nationality IN (N'استراليا', N'أستراليا', N'أسترالي') THEN N'استراليا'
              WHEN rt.RRR_Nationality IN (N'فانيوتو', N'فانواتو') THEN N'فانيوتو'

              -- قيم غير صالحة
              WHEN rt.RRR_Nationality IN (N'107', N'حصر ح 1') THEN N'غير محدد'

              ELSE rt.RRR_Nationality
            END AS Nationality
      FROM RER_Titles rt
      WHERE TitleStatus = 'Active' AND RRR_GovIdentityValue = @0
      GROUP BY
        rt.RRR_GovIdentityValue,
        rt.RRR_IdentityType,
        rt.RRR_NameAr,
        rt.RRR_Nationality`;
      const data = await AppDataSource.query(query, [ownerIDNumber]);
      return { data: data[0] as unknown as GetOwnerInfoResponse };
    } catch (error) {
      console.error("⚠️  Error getting owner info data:", error);
      return { data: null as unknown as GetOwnerInfoResponse };
    }
  };

  const getOwnerRealestates = async (ownerIDNumber: string) => {
    try {
      const query = `SELECT
        rt.RealEstate_Number as id,
        rt.DeedDate as DEED_DATE_G,
        COALESCE(rt.UnitAreaSize, rt.AreaSize) as OWNED_AREA,
        rt.AreaSize as TOTAL_AREA_SIZE,
        CASE
          WHEN rt.UndividedShareOfLandValue IS NULL THEN NULL
          WHEN CHARINDEX('/', rt.UndividedShareOfLandValue) > 0 THEN
            TRY_CONVERT(decimal(18,6), LEFT(rt.UndividedShareOfLandValue, CHARINDEX('/', rt.UndividedShareOfLandValue) - 1))
            / NULLIF(
                TRY_CONVERT(decimal(18,6), SUBSTRING(rt.UndividedShareOfLandValue, CHARINDEX('/', rt.UndividedShareOfLandValue) + 1, 100)),
                0
              ) * 100
          ELSE TRY_CONVERT(decimal(18,6), rt.UndividedShareOfLandValue)
        END as OWNED_PERCENTAGE,
        rt.PropertyType as TypeCategoryAr,
        rt.ParcelNumber as LAND_NO,
        rt.PlanNumber as PLAN_NO,
        rt.CityNameAr as City,
        rt.DistrictNameAr as NEIGHBORHOOD_NAME,
        Easting,
        Northing,
        UtmZone
      FROM RER_Titles rt
      WHERE RRR_GovIdentityValue = @0 AND TitleStatus = 'Active'`;
      const data = await AppDataSource.query(query, [ownerIDNumber]);
      console.log(data);
      return { data: data as unknown as GetOwnerRealestatesResponse };
    } catch (error) {
      console.error("⚠️  Error getting owner realestates data:", error);
      return { data: [] as unknown as GetOwnerRealestatesResponse };
    }
  };

  const getOwnerRealestatesCoordinates = async (ownerIDNumber: string) => {
    try {
      const query = `SELECT
        Easting,
        Northing,
        UtmZone
      FROM RER_Titles rt
      WHERE RRR_GovIdentityValue = @0 AND TitleStatus = 'Active'`;
      const data = await AppDataSource.query(query, [ownerIDNumber]);
      const response: GetOwnerRealestatesCoordinatesResponse = {
        Easting: [],
        Northing: [],
        UtmZone: [],
      };
      for (const row of data) {
        if (row.Easting != null) response.Easting.push(String(row.Easting));
        if (row.Northing != null) response.Northing.push(String(row.Northing));
        if (row.UtmZone != null) response.UtmZone.push(String(row.UtmZone));
      }
      return { data: response };
    } catch (error) {
      console.error("⚠️  Error getting owner realestates data:", error);
      return {
        data: {
          Easting: [],
          Northing: [],
          UtmZone: [],
        },
      };
    }
  };
  // Decorate the fastify instance with the generalService
  fastify.decorate("foreignOwnershipOwnersService", {
    getOwners,
    getOwnerInfo,
    getOwnerRealestates,
    getOwnerRealestatesCoordinates,
    getOwnersStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    foreignOwnershipOwnersService: {
      getOwners: (
        filter: GetOwnersFilterType,
        pagination?: { skip: number; take: number },
      ) => Promise<{ data: GetOwnersResponse; totalRecords: number }>;
      getOwnerInfo: (ownerIDNumber: string) => Promise<{ data: GetOwnerInfoResponse }>;
      getOwnerRealestates: (
        ownerIDNumber: string,
      ) => Promise<{ data: GetOwnerRealestatesResponse }>;
      getOwnerRealestatesCoordinates: (
        ownerIDNumber: string,
      ) => Promise<{ data: GetOwnerRealestatesCoordinatesResponse }>;
      getOwnersStatistics: (
        filter: GetOwnersStatisticsFilterType,
      ) => Promise<{ data: GetOwnersStatisticsResponse }>;
    };
  }
}
