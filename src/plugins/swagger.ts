import swagger from "@fastify/swagger";
import swaggerUi, { FastifySwaggerUiOptions } from "@fastify/swagger-ui";
import fp from "fastify-plugin";
export default fp<FastifySwaggerUiOptions>(
  async (fastify) => {
    fastify.register(swagger, {
      openapi: {
        info: {
          title: "RSD API",
          description: "api documentation for rsd",
          version: "1.0.0",
        },
      },
    });

    fastify.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: false,
      },
      uiHooks: {
        onRequest: function (request, reply, next) {
          next();
        },

        preHandler: function (request, reply, next) {
          next();
        },
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,

      transformSpecification: (swaggerObject) => {
        return swaggerObject;
      },
      transformSpecificationClone: true,
    });
  },
  {
    name: "swagger",
  },
);
