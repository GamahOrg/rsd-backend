import fp from "fastify-plugin";
import { MapDataSource } from "../../../config/database";
import { TResponse, TBody } from "./schemas/GetLandParcelsShapes.schema";
import { withCache } from "../../../helper/cache";

export default fp(async (fastify) => {
  const getLandParcelsShapes = async (bounds: TBody["bounds"]) => {
    return withCache(
      fastify.redis,
      `rer_land_parcels:shapes:${JSON.stringify(bounds)}`,
      7200,
      async () => {
        const { minLng, minLat, maxLng, maxLat } = bounds;

        const query = MapDataSource.createQueryBuilder()
          .from("rsd.titles_land_parcels", "tlp")
          .select("tlp.realestate_number", "id")
          .addSelect("tlp.region_name_ar", "region")
          .addSelect("tlp.city_name_ar", "city")
          .addSelect("tlp.district_name_ar", "district")
          .addSelect("tlp.published_date", "published_date")
          .addSelect("tlp.property_type", "property_type")
          .addSelect("tlp.parcel_number", "parcel_number")
          .addSelect("tlp.block_number", "block_number")
          .addSelect("tlp.plan_number", "plan_number")
          .addSelect("tlp.area_size", "area_size")
          .addSelect("ST_AsGeoJSON(tlp.shape)::text", "shape")
          .where(
            "ST_Intersects(tlp.shape, ST_SetSRID(ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat), ST_SRID(tlp.shape)))",
            { minLng, minLat, maxLng, maxLat },
          );

        const data = await query.getRawMany();
        return { data: data as TResponse };
      },
    );
  };

  // Decorate the fastify instance with the generalService
  fastify.decorate("rerLandParcelsService", {
    getLandParcelsShapes,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    rerLandParcelsService: {
      getLandParcelsShapes: (bounds: TBody["bounds"]) => Promise<{ data: TResponse }>;
    };
  }
}
