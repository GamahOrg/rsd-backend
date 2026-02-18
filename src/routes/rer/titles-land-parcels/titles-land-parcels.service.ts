import fp from "fastify-plugin";
import { MapDataSource } from "../../../config/database";
import { TResponse, TBody } from "./schemas/GetLandParcelsShapes.schema";

export default fp(async (fastify) => {
  const getLandParcelsShapes = async (bounds: TBody["bounds"]) => {
    const { minLng, minLat, maxLng, maxLat } = bounds;

    const query = MapDataSource.createQueryBuilder()
      .from("rsd.titles_land_parcels", "tlp")
      .select("tlp.realestate_number", "id")
      .addSelect("tlp.regionnamear", "region")
      .addSelect("tlp.citynamear", "city")
      .addSelect("tlp.districtnamear", "district")
      .addSelect("tlp.publisheddate", "published_date")
      .addSelect("tlp.propertytype", "property_type")
      .addSelect("tlp.parcelnumber", "parcel_number")
      .addSelect("tlp.blocknumber", "block_number")
      .addSelect("tlp.plannumber", "plan_number")
      .addSelect("tlp.areasize", "area_size")
      .addSelect("ST_AsGeoJSON(tlp.shape)::text", "shape")
      .where(
        "ST_Intersects(tlp.shape, ST_SetSRID(ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat), ST_SRID(tlp.shape)))",
        { minLng, minLat, maxLng, maxLat },
      );

    const data = await query.getRawMany();

    return { data: data as TResponse };
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
