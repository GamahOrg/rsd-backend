import fp from "fastify-plugin";
import i18next from "i18next";

export default fp(async (fastify) => {
  fastify.addHook("preHandler", async (request) => {
    // set i18next language
    i18next.changeLanguage(request.headers["accept-language"]);
  });
});
