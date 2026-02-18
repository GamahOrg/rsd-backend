import fp from "fastify-plugin";
import { TResponse as GetClaimsByStatusCountResponse } from "./schemas/GetClaimsByStatusCount.schema";
import { TFilter } from "../../../models/types/rer/filter.type";
import { AppDataSource } from "../../../config/database";
import { TResponse as GetClaimsByStatusGroupByDateCountResponse } from "./schemas/GetClaimsGroupByDateCount.schema";
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

  const getClaimsByStatusCount = async (filter: TFilter) => {
    const duration = filter.filter?.duration;

    if (!duration) {
      return { data: [] as unknown as GetClaimsByStatusCountResponse };
    }

    const parameters: DurationParam[] = [];
    const durationCond = generateDurationCond(duration, 0, "WeekOfYearNumber");
    parameters.push(...durationCond.params);

    const sql = `
      SELECT 
        SUM(RC.approved) AS approved_claims,
        SUM(RC.rejected) AS rejected_claims
      FROM "RER_Claims" AS RC
      WHERE ${durationCond.clause}
    `;

    const result = await AppDataSource.query(sql, parameters);
    const data = result[0];
    return data.approved_claims > 0 || data.rejected_claims > 0
      ? {
          data: [
            {
              label: "مقبول",
              count: data.approved_claims || 0,
            },
            {
              label: "مرفوض",
              count: data.rejected_claims || 0,
            },
          ] as unknown as GetClaimsByStatusCountResponse,
        }
      : {
          data: [] as unknown as GetClaimsByStatusCountResponse,
        };
  };

  const getClaimsByStatusGroupByDateCount = async (filter: TFilter) => {
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

      // Build the query: aggregate once, then unpivot with CROSS APPLY (single table scan)
      const sql = `
        SELECT 
          agg.*,
          x.Label,
          x.Count
        FROM (
          SELECT 
            ${durationSelect.join(", ")},
            SUM(RC.approved) AS approved_count,
            SUM(RC.rejected) AS rejected_count
          FROM RER_Claims AS RC
          WHERE ${durationCond.clause}
          GROUP BY ${durationGroupBy.join(", ")}
        ) agg
        CROSS APPLY (
          VALUES 
            (N'مقبول', agg.approved_count),
            (N'مرفوض', agg.rejected_count)
        ) x(Label, Count)
        ORDER BY ${durationOrderBy.join(", ")}, Label
      `;

      const query = AppDataSource.query(sql, parameters);
      const data = await query;
      return { data: data as unknown as GetClaimsByStatusGroupByDateCountResponse };
    } catch (error) {
      console.error("⚠️  Error getting claims by status group by date count:", error);
      return { data: [] as unknown as GetClaimsByStatusGroupByDateCountResponse };
    }
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerClaimsService", {
    getClaimsByStatusCount,
    getClaimsByStatusGroupByDateCount,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerClaimsService: {
      getClaimsByStatusCount: (
        filter: TFilter,
      ) => Promise<{ data: GetClaimsByStatusCountResponse }>;
      getClaimsByStatusGroupByDateCount: (
        filter: TFilter,
      ) => Promise<{ data: GetClaimsByStatusGroupByDateCountResponse }>;
    };
  }
}
