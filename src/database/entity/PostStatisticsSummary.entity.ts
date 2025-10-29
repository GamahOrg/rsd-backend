import { BaseEntity, ViewEntity, ViewColumn } from "typeorm";

@ViewEntity({ name: "postStatisticsSummary" })
export class PostStatisticsSummary extends BaseEntity {
  @ViewColumn()
  total_posts!: number;

  @ViewColumn()
  positive_posts!: number;

  @ViewColumn()
  negative_posts!: number;

  @ViewColumn()
  neutral_posts!: number;
}
