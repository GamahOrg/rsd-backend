import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "clause" })
export class Clause extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "nvarchar", nullable: false })
  name!: string;

  @Column({ type: "nvarchar", nullable: false })
  clause!: string;

  @Column({ type: "datetime", nullable: false })
  created_at?: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at?: Date;

  @Column({ type: "datetime", nullable: true })
  deleted_at?: Date;
}
