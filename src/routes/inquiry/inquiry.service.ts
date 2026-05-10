import fp from "fastify-plugin";
import { AppDataSource, InquiryDataSource } from "../../config/database";
import { getNafathToken } from "../../plugins/nafath-plugin/nafath-token";

const APIGEE_URL = process.env.APIGEE_URL || "https://api-test.rega.gov.sa";

interface RerTitleRow {
  RealEstate_Number: string;
  CaseNumber: string;
  TitleStatus: string;
  PropertyType: string;
  DistrictNameAr: string;
  CityNameAr: string;
  RegionNameAr: string;
  AreaSize: string | number;
  DeedNumber: string;
  DeedDate: string;
  OwningShareFraction: string;
  RRR_NameAr: string;
  RRR_Nationality: string;
  RRR_Gender: string;
  ParcelNumber: string;
  PlanNumber: string;
  BlockNumber: string;
  HasInactive: number;
}

interface TransferRow {
  case_number: string;
  case_status: string;
  case_date: string;
  transfer_type: string;
  is_new_owner: string;
  owner_name: string;
  owner_type: string;
  owner_id_number: string;
  [key: string]: unknown;
}

interface MojDeed {
  DeedNo: string;
  DeedDate: string;
  DeedCity: string;
  DeedArea: string | number;
  DeedStatus: string;
  DeedOwnershipPercentage: string | number;
}

function fractionToPercentage(fraction: string | null | undefined): string {
  if (!fraction) return "0%";
  const str = String(fraction).trim();
  const parts = str.split("/");
  if (parts.length !== 2) return str;
  const numerator = parseFloat(parts[0]);
  const denominator = parseFloat(parts[1]);
  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) return "0%";
  const percentage = (numerator / denominator) * 100;
  return `${parseFloat(percentage.toFixed(2))}%`;
}

export default fp(async (fastify) => {
  const getRerProperties = async (
    idValue: number,
    page: number,
    pageSize: number,
  ): Promise<{ rows: RerTitleRow[]; total: number }> => {
    const offset = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      AppDataSource.query(
        `SELECT
          RealEstate_Number,
          CaseNumber,
          TitleStatus,
          PropertyType,
          DistrictNameAr,
          CityNameAr,
          RegionNameAr,
          AreaSize,
          DeedNumber,
          DeedDate,
          OwningShareFraction,
          RRR_NameAr,
          RRR_Nationality,
          RRR_Gender,
          ParcelNumber,
          PlanNumber,
          BlockNumber,
          HasInactive
        FROM (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY RealEstate_Number ORDER BY SubmissionDate DESC) AS rn,
            MAX(CASE WHEN TitleStatus = 'Inactive' THEN 1 ELSE 0 END) OVER (PARTITION BY RealEstate_Number) AS HasInactive
          FROM [dbo].[RER_Titles]
          WHERE RRR_GovIdentityValue = @0
          AND RRRType = 'Ownership'
        ) AS ranked
        WHERE rn = 1
        ORDER BY RealEstate_Number
        OFFSET @1 ROWS FETCH NEXT @2 ROWS ONLY`,
        [String(idValue), offset, pageSize],
      ) as Promise<RerTitleRow[]>,
      AppDataSource.query(
        `SELECT COUNT(DISTINCT RealEstate_Number) as total FROM [dbo].[RER_Titles] WHERE RRR_GovIdentityValue = @0 AND RRRType = 'Ownership' AND TitleStatus = 'Active'`,
        [String(idValue)],
      ) as Promise<[{ total: number }]>,
    ]);

    return { rows, total: parseInt(String(countResult[0]?.total ?? 0), 10) };
  };

  const getMojDeeds = async (idValue: number, idType: number): Promise<MojDeed[]> => {
    const token = await getNafathToken();
    const mojIdTypeMap: Record<number, number> = { 1: 1, 2: 3, 3: 8, 5: 5 };
    const mojIdType = mojIdTypeMap[idType] ?? 1;
    const url = `${APIGEE_URL}/v1/moj/deed-operations/Deeds/${idValue}/${mojIdType}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MOJ API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return (Array.isArray(data) ? data : data?.data || data?.Data || []) as MojDeed[];
  };

  const getOwnerInfo = async (idValue: number): Promise<{ data: OwnerInfo | null }> => {
    try {
      const idStr = String(idValue);
      const infoRows = await AppDataSource.query(
        `SELECT TOP 1
            RRR_NameAr as name,
            RRR_Nationality as nationality,
            RRR_Gender as gender,
            RRR_IdentityType as identity_type
          FROM [dbo].[RER_Titles]
          WHERE RRR_GovIdentityValue = @0`,
        [idStr],
      );
      const info = infoRows[0];
      if (!info) return { data: null };

      const total_realestates_by_name = await AppDataSource.query(
        `SELECT COUNT(DISTINCT RealEstate_Number) as total 
        FROM [dbo].[RER_Titles] 
        WHERE  RRR_GovIdentityValue != @0 AND RRR_NameAr = @1 
        AND TitleStatus = 'Active'
        AND RRRType = 'Ownership'`,
        [idStr, info.name],
      );
      return {
        data: {
          id: String(idValue),
          name: info.name as string | null,
          nationality: info.nationality as string | null,
          gender: info.gender as string | null,
          identity_type: info.identity_type as number | null,
          total_realestates_by_name: total_realestates_by_name[0]?.total as number | null,
        },
      };
    } catch (error) {
      console.error("Failed to get owner info:", error);
      return {
        data: null,
      };
    }
  };

  const getTransferDetails = async (
    realEstateNumbers: string[],
    ownerIdNumber: string,
  ): Promise<Map<string, TransferRow[]>> => {
    if (realEstateNumbers.length === 0) return new Map();

    const placeholders = realEstateNumbers.map((_, i) => `@${i}`).join(", ");
    const ownerParam = `@${realEstateNumbers.length}`;

    const sql = `
      SELECT
        t2.Case_Number,
        t2.CaseStatus,
        t2.CaseDate,
        t2.TransferType,
        t2.IsNewOwner,
        t2.OwnerName,
        t2.OwnerType,
        t2.OwnerIdNumber,
        t2.OwnerShare,
        t1.REN
      FROM [dbo].[RER_TR] t1
      INNER JOIN [dbo].[RER_TR] t2 ON t1.Case_Number = t2.Case_Number
      WHERE t1.REN IN (${placeholders})
        AND t1.OwnerIDNumber = ${ownerParam}
    `;
    const params = [...realEstateNumbers, ownerIdNumber];
    const rows: (TransferRow & { REN: string })[] = await AppDataSource.query(sql, params);
    const grouped = new Map<string, TransferRow[]>();
    for (const row of rows) {
      const key = row.REN;
      if (!grouped.has(key)) grouped.set(key, []);
      const idNum = String(row.owner_id_number ?? row.OwnerIdNumber ?? "");
      const isNewOwner = String(row.is_new_owner ?? row.IsNewOwner ?? "");
      if (idNum === ownerIdNumber && isNewOwner == "1") continue;

      grouped.get(key)!.push({
        case_number: row.case_number ?? row.Case_Number,
        case_status: row.case_status ?? row.CaseStatus,
        case_date: row.case_date ?? row.CaseDate,
        transfer_type: row.transfer_type ?? row.TransferType,
        is_new_owner: isNewOwner,
        owner_name: row.owner_name ?? row.OwnerName,
        owner_type: row.owner_type ?? row.OwnerType,
        owner_id_number: idNum,
        owner_share: fractionToPercentage(String(row.owner_share ?? row.OwnerShare)),
      });
    }
    return grouped;
  };

  const toStr = (v: unknown): string | null => (v != null && v !== "" ? String(v) : null);

  const mapRerRow = (row: RerTitleRow, transferMap: Map<string, TransferRow[]>) => {
    return {
      deed_number: toStr(row.DeedNumber),
      case_number: toStr(row.CaseNumber),
      realestate_number: toStr(row.RealEstate_Number),
      deed_date: toStr(row.DeedDate),
      status: toStr(row.TitleStatus),
      city: toStr(row.CityNameAr),
      district: toStr(row.DistrictNameAr),
      area: toStr(row.AreaSize),
      owning_percentage: fractionToPercentage(row.OwningShareFraction),
      property_type: toStr(row.PropertyType),
      parcel_number: toStr(row.ParcelNumber),
      plan_number: toStr(row.PlanNumber),
      block_number: toStr(row.BlockNumber),
      transfer_info:
        row.HasInactive === 1
          ? (transferMap.get(row.RealEstate_Number) ?? []).map((t) => ({
              case_number: toStr(t.case_number),
              case_status: toStr(t.case_status),
              case_date: toStr(t.case_date),
              transfer_type: toStr(t.transfer_type),
              is_new_owner: toStr(t.is_new_owner),
              owner_name: toStr(t.owner_name),
              owner_type: toStr(t.owner_type),
              owner_id_number: toStr(t.owner_id_number),
              owner_share: toStr(t.owner_share),
            }))
          : null,
    };
  };

  const getRerPropertiesByOwner = async (idValue: number, page: number, pageSize: number) => {
    const { rows: rerRows, total } = await getRerProperties(idValue, page, pageSize);
    const inactiveRENs = rerRows
      .filter((r) => r.HasInactive === 1)
      .map((r) => r.RealEstate_Number)
      .filter(Boolean);

    const transferMap = await getTransferDetails(inactiveRENs, String(idValue));
    return {
      data: rerRows.map((row) => mapRerRow(row, transferMap)),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    };
  };

  const getMojPropertiesByOwner = async (idType: number, idValue: number) => {
    const mojDeeds = await getMojDeeds(idValue, idType);

    const data = mojDeeds.map((deed) => ({
      deed_number: toStr(deed.DeedNo),
      case_number: null as string | null,
      deed_date: toStr(deed.DeedDate),
      status: toStr(deed.DeedStatus) === "A" ? "Active" : "Inactive",
      city: toStr(deed.DeedCity),
      district: null as string | null,
      area: toStr(deed.DeedArea),
      owning_percentage:
        deed.DeedOwnershipPercentage != null ? `${deed.DeedOwnershipPercentage}%` : null,
      parcel_number: null as string | null,
      plan_number: null as string | null,
      block_number: null as string | null,
      realestate_number: null as string | null,
    }));

    return { data };
  };

  const logInquiry = async (params: {
    userId: string | null;
    requestBody: unknown;
    service: string;
    ipAddress: string | null;
    userAgent: string | null;
  }) => {
    try {
      await InquiryDataSource.query(
        `INSERT INTO [dbo].[inquiry_log]
          (request_body, user_id, platform, service, environment, ip_address, user_agent)
         VALUES (@0, @1, @2, @3, @4, @5, @6)`,
        [
          JSON.stringify(params.requestBody),
          params.userId,
          "rsd",
          params.service,
          process.env.NODE_ENV || "development",
          params.ipAddress,
          params.userAgent,
        ],
      );
    } catch (error) {
      console.error("Failed to log inquiry request:", error);
    }
  };

  fastify.decorate("inquiryService", {
    getOwnerInfo,
    getMojPropertiesByOwner,
    getRerPropertiesByOwner,
    logInquiry,
  });
});

type TransferInfoRow = {
  case_number: string | null;
  case_status: string | null;
  case_date: string | null;
  transfer_type: string | null;
  is_new_owner: string | null;
  owner_name: string | null;
  owner_type: string | null;
  owner_id_number: string | null;
  owner_share: string | null;
};

type PropertyRow = {
  deed_number: string | null;
  case_number: string | null;
  realestate_number: string | null;
  deed_date: string | null;
  status: string | null;
  city: string | null;
  district: string | null;
  area: string | null;
  owning_percentage: string | null;
  parcel_number: string | null;
  plan_number: string | null;
  block_number: string | null;
};

type RerPropertyRow = PropertyRow & {
  property_type: string | null;
  transfer_info: TransferInfoRow[] | null;
};

type OwnerInfo = {
  id: string;
  name: string | null;
  nationality: string | null;
  gender: string | null;
  identity_type: number | null;
  total_realestates_by_name: number | null;
};

type MojPropertyRow = PropertyRow;

declare module "fastify" {
  interface FastifyInstance {
    inquiryService: {
      getOwnerInfo: (idValue: number) => Promise<{ data: OwnerInfo | null }>;
      getMojPropertiesByOwner: (
        idType: number,
        idValue: number,
      ) => Promise<{ data: Array<MojPropertyRow> }>;
      getRerPropertiesByOwner: (
        idValue: number,
        page: number,
        pageSize: number,
      ) => Promise<{
        data: Array<RerPropertyRow>;
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>;
      logInquiry: (params: {
        userId: string | null;
        requestBody: unknown;
        service: string;
        ipAddress: string | null;
        userAgent: string | null;
      }) => Promise<void>;
    };
  }
}
