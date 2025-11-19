import fp from "fastify-plugin";
import { XDataSource } from "../../config/database";
import { TResponse as GetIsVerifiedStatisticsResponse } from "./schemas/statistics/getIsVerifiedStatistics.schema";
import { User } from "../../database/entity/User.entity";

export default fp(async (fastify) => {
  const getIsVerifiedStatistics = async () => {
    const verifiedTypes = ["verified", "unverified"] as const;

    const userRepo = XDataSource.getRepository(User);

    // Generate all filter queries first
    const filterQueries = verifiedTypes.map((verifiedType) => ({
      is_verified: verifiedType === "verified",
    }));

    const counts = await Promise.all(
      filterQueries.map((filterQuery) => userRepo.count({ where: filterQuery })),
    );
    const [verified, unverified] = counts;
    const total = verified + unverified;

    return {
      data: {
        verified: toPercentage(verified, total),
        unverified: toPercentage(unverified, total),
      },
    };
  };

  const toPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 10000) / 100 : 0; // rounded to 2 decimals

  // Decorate the fastify instance with the usersStatisticsService
  fastify.decorate("usersStatisticsService", {
    getIsVerifiedStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    usersStatisticsService: {
      getIsVerifiedStatistics: () => Promise<{ data: GetIsVerifiedStatisticsResponse }>;
    };
  }
}
