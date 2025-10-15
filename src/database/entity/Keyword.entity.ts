import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "sensika_predef_keywords" })
export class Keyword extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "nvarchar", length: 255 })
  keyword!: string;
}
