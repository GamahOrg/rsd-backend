import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "countries_lookup" })
export class Country extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "nvarchar", nullable: false })
  arabic_name?: string;

  @Column({ type: "nvarchar", nullable: false })
  english_name?: string;
}
