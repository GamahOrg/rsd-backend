import fp from "fastify-plugin";

export default fp(async (fastify) => {
  fastify.addHook("preHandler", async (request) => {
    // Extract pagination parameters from query
    const { page = 1, pageSize = 5 } = request.query as { page?: number; pageSize?: number };
    
    // Calculate skip value
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(String(pageSize), 10))); // Limit max page size to 100
    const skip = (pageNum - 1) * pageSizeNum;

    // Add pagination to request object
    request.pagination = {
      skip,
      take: pageSizeNum,
    };
  });
});
