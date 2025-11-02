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

  const createFilter = async (name: string, type: string, filter: TFilter) => {
    const filterRepo = AppDataSource.getRepository(Filter);
    const data = await filterRepo.save({ name, type, filter: JSON.stringify(filter) });
    return {
      data: { ...data, filter: JSON.parse(data.filter) as TFilter } as unknown as GetFilterResponse,
    };
  };

  // Decorate the fastify instance with the postService
  fastify.decorate("filterService", {
    getAllFilters,
    createFilter,
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
      createFilter: (
        name: string,
        type: string,
        filter: TFilter,
      ) => Promise<{ data: GetFilterResponse }>;
    };
  }
}
