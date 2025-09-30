import {FastifyPluginAsyncTypebox} from "@fastify/type-provider-typebox";
import {getPostsSchema, postsSchemaType} from "./schemas/getPosts.schema";
import { setPaginationHeaders } from "../../helper/setPaginationHeaders";


const post:  FastifyPluginAsyncTypebox = async (fastify):Promise<void> => {
    // api to get all users
    fastify.route<postsSchemaType>({
        method: 'GET',
        url: '/',
        schema: getPostsSchema,
        handler: async (request, response) => {
            const { skip, take } = request.pagination!;
            const { filter } = request.query;
            const { data, totalRecords } = await fastify.postService.getAllPosts(skip, take, filter);
            setPaginationHeaders(response, totalRecords, take);
            return data;
          },
    });
}

export default post;
