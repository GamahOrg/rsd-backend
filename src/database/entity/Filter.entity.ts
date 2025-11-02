import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "filter" })
export class Filter extends BaseEntity {
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
}
