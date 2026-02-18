// import fp from "fastify-plugin";
// import {
//   TResponse as GetRequestChartResponse,
//   TBody as TFilter,
// } from "./schemas/getRequestChart.schema";
// import { RERDataSource } from "../../../config/database";
// import { generateDurationCond, DurationParam } from "../../../helper/rer/filterQueryGenerator";

// export default fp(async (fastify) => {
//   const queryHelper = {
//     WEEK: {
//       select: ["YearNumber", "WeekOfYearNumber"],
//       groupBy: ["YearNumber", "WeekOfYearNumber"],
//       orderBy: ["YearNumber DESC", "WeekOfYearNumber ASC"],
//     },
//     MONTH: {
//       select: ["YearNumber", "MonthNumber"],
//       groupBy: ["YearNumber", "MonthNumber"],
//       orderBy: ["YearNumber DESC", "MonthNumber ASC"],
//     },
//     QUARTER: {
//       select: ["YearNumber", "QuarterNumber"],
//       groupBy: ["YEAR(CreatedAtDT)", "DATEPART(QUARTER, CreatedAtDT)"],
//       orderBy: ["YearNumber DESC", "QuarterNumber ASC"],
//     },
//     YEAR: {
//       select: ["YEAR(CreatedAtDT) AS YearNumber"],
//       groupBy: ["YEAR(CreatedAtDT)"],
//       orderBy: ["YearNumber DESC"],
//     },
//   };

//   const getRequestChart = async (filter: TFilter) => {
//     try {
//       const helper = queryHelper[filter.filter.duration.type as keyof typeof queryHelper];
//       const durationSelect = helper?.select || [];
//       const durationGroupBy = helper?.groupBy || [];
//       const durationOrderBy = helper?.orderBy || [];
//       // Build parameters array and positional placeholders
//       const parameters: DurationParam[] = [];
//       let paramIndex = 0;

//       // City parameters
//       const cityParams = filter.filter.city
//         .map((city) => {
//           parameters.push(city);
//           return `@${paramIndex++}`;
//         })
//         .join(", ");

//       // Generate duration WHERE clause using generateDurationCond
//       const durationCond = generateDurationCond(
//         filter.filter.duration,
//         paramIndex,
//         "WeekOfYearNumber",
//       );
//       parameters.push(...durationCond.params);
//       paramIndex = durationCond.nextParamIndex;

//       // District parameter (optional)
//       let districtClause = "";
//       if (filter.filter.district) {
//         districtClause = `AND FR.DistrictNameAr = @${paramIndex++}`;
//         parameters.push(filter.filter.district);
//       }

//       // Status parameter (optional)
//       let statusClause = "";
//       if (filter.filter.status) {
//         statusClause = `AND FR.CaseStatus = @${paramIndex++}`;
//         parameters.push(filter.filter.status);
//       }

//       // Build the query with duration condition
//       const sql = `
//         SELECT
//           ${durationSelect.join(", ")},
//           SUM(CASE WHEN FR.CaseStatus = 'Approved' THEN 1 ELSE 0 END) AS total_approved,
//           SUM(CASE WHEN FR.CaseStatus = 'Rejected' THEN 1 ELSE 0 END) AS total_rejected,
//           SUM(CASE WHEN FR.CaseStatus = 'New' THEN 1 ELSE 0 END) AS total_pending,
//           FR.CityNameAr AS CityName
//         FROM "FR" AS FR
//         WHERE FR.CityNameAr IN (${cityParams})
//         AND ${durationCond.clause}
//         ${districtClause}
//         ${statusClause}
//         GROUP BY
//           ${durationGroupBy.join(", ")},
//           FR.CityNameAr
//         ORDER BY
//           ${durationOrderBy.join(", ")},
//           CityName
//       `;

//       const query = RERDataSource.query(sql, parameters);
//       let data = await query;

//       return { data: data as unknown as GetRequestChartResponse };
//     } catch (error) {
//       console.error("⚠️  Error getting request chart:", error);
//       return { data: [] as unknown as GetRequestChartResponse };
//     }
//   };

//   // Decorate the fastify instance with the generalService
//   fastify.decorate("rerRequestsService", {
//     getRequestChart,
//   });
// });

// declare module "fastify" {
//   interface FastifyInstance {
//     rerRequestsService: {
//       getRequestChart: (filter: TFilter) => Promise<{ data: GetRequestChartResponse }>;
//     };
//   }
// }
