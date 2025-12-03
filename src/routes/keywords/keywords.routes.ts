import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getKeywordsListSchema, getKeywordsListSchemaType } from "./schemas/getKeywords.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import {
  getKeywordsStatisticsSchema,
  getKeywordsStatisticsSchemaType,
} from "./schemas/getKeywordsStatistics.schema";

const keyword: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get keywords list
  fastify.route<getKeywordsListSchemaType>({
    method: "GET",
    url: "/",
    schema: getKeywordsListSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { search } = request.query as { search: string };
      const { data, totalRecords } = await fastify.keywordService.getKeywordsByKeyword(
        search,
        skip,
        take,
      );
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to get keywords list
  fastify.route<getKeywordsStatisticsSchemaType>({
    method: "GET",
    url: "/posts/statistics",
    schema: getKeywordsStatisticsSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { search, field, direction } = request.query as {
        search: string;
        field: string;
        direction: "asc" | "desc";
      };
      const order_by = { field: field || "post_count", direction: direction || "desc" };
      const { data, totalRecords } = await fastify.keywordService.getKeywordsStatistics(
        search,
        skip,
        take,
        order_by,
      );
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });
};

export default keyword;
