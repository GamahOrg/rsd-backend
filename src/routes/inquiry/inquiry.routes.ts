import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  getOwnerInfoSchema,
  getOwnerInfoSchemaType,
  TBody as TOwnerBody,
} from "./schemas/getOwnerInfo.schema";
import {
  getMojPropertiesSchema,
  getMojPropertiesSchemaType,
  TBody as TMojBody,
} from "./schemas/getMojProperties.schema";
import {
  getRerPropertiesSchema,
  getRerPropertiesSchemaType,
  TBody as TRerBody,
} from "./schemas/getRerProperties.schema";
import { auth } from "../../lib/auth";
import { FastifyRequest } from "fastify";

async function getUserId(request: FastifyRequest): Promise<string | null> {
  const headersList = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (value) headersList.append(key, Array.isArray(value) ? value[0] : value);
  });
  const session = await auth.api.getSession({
    query: { disableCookieCache: true },
    headers: headersList,
  });
  return session?.user?.id ?? null;
}

const ID_RANGES: Record<number, { min: number; max: number; label: string } | null> = {
  1: {
    min: 1_000_000_000,
    max: 1_999_999_999,
    label: "National ID must be 10 digits and start with 1",
  },
  2: { min: 2_000_000_000, max: 2_999_999_999, label: "Iqama must be 10 digits and start with 2" },
  3: null,
  4: null,
  5: {
    min: 7_000_000_000,
    max: 7_999_999_999,
    label: "GOV Company CR number must be 10 digits and start with 7",
  },
};

function validateId(idType: number, idValue: number): string | null {
  const range = ID_RANGES[idType];
  if (range && (idValue < range.min || idValue > range.max)) {
    return range.label;
  }
  return null;
}

const inquiry: FastifyPluginAsyncTypebox = async (fastify): Promise<void> => {
  fastify.route<getOwnerInfoSchemaType>({
    method: "POST",
    url: "/properties/owner",
    schema: getOwnerInfoSchema,
    handler: async (request, reply) => {
      const { id_type, id_value } = request.body as TOwnerBody;

      const validationError = validateId(id_type, id_value);
      if (validationError) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: validationError,
        });
      }

      const userId = await getUserId(request);
      const ipAddress =
        (request.headers["x-forwarded-for"] as string) ||
        (request.headers["x-real-ip"] as string) ||
        request.ip;
      const userAgent = (request.headers["user-agent"] as string) || null;

      fastify.inquiryService.logInquiry({
        userId,
        requestBody: request.body,
        service: "owner-info",
        ipAddress,
        userAgent,
      });

      const data = await fastify.inquiryService.getOwnerInfo(id_value);
      return data;
    },
  });

  fastify.route<getMojPropertiesSchemaType>({
    method: "POST",
    url: "/properties/moj",
    schema: getMojPropertiesSchema,
    handler: async (request, reply) => {
      const { id_type, id_value } = request.body as TMojBody;
      const validationError = validateId(id_type, id_value);
      if (validationError) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: validationError,
        });
      }

      const userId = await getUserId(request);
      const ipAddress =
        (request.headers["x-forwarded-for"] as string) ||
        (request.headers["x-real-ip"] as string) ||
        request.ip;
      const userAgent = (request.headers["user-agent"] as string) || null;

      fastify.inquiryService.logInquiry({
        userId,
        requestBody: request.body,
        service: "properties-moj",
        ipAddress,
        userAgent,
      });

      const data = await fastify.inquiryService.getMojPropertiesByOwner(id_type, id_value);
      return data;
    },
  });

  fastify.route<getRerPropertiesSchemaType>({
    method: "POST",
    url: "/properties/rer",
    schema: getRerPropertiesSchema,
    handler: async (request, reply) => {
      const { id_type, id_value, page, page_size } = request.body as TRerBody;

      const validationError = validateId(id_type, id_value);
      if (validationError) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: validationError,
        });
      }

      const userId = await getUserId(request);
      const ipAddress =
        (request.headers["x-forwarded-for"] as string) ||
        (request.headers["x-real-ip"] as string) ||
        request.ip;
      const userAgent = (request.headers["user-agent"] as string) || null;

      fastify.inquiryService.logInquiry({
        userId,
        requestBody: request.body,
        service: "properties-rer",
        ipAddress,
        userAgent,
      });

      const data = await fastify.inquiryService.getRerPropertiesByOwner(id_value, page, page_size);
      return data;
    },
  });
};

export default inquiry;
