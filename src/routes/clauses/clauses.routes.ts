import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { getClausesSchema, clausesSchemaType } from "./schemas/getClauses.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";
import { getClauseSchema, getClauseSchemaType } from "./schemas/getClause.schema";
import {
  getClausesDropdownSchema,
  getClausesDropdownSchemaType,
} from "./schemas/getClausesDropdown.schema";
import {
  createOrUpdateSchema,
  createOrUpdateSchemaType,
  TBody as TCreateOrUpdateBody,
} from "./schemas/createOrUpdate.schema";
import { deleteSchema, deleteSchemaType } from "./schemas/deleteSchema.schema";
import {
  canPerformActionSchema,
  canPerformActionSchemaType,
} from "./schemas/canPerformAction.schema";
import {
  getClauseStatisticsSchema,
  getClauseStatisticsSchemaType,
} from "./schemas/getClauseStatistics.schema";

const clause: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  // api to get all clauses

  fastify.route<clausesSchemaType>({
    method: "GET",
    url: "/",
    schema: getClausesSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      // const { search } = request.query as { search?: string };
      const { data, totalRecords } = await fastify.clauseService.getAllClauses(skip, take);
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to get all clauses for dropdown
  fastify.route<getClausesDropdownSchemaType>({
    method: "GET",
    url: "/dropdown",
    schema: getClausesDropdownSchema,
    handler: async (request, response) => {
      const { skip, take } = request.pagination!;
      const { search } = request.query as { search?: string };
      const { data, totalRecords } = await fastify.clauseService.getAllClausesDropdown(
        skip,
        take,
        search,
      );
      setPaginationHeaders(response, totalRecords, take);
      return data;
    },
  });

  // api to create or update a clause
  fastify.route<createOrUpdateSchemaType>({
    method: "POST",
    url: "/",
    schema: createOrUpdateSchema,
    handler: async (request) => {
      const clause = request.body as TCreateOrUpdateBody;
      const { data } = await fastify.clauseService.createOrUpdateClause({
        ...clause,
        id: clause.id ? Number(clause.id) : undefined,
        operator: clause.operator as "AND" | "OR",
      });
      return data;
    },
  });

  fastify.route<getClauseSchemaType>({
    method: "GET",
    url: "/:id",
    schema: getClauseSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.clauseService.getClause(Number(id));
      return data;
    },
  });

  fastify.route<getClauseStatisticsSchemaType>({
    method: "POST",
    url: "/:id/update/statistics",
    schema: getClauseStatisticsSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.clauseService.updateClauseStatistics(Number(id));
      return data;
    },
  });

  fastify.route<getClauseStatisticsSchemaType>({
    method: "GET",
    url: "/:id/statistics",
    schema: getClauseStatisticsSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.clauseService.getClauseStatistics(Number(id));
      return data;
    },
  });

  fastify.route<canPerformActionSchemaType>({
    method: "GET",
    url: "/canPerformAction/:id",
    schema: canPerformActionSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.clauseService.canMakeAction(Number(id));
      return data;
    },
  });

  fastify.route<deleteSchemaType>({
    method: "DELETE",
    url: "/:id",
    schema: deleteSchema,
    handler: async (request) => {
      const { id } = request.params;
      const { data } = await fastify.clauseService.deleteClause(Number(id));
      return data;
    },
  });
};

export default clause;
