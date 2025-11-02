import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getFiltersSchema, filtersSchemaType } from "./schemas/getFilters.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import { createFilterSchema, createFilterSchemaType } from "./schemas/createFilter.schema";

const filter: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all filters
  fastify.route<filtersSchemaType>({
    method: "GET",
    url: "/",
    schema: getFiltersSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { type } = request.query;
      const { data, totalRecords } = await fastify.filterService.getAllFilters(type, skip, take);
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to store a filter
  fastify.route<createFilterSchemaType>({
    method: "POST",
    url: "/",
    schema: createFilterSchema,
    handler: async (request) => {
      const { name, type, filter } = request.body;
      const { data } = await fastify.filterService.createFilter(name, type, filter);
      return data;
    },
  });
};

export default filter;
