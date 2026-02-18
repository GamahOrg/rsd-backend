import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { XFilter } from "./Filter.entity";

@Entity({ name: "x_filter_share", schema: "social_media" })
export class XFilterShare extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "bigint", nullable: false })
  filter_id!: number;

  @Column({ type: "varchar", length: 36, nullable: false })
  user_id!: string; // References better-auth user.id

  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;

  @DeleteDateColumn({ type: "datetime", nullable: true })
  deleted_at?: Date;

  @ManyToOne(() => XFilter, (filter) => filter.shares)
  @JoinColumn({ name: "filter_id" })
  filter!: XFilter;
}
