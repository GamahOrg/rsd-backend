// import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
// import { getRequestChartSchema, getRequestChartSchemaType } from "./schemas/getRequestChart.schema";
// import { TBody } from "./schemas/getRequestChart.schema";

// const rerRequests: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
//   // api to get request chart
//   fastify.route<getRequestChartSchemaType>({
//     method: "POST",
//     url: "/request-chart",
//     schema: getRequestChartSchema,
//     handler: async (request) => {
//       const { filter } = request.body as TBody;
//       const { data } = await fastify.rerRequestsService.getRequestChart({ filter });
//       return data;
//     },
//   });
// };

// export default rerRequests;
