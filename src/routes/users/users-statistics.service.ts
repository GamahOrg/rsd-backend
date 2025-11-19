import fp from "fastify-plugin";
import { XDataSource } from "../../config/database";
import { TResponse as GetIsVerifiedStatisticsResponse } from "./schemas/statistics/getIsVerifiedStatistics.schema";
import { User } from "../../database/entity/User.entity";
import { TResponse as GetVerifiedTypeStatisticsResponse } from "./schemas/statistics/getIsVerifiedTypeStatistics.schema";

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
  const getVerifiedTypeStatistics = async () => {
    const verifiedTypes = ["government", "blue", "business"] as const;
    const userRepo = XDataSource.getRepository(User);
    const [government, blue, business] = await Promise.all(
      verifiedTypes.map((verifiedType) =>
        userRepo.count({ where: { verified_type: verifiedType } }),
      ),
    );
    return {
      data: {
        government: government,
        blue: blue,
        business: business,
      },
    };
  };

  const toPercentage = (count: number, total: number) =>
    total > 0 ? Math.round((count / total) * 10000) / 100 : 0; // rounded to 2 decimals

  // Decorate the fastify instance with the usersStatisticsService
  fastify.decorate("usersStatisticsService", {
    getIsVerifiedStatistics,
    getVerifiedTypeStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    usersStatisticsService: {
      getIsVerifiedStatistics: () => Promise<{ data: GetIsVerifiedStatisticsResponse }>;
      getVerifiedTypeStatistics: () => Promise<{ data: GetVerifiedTypeStatisticsResponse }>;
    };
  }
}
