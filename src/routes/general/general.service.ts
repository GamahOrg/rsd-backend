import fp from "fastify-plugin";

export default fp(async (fastify) => {
  const updateCityTextSize = (style: unknown): unknown => {
    const styleObject = style as { layers?: Array<Record<string, unknown>> } | null;
    if (!styleObject?.layers) {
      return style;
    }

    const citySourceLayers = new Set(["CityCentroidP", "EmirateCapital"]);
    styleObject.layers = styleObject.layers.map((layer) => {
      const layerId = layer?.id;
      const sourceLayer = layer?.["source-layer"];
      const layout = layer?.layout;

      const isCityLabel =
        typeof layerId === "string" &&
        typeof sourceLayer === "string" &&
        layerId.includes("/label/") &&
        citySourceLayers.has(sourceLayer);
      const isDistrictLabel =
        typeof layerId === "string" &&
        layerId.includes("Districts/") &&
        layerId.includes("/label/");

      if (
        typeof layerId !== "string" ||
        typeof sourceLayer !== "string" ||
        !layout ||
        typeof layout !== "object" ||
        (!isCityLabel && !isDistrictLabel)
      ) {
        return layer;
      }

      const layoutUpdate: Record<string, unknown> = {
        ...(layout as Record<string, unknown>),
        "text-size": isDistrictLabel ? 20 : 22,
      };

      return {
        ...layer,
        layout: layoutUpdate,
      };
    });

    return styleObject;
  };

  const getMapStyle = async () => {
    const cached = await fastify.redis.get("momrah_map_style:root.json");
    if (cached) {
      return { rawJson: cached };
    }
    const response = await fetch(
      process.env.INTEGRATION_PROXY_URL + "/shared-services/get-map-style?map_type=rei",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    const data = await response.json();

    if (response.ok) {
      const updatedStyle = updateCityTextSize(data);
      const updatedJson = JSON.stringify(updatedStyle);
      await fastify.redis.setex("momrah_map_style:root.json", 3600, updatedJson);
      return { rawJson: updatedJson };
    } else {
      throw new Error("Failed to get map style: " + (data.message ?? data.error ?? ""));
    }
  };

  // Decorate the fastify instance with the generalService

  fastify.decorate("generalRsdService", {
    getMapStyle,
  });
});

declare module "fastify" {
  interface FastifyInstance {
    generalRsdService: {
      getMapStyle: () => Promise<{ rawJson: string }>;
    };
  }
}
