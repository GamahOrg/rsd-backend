import fp from "fastify-plugin";
import { IsNull, Like } from "typeorm";
import { AppDataSource } from "../../config/database";
import { Filter } from "../../database/entity/Filter.entity";
import { TFilter } from "../../models/types/comment.type";
import { TResponse as GetAllFiltersResponse } from "./schemas/getFilters.schema";
import { TResponse as GetFilterResponse } from "./schemas/getFilter.schema";
import { TResponse as DeleteFilterResponse } from "./schemas/deleteFilterSchema.schema";
import { TSavedFilterType } from "../../helper/common";

export default fp(async (fastify) => {
  const getAllFilters = async (
    type: TSavedFilterType,
    skip: number,
    take: number,
    search?: string | undefined,
  ) => {
    const filterRepo = AppDataSource.getRepository(Filter);
    const qb = filterRepo.createQueryBuilder("filter").setFindOptions({
      select: {
        id: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
      where: {
        type,
        ...(search ? { name: Like(`%${search}%`) } : {}),
        deleted_at: IsNull(),
      },
      skip,
      take,
      order: { created_at: "asc" },
    });
    const [data, totalRecords] = await qb.getManyAndCount();

    return { data: data as unknown as GetAllFiltersResponse, totalRecords };
  };

  const createOrUpdateFilter = async (filter: {
    id: number | undefined;
    name: string;
    type: string;
    filter: TFilter;
  }) => {
    const filterRepo = AppDataSource.getRepository(Filter);

    let data;
    if (filter.id) {
      const existingFilter = await filterRepo.findOne({
        where: {
          id: filter.id,
          deleted_at: IsNull(),
        },
      });

      if (!existingFilter) {
        throw fastify.httpErrors.notFound(`Filter with id ${filter.id} not found`);
      }
      if (existingFilter.type !== filter.type) {
        throw fastify.httpErrors.badRequest("Type cannot be changed");
      }

      // check if the filter name already exists with the same type
      if (existingFilter.name !== filter.name) {
        const existingFilterWithSameName = await filterRepo.findOne({
          where: {
            name: filter.name,
            type: filter.type,
            deleted_at: IsNull(),
          },
        });
        if (existingFilterWithSameName) {
          throw fastify.httpErrors.badRequest("Filter name already exists with the same type");
        }
      }

      // Update existing filter
      existingFilter.filter = JSON.stringify(filter.filter);
      existingFilter.updated_at = new Date();
      existingFilter.name = filter.name;
      data = await filterRepo.save(existingFilter);
    } else {
      // Create new filter
      data = await filterRepo.save({
        name: filter.name,
        type: filter.type,
        filter: JSON.stringify(filter.filter),
      });
    }

    return {
      data: { ...data, filter: JSON.parse(data.filter) as TFilter } as unknown as GetFilterResponse,
    };
  };

  const getFilter = async (id: number) => {
    const filterRepo = AppDataSource.getRepository(Filter);
    const data = await filterRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!data) {
      throw fastify.httpErrors.notFound(`Filter with id ${id} not found`);
    }
    return {
      data: { ...data, filter: JSON.parse(data.filter) as TFilter } as unknown as GetFilterResponse,
    };
  };

  const deleteFilter = async (id: number) => {
    const filterRepo = AppDataSource.getRepository(Filter);
    const existingFilter = await filterRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!existingFilter) {
      throw fastify.httpErrors.notFound(`Filter with id ${id} not found`);
    }
    existingFilter.deleted_at = new Date();
    await filterRepo.save(existingFilter);
    return {
      data: {
        success: true,
        message: `Filter with id ${id} deleted successfully`,
      } as unknown as DeleteFilterResponse,
    };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("filterService", {
    getAllFilters,
    createOrUpdateFilter,
    getFilter,
    deleteFilter,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    filterService: {
      getAllFilters: (
        type: TSavedFilterType,
        skip: number,
        take: number,
        search?: string | undefined,
      ) => Promise<{ data: GetAllFiltersResponse; totalRecords: number }>;
      createOrUpdateFilter: (filter: {
        id: number | undefined;
        name: string;
        type: TSavedFilterType;
        filter: TFilter;
      }) => Promise<{ data: GetFilterResponse }>;
      getFilter: (id: number) => Promise<{ data: GetFilterResponse }>;
      deleteFilter: (id: number) => Promise<{ data: DeleteFilterResponse }>;
    };
  }
}
