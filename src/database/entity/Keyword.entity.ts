import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "keyword_post_counts" })
export class Keyword extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ type: "nvarchar", length: 400 })
  keyword!: string;

  @Column({ type: "bigint" })
  post_count!: number;

  @Column({ type: "datetime2" })
  last_refreshed!: Date;

  @Column({ type: "bigint" })
  positive_post_count!: number;

  @Column({ type: "bigint" })
  negative_post_count!: number;

  @Column({ type: "bigint" })
  neutral_post_count!: number;

  @Column({ type: "bigint" })
  total_impression!: number;
}
