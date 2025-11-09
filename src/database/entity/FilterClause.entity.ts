import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "filter_clause" })
export class FilterClause extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", nullable: false })
  filter_id!: number;

  @Column({ type: "bigint", nullable: false })
  clause_id!: number;
}
