import { Static, Type } from "@sinclair/typebox";

export const IFilter = Type.Object({
  filter: Type.Object({
    duration: Type.Object({
      from: Type.Object({ date: Type.String({ format: "date" }) }),
      to: Type.Object({ date: Type.String({ format: "date" }) }),
      type: Type.String({ enum: ["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"] }),
    }),
    region: Type.Optional(Type.Array(Type.String())),
    city: Type.Optional(Type.Array(Type.String())),
    district: Type.Optional(Type.Array(Type.String())),
    propertyType: Type.Optional(Type.String()),
  }),
});
export type TFilter = Static<typeof IFilter>;
