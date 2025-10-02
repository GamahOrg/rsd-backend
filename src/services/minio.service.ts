import fp from "fastify-plugin";

export default fp(async (fastify) => {
  const { minio, httpErrors } = fastify;


  const getFilePresignedUrl = async (path: string) => {
    const expirationInSeconds = parseInt(process.env.MINIO_URL_EXPIRATION || "600", 10);
    try {
      let presignedUrl = await new Promise((resolve: any, reject: any) => {
        minio.presignedGetObject(
          process.env.MINIO_BUCKET_NAME || "x-data",
          path.replace(process.env.MINIO_BUCKET_NAME || "x-data", ""),
          expirationInSeconds,
          (err: any, presignedUrl: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(presignedUrl);
            }
          },
        );
      });

      return presignedUrl;
    } catch (error) {
      console.error("Error getting file presigned url:", error);
      throw httpErrors.internalServerError("upload.errors.getFileFailed");
    }
  };
  // Decorate the fastify instance with the minioService
  fastify.decorate("minioService", {
    getFilePresignedUrl,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    minioService: {
      getFilePresignedUrl: (path: string) => Promise<any>;
    };
  }
}
