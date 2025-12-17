import fp from "fastify-plugin";
const i18next = require("i18next");
const i18nextMiddleware = require("i18next-http-middleware");
const Backend = require("i18next-fs-backend");
const path = require("path");

export default fp(
  async (fastify) => {
    await i18next
      .use(Backend)
      .use(i18nextMiddleware.LanguageDetector)
      .init({
        // debug: true,
        backend: {
          loadPath: path.join(__dirname, "../locales/{{lng}}/{{ns}}.json"),
          // loadPath: "src/locales/{{lng}}/{{ns}}.json",
        },
        lookupHeader: "accept-language",
        fallbackLng: "ar",
        preload: ["en", "ar"],
        saveMissing: true,
        interpolation: {
          escapeValue: false,
        },
      });
    fastify.register(i18nextMiddleware.plugin, { i18next });

    // to access t function in fastify instance
    fastify.decorate("t", i18next.t);
  },
  {
    name: "i18next",
  },
);

declare module "fastify" {
  export interface FastifyInstance {
    t: typeof i18next.t;
  }
}
