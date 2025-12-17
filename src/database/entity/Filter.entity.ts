import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from "typeorm";

@Entity({ name: "x_filter", schema: "social_media" })
export class XFilter extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "nvarchar", nullable: false })
  name!: string;

  @Column({ type: "varchar", nullable: false })
  type!: string;

  @Column({ type: "nvarchar", nullable: false })
  filter!: string;

  @Column({ type: "datetime", nullable: false })
  created_at?: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at?: Date;

  @DeleteDateColumn({ type: "datetime", nullable: true })
  deleted_at!: Date;
}
