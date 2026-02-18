import { Static, Type } from "@sinclair/typebox";
export const DropdownList = Type.Array(
  Type.Object({
    value: Type.String(),
    label: Type.String(),
  }),
);
export type DropdownList = Static<typeof DropdownList>;
