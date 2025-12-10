import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getFiltersSchema, filtersSchemaType } from "./schemas/getFilters.schema";
import { setPaginationHeaders } from "../../../../helper/setPaginationHeaders";
import {
  createOrUpdateFilterSchema,
  createOrUpdateFilterSchemaType,
  TBody as TCreateOrUpdateFilterBody,
} from "./schemas/createOrUpdateFilter.schema";
import { getFilterSchema, getFilterSchemaType } from "./schemas/getFilter.schema";
import { deleteFilterSchema, deleteFilterSchemaType } from "./schemas/deleteFilterSchema.schema";
import { TSavedFilterType } from "../../../../helper/common";

const filter: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all filters
  fastify.route<filtersSchemaType>({
    method: "GET",
    url: "/",
    schema: getFiltersSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { type, search } = request.query as { type: TSavedFilterType; search?: string };
      const { data, totalRecords } = await fastify.filterService.getAllFilters(
        type,
        skip,
        take,
        search,
      );
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to create or update a filter
  fastify.route<createOrUpdateFilterSchemaType>({
    method: "POST",
    url: "/",
    schema: createOrUpdateFilterSchema,
    handler: async (request) => {
      const filter = request.body as TCreateOrUpdateFilterBody;
      const { data } = await fastify.filterService.createOrUpdateFilter({
        id: filter.id ? Number(filter.id) : undefined,
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

  // api to delete a filter
  fastify.route<deleteFilterSchemaType>({
    method: "DELETE",
    url: "/:id",
    schema: deleteFilterSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.filterService.deleteFilter(Number(id));
      return data;
    },
  });
};

export default filter;
