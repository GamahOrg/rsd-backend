import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getKeywordsListSchema, getKeywordsListSchemaType } from "./schemas/getKeywords.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";

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
};

export default keyword;
