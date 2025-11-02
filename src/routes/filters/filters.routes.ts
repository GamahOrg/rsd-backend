import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getFiltersSchema, filtersSchemaType } from "./schemas/getFilters.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import { createFilterSchema, createFilterSchemaType } from "./schemas/createFilter.schema";
import { updateFilterSchema, updateFilterSchemaType } from "./schemas/updateFilter.schema";
import { getFilterSchema, getFilterSchemaType } from "./schemas/getFilter.schema";

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
      const filter = request.body;
      const { data } = await fastify.filterService.createOrUpdateFilter({
        id: undefined,
        ...filter,
      });
      return data;
    },
  });

  fastify.route<updateFilterSchemaType>({
    method: "PATCH",
    url: "/:id",
    schema: updateFilterSchema,
    handler: async (request) => {
      const { id } = request.params;
      const filter = request.body;
      const { data } = await fastify.filterService.createOrUpdateFilter({
        id: Number(id),
        ...filter,
      });
      return data;
    },
  });

  fastify.route<getFilterSchemaType>({
    method: "GET",
    url: "/:id",
    schema: getFilterSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.filterService.getFilter(Number(id));
      return data;
    },
  });
};

export default filter;
