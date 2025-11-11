import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "filter_clauses" })
export class FilterClause extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: number;

  @Column({ type: "bigint", nullable: false })
  filter_id!: number;

  @Column({ type: "bigint", nullable: false })
  clause_id!: number;
}
