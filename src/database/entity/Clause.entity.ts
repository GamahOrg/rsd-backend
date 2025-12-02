import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from "typeorm";

@Entity({ name: "x_clause", schema: "social_media" })
export class XClause extends BaseEntity {
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

  @Column({ type: "nvarchar", nullable: true })
  include_accounts_clause?: string;

  @Column({ type: "nvarchar", nullable: true })
  exclude_accounts_clause?: string;

  @Column({ type: "nvarchar", nullable: true })
  include_to_accounts_clause?: string;

  @Column({ type: "nvarchar", nullable: true })
  exclude_to_accounts_clause?: string;

  @Column({ type: "bigint", nullable: true })
  total_posts?: bigint;

  @Column({ type: "bigint", nullable: true })
  total_impressions?: bigint;

  @Column({ type: "bigint", nullable: true })
  positive_posts?: bigint;

  @Column({ type: "bigint", nullable: true })
  negative_posts?: bigint;

  @Column({ type: "bigint", nullable: true })
  neutral_posts?: bigint;

  @Column({ type: "datetime", nullable: true })
  statistics_updated_at?: Date;

  @Column({ type: "datetime", nullable: false })
  created_at?: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at?: Date;

  @DeleteDateColumn({ type: "datetime", nullable: true })
  deleted_at?: Date;
}
