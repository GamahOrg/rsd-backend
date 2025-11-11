import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "clause" })
export class Clause extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "nvarchar", nullable: false })
  name!: string;

  @Column({ type: "nvarchar", nullable: false })
  include_clause!: string;

  @Column({ type: "nvarchar", nullable: false })
  exclude_clause!: string;

  @Column({ type: "nvarchar", nullable: false, default: "AND" })
  operator!: "AND" | "OR";

  @Column({ type: "datetime", nullable: false })
  created_at?: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at?: Date;

  @Column({ type: "datetime", nullable: true })
  deleted_at?: Date;
}
