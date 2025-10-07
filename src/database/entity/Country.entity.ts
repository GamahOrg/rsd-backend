import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Post } from "./Post.entity";

@Entity({ name: "countries_lookup" })
export class Country extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "nvarchar", nullable: false })
  arabic_name?: string;

  @Column({ type: "nvarchar", nullable: false })
  english_name?: string;

  @OneToMany(() => Post, (post) => post.country)
  posts?: Post[];
}
