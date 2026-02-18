import fp from "fastify-plugin";
import { TResponse as GetStatisticsResponse } from "./schemas/getStatistics.schema";
import { TResponse as GetCitiesResponse } from "./schemas/getCities.schema";
import { TResponse as GetDistrictsResponse } from "./schemas/getDistricts.schema";
import { TResponse as GetPropertyTypesResponse } from "./schemas/getPropertyTypes.schema";
import { TResponse as GetRegionsResponse } from "./schemas/getRegions.schema";
import { TResponse as GetNationalitiesResponse } from "./schemas/getNationalities.schema";
import { AppDataSource } from "../../../config/database";

export default fp(async (fastify) => {
  const getStatistics = async () => {
    const cached = await fastify.redis.get("foreign_ownership_general_statistics:list");
    if (cached) {
      return { data: JSON.parse(cached) as GetStatisticsResponse };
    }
    const queries = await Promise.all([
      AppDataSource.query(
        `SELECT
          COUNT(DISTINCT rt.RealEstate_Number) AS total_realestate,
          COUNT(DISTINCT rt.RRR_GovIdentityValue) AS total_owners,
          SUM(rt.AreaSize) AS total_area,
          SUM(CASE WHEN rt.RRR_IdentityType = 'IqamaIdentity' THEN 1 ELSE 0 END) AS total_owners_r_iqama,
          SUM(CASE WHEN rt.RRR_IdentityType = 'Premium Iqama' THEN 1 ELSE 0 END) AS total_owners_p_iqama,
          SUM(CASE WHEN rt.RRR_IdentityType = 'GCCIdentity' THEN 1 ELSE 0 END) AS total_owners_gcc_id,
          SUM(CASE WHEN rt.RRR_IdentityType = 'GCCPassport' THEN 1 ELSE 0 END) AS total_owners_gcc_passport
        FROM [RSD_DEV].[dbo].RER_Titles rt
        WHERE rt.RRR_Nationality != ''
          AND rt.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
          AND rt.TitleStatus = 'Active'`,
      ),
      AppDataSource.query(
        `SELECT rt.PropertyUse AS name,
          COUNT(DISTINCT RealEstate_Number) AS total
        FROM [RSD_DEV].[dbo].RER_Titles rt
        WHERE rt.RRR_Nationality != ''
          AND rt.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
          AND rt.TitleStatus = 'Active'
        GROUP BY rt.PropertyUse
        ORDER BY total DESC`,
      ),
      AppDataSource.query(
        `SELECT rt.CityNameAr AS name,
          COUNT(DISTINCT RealEstate_Number) AS total
        FROM [RSD_DEV].[dbo].RER_Titles rt
        WHERE rt.RRR_Nationality != ''
          AND rt.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')
          AND rt.TitleStatus = 'Active'
        GROUP BY rt.CityNameAr
        ORDER BY total DESC`,
      ),
      AppDataSource.query(
        `SELECT
          TOP (1)
          m.name,
          COUNT(DISTINCT rt.RealEstate_Number) AS total
        FROM [RSD_DEV].[dbo].RER_Titles rt
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
          m.name ASC`,
      ),
      AppDataSource.query(
        `SELECT
    CAST(COUNT(DISTINCT rt.RealEstate_Number) AS decimal(10,4))
    / (
        SELECT COUNT(DISTINCT RealEstate_Number)
        FROM [RSD_DEV].[dbo].RER_Titles
        WHERE TitleStatus = 'Active'
      ) * 100 AS percentage
FROM [RSD_DEV].[dbo].RER_Titles rt
WHERE rt.TitleStatus = 'Active'
  AND rt.RRR_IdentityType NOT IN (
        N'NationalIdentity',
        N'Government Entity Number',
        N'Unified Number'
      );
      `,
      ),
    ]);

    const [totals, topPropertyTypes, topCities, topNationalities, ownedPercentage] =
      queries as Array<Array<Record<string, number | string | null>>>;

    const result = {
      total_realestate: parseInt(totals?.[0]?.total_realestate?.toString() ?? "0", 10),
      total_owners: parseInt(totals?.[0]?.total_owners?.toString() ?? "0", 10),
      total_area: Number(totals?.[0]?.total_area ?? 0),
      total_owners_r_iqama: parseInt(totals?.[0]?.total_owners_r_iqama?.toString() ?? "0", 10),
      total_owners_p_iqama: parseInt(totals?.[0]?.total_owners_p_iqama?.toString() ?? "0", 10),
      total_owners_gcc_id: parseInt(totals?.[0]?.total_owners_gcc_id?.toString() ?? "0", 10),
      total_owners_gcc_passport: parseInt(
        totals?.[0]?.total_owners_gcc_passport?.toString() ?? "0",
        10,
      ),
      top_property_type: topPropertyTypes?.[0]?.name?.toString() ?? "",
      top_city: topCities?.[0]?.name?.toString() ?? "",
      top_nationality: topNationalities?.[0]?.name?.toString() ?? "",
      owned_percentage: Number(ownedPercentage?.[0]?.percentage?.toString() ?? "0").toFixed(2) ?? 0,
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
          total_realestate: 0,
          total_owners: 0,
          total_area: 0,
          total_owners_r_iqama: 0,
          total_owners_p_iqama: 0,
          total_owners_gcc_id: 0,
          total_owners_gcc_passport: 0,
          top_property_type: "",
          top_city: "",
          top_nationality: "",
          owned_percentage: 0,
        } as unknown as GetStatisticsResponse,
      };
    }
  };

  const getCities = async (region?: string | undefined) => {
    const cached = await fastify.redis.get(`foreign_ownership_cities:list:${region}`);
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
      await fastify.redis.setex(
        `foreign_ownership_cities:list:${region}`,
        86400,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetCitiesResponse };
  };

  const getDistricts = async (city: string) => {
    const cached = await fastify.redis.get(`foreign_ownership_districts:list:${city}`);
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
      await fastify.redis.setex(
        `foreign_ownership_districts:list:${city}`,
        86400,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetDistrictsResponse };
  };

  const getPropertyTypes = async () => {
    const cached = await fastify.redis.get("foreign_ownership_property_types:list");
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
      await fastify.redis.setex(
        "foreign_ownership_property_types:list",
        86400,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetPropertyTypesResponse };
  };

  const getRegions = async () => {
    const cached = await fastify.redis.get("foreign_ownership_regions:list");
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
      await fastify.redis.setex("foreign_ownership_regions:list", 86400, JSON.stringify(data));
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetRegionsResponse };
  };

  const getNationalities = async () => {
    const cached = await fastify.redis.get(`foreign_ownership_nationalities:list`);
    if (cached) {
      return { data: JSON.parse(cached) as GetNationalitiesResponse };
    }
    const nationalitiesRepo = AppDataSource.createQueryBuilder()
      .from("RER_Titles", "T")
      .select("T.RRR_Nationality", "value")
      .addSelect("T.RRR_Nationality", "label")
      .where("T.RRR_Nationality IS NOT NULL")
      .andWhere("T.RRR_Nationality != ''")
      .andWhere(
        "T.RRR_IdentityType NOT IN (N'NationalIdentity', N'Government Entity Number', N'Unified Number', N'Commercial Number')",
      )
      .groupBy("T.RRR_Nationality")
      .orderBy("COUNT(*)", "DESC");
    let data = await nationalitiesRepo.getRawMany();
    try {
      await fastify.redis.setex(
        `foreign_ownership_nationalities:list`,
        86400,
        JSON.stringify(data),
      );
    } catch (error) {
      console.error("⚠️  Redis cache storage failed:", error);
    }
    return { data: data as unknown as GetNationalitiesResponse };
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("foreignOwnershipGeneralService", {
    getStatistics,
    getCities,
    getDistricts,
    getPropertyTypes,
    getRegions,
    getNationalities,
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
    };
  }
}
