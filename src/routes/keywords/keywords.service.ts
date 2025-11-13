import fp from "fastify-plugin";
import { TResponse as GetKeywordsResponse } from "./schemas/getKeywords.schema";
import { TResponse as GetKeywordsStatisticsResponse } from "./schemas/getKeywordsStatistics.schema";
import { XDataSource } from "../../config/database";
import { Keyword } from "../../database/entity/Keyword.entity";

export default fp(async (fastify) => {
  const getKeywordsByKeyword = async (keyword: string, skip: number, take: number) => {
    const keywordRepo = XDataSource.getRepository(Keyword);

    const qb = keywordRepo
      .createQueryBuilder("keyword")
      .select("keyword.id", "id")
      .addSelect("keyword.keyword", "value")
      .where("keyword.keyword LIKE :keyword", { keyword: `${keyword}%` })
      .orderBy("keyword.keyword", "ASC");

    const totalRecords = await qb.getCount();
    const data = await qb.skip(skip).take(take).getRawMany();

    return { data: data as unknown as GetKeywordsResponse, totalRecords };
  };

  const getKeywordsStatistics = async (
    search: string,
    skip: number,
    take: number,
    order_by?: { field: string; direction: "asc" | "desc" },
  ) => {
    const keywordRepo = XDataSource.getRepository(Keyword);
    const qb = keywordRepo.createQueryBuilder("keyword").select("*");
    if (search) {
      qb.where("keyword.keyword LIKE :search", { search: `${search}%` });
    }
    if (order_by) {
      const direction = order_by.direction.toLowerCase() === "asc" ? "ASC" : "DESC";
      qb.orderBy(`keyword.${order_by.field}`, direction);
    }
    const totalRecords = await qb.getCount();
    const data = await qb.skip(skip).take(take).getRawMany();
    return { data: data as unknown as GetKeywordsStatisticsResponse, totalRecords };
  };

  // Decorate the fastify instance with the keywordService
  fastify.decorate("keywordService", {
    getKeywordsByKeyword,
    getKeywordsStatistics,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    keywordService: {
      getKeywordsByKeyword: (
        keyword: string,
        skip: number,
        take: number,
      ) => Promise<{ data: GetKeywordsResponse; totalRecords: number }>;
      getKeywordsStatistics: (
        search: string,
        skip: number,
        take: number,
        order_by?: { field: string; direction: "asc" | "desc" },
      ) => Promise<{ data: GetKeywordsStatisticsResponse; totalRecords: number }>;
    };
  }
}
