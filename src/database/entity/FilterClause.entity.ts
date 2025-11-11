import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "x_filter_clauses", schema: "social_media" })
export class XFilterClause extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: number;

  @Column({ type: "bigint", nullable: false })
  filter_id!: number;

  @Column({ type: "bigint", nullable: false })
  clause_id!: number;
}
