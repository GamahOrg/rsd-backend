import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import * as Minio from "minio";

declare module "fastify" {
  interface FastifyInstance {
    minio: Minio.Client;
  }
}

const minioPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || "localhost",
    port: parseInt(process.env.MINIO_PORT || "") || 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY || "",
    secretKey: process.env.MINIO_SECRET_KEY || "",
  });

  // Make minio Client available through the fastify instance: fastify.minio
  fastify.decorate("minio", minioClient);

  try {
    const bucket = process.env.MINIO_BUCKET_NAME || "";
    const exists = await minioClient.bucketExists(bucket);
    if (exists) {
      fastify.log.info(`Bucket ${bucket} exists.`);
    } else {
      await minioClient.makeBucket(bucket, "us-east-1");
      fastify.log.info(`Bucket ${bucket} created in "us-east-1"`);
    }
    fastify.log.info("Minio is up");
  } catch (error: any) {
    fastify.log.error("Minio is not connected", error);
  }
});

export default minioPlugin;
