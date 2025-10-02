import { FastifyReply } from "fastify";

export const setPaginationHeaders = async (response: FastifyReply, totalRecords: number, take: number) => {
  const totalPages = Math.ceil(totalRecords / take);
  response.header("x-total-count", totalRecords);
  response.header("x-total-pages", totalPages);
};
