import fp from "fastify-plugin";
import { TResponse as GetKeywordsResponse } from "./schemas/getKeywords.schema";
import { AppDataSource } from "../../config/database";
import { Keyword } from "../../database/entity/Keyword.entity";

export default fp(async (fastify) => {
  const getKeywordsByKeyword = async (keyword: string, skip: number, take: number) => {
    const keywordRepo = AppDataSource.getRepository(Keyword);

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

  // Decorate the fastify instance with the keywordService
  fastify.decorate("keywordService", {
    getKeywordsByKeyword,
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
    };
  }
}
