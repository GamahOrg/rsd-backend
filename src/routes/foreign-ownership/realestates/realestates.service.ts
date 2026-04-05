import fp from "fastify-plugin";
import {
  TFilter as GetRealestatesCoordinatesFilterType,
  TResponse as GetRealestatesCoordinatesResponseType,
} from "./schemas/GetRealestatesCoordinates.schema";
import { AppDataSource } from "../../../config/database";

export default fp(async (fastify) => {
  //   const getOwnersStatistics = async (filter: GetOwnersStatisticsFilterType) => {
  //     try {
  //       // Build parameters array and positional placeholders
  //       const { whereClause, parameters } = generateWhereClause(filter);

  //       const sql = `
  // SELECT
  // count(distinct rt.RRR_GovIdentityValue) as totalOwners,
  //    count(distinct rt.RealEstate_Number)  AS totalRealEstates,
  //      sum(COALESCE(rt.UnitAreaSize, rt.AreaSize)) AS totalArea
  //     FROM RER_Titles rt
  //     WHERE rt.TitleStatus = 'Active'
  //       AND rt.RRR_IdentityType NOT IN (
  //             N'NationalIdentity',
  //             N'Government Entity Number',
  //             N'Unified Number',
  //             N'Commercial Number'
  //       )
  //       AND NULLIF(LTRIM(RTRIM(rt.RRR_GovIdentityValue)), N'') IS NOT NULL
  //       ${whereClause}
  //       `;
  //       const data = await AppDataSource.query(sql, parameters);
  //       return { data: data[0] as unknown as GetOwnersStatisticsResponse };
  //     } catch (error) {
  //       console.error("⚠️  Error getting owners statistics data:", error);
  //       return { data: [] as unknown as GetOwnersStatisticsResponse };
  //     }
  //   };

  const getRealestatesCoordinates = async (filter: GetRealestatesCoordinatesFilterType) => {
    try {
      const { whereClause, parameters } = generateWhereClause(filter);
      const query = `SELECT DISTINCT
        Easting,
        Northing,
        UtmZone
      FROM RER_Titles rt
    WHERE rt.TitleStatus = 'Active'
      AND rt.RRR_IdentityType NOT IN (
            N'NationalIdentity',
            N'Government Entity Number',
            N'Unified Number',
            N'Commercial Number'
      )
      AND NULLIF(LTRIM(RTRIM(rt.RRR_GovIdentityValue)), N'') IS NOT NULL
      ${whereClause}
      `;
      const data = await AppDataSource.query(query, parameters);
      const response: GetRealestatesCoordinatesResponseType = {
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

  const generateWhereClause = (filter: GetRealestatesCoordinatesFilterType) => {
    let whereClause = "";
    const parameters: string[] = [];
    let paramIndex = 0;
    if (filter.filter.region && filter.filter.region.length > 0) {
      const regionParams = filter.filter.region
        .map((region) => {
          parameters.push(region);
          return `@${paramIndex++}`;
        })
        .join(", ");
      whereClause += `AND rt.RegionNameAr IN (${regionParams})`;
    }
    if (filter.filter.city && filter.filter.city.length > 0) {
      const cityParams = filter.filter.city
        .map((city) => {
          parameters.push(city);
          return `@${paramIndex++}`;
        })
        .join(", ");
      whereClause += `AND rt.CityNameAr IN (${cityParams})`;
    }
    if (filter.filter.nationality && filter.filter.nationality.length > 0) {
      const nationalityParams = filter.filter.nationality
        .map((nationality) => {
          parameters.push(nationality);
          return `@${paramIndex++}`;
        })
        .join(", ");
      whereClause += `AND rt.RRR_Nationality IN (${nationalityParams})`;
    }
    if (filter.filter.identityType && filter.filter.identityType.length > 0) {
      const identityTypeParams = filter.filter.identityType
        .map((identityType) => {
          parameters.push(identityType);
          return `@${paramIndex++}`;
        })
        .join(", ");
      whereClause += `AND rt.RRR_IdentityType IN (${identityTypeParams})`;
    }
    return { whereClause, parameters };
  };
  // Decorate the fastify instance with the generalService
  fastify.decorate("foreignOwnershipRealestatesService", {
    getRealestatesCoordinates,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    foreignOwnershipRealestatesService: {
      getRealestatesCoordinates: (
        filter: GetRealestatesCoordinatesFilterType,
      ) => Promise<{ data: GetRealestatesCoordinatesResponseType }>;
    };
  }
}
