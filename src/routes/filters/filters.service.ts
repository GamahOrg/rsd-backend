import fp from "fastify-plugin";
import { AppDataSource } from "../../config/database";
import { Filter } from "../../database/entity/Filter.entity";
import { TFilter } from "../../models/types/comment.type";
import { TResponse as GetAllFiltersResponse } from "./schemas/getFilters.schema";
import { TResponse as GetFilterResponse } from "./schemas/getFilter.schema";

export default fp(async (fastify) => {
  const getAllFilters = async (type: string, skip: number, take: number) => {
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
        },
      });
      if (!existingFilter) {
        throw fastify.httpErrors.notFound(`Filter with id ${filter.id} not found`);
      }
      if (existingFilter.name !== filter.name || existingFilter.type !== filter.type) {
        throw fastify.httpErrors.badRequest("Name and type cannot be changed");
      }
      // Update existing filter
      existingFilter.filter = JSON.stringify(filter.filter);
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

  // Decorate the fastify instance with the postService
  fastify.decorate("filterService", {
    getAllFilters,
    createOrUpdateFilter,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    filterService: {
      getAllFilters: (
        type: string,
        skip: number,
        take: number,
      ) => Promise<{ data: GetAllFiltersResponse; totalRecords: number }>;
      createOrUpdateFilter: (filter: {
        id: number | undefined;
        name: string;
        type: string;
        filter: TFilter;
      }) => Promise<{ data: GetFilterResponse }>;
    };
  }
}
