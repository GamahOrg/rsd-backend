import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  OneToMany,
} from "typeorm";
import { XFilterShare } from "./FilterShare.entity";

export type FilterVisibility = "private" | "public" | "shared";

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

  @Column({ type: "varchar", length: 36, nullable: true })
  created_by?: string; // References better-auth user.id

  @Column({ type: "varchar", length: 20, default: "private" })
  visibility!: FilterVisibility; // 'private' | 'public' | 'shared'

  @Column({ type: "datetime", nullable: false })
  created_at?: Date;

  @Column({ type: "datetime", nullable: true })
  updated_at?: Date;

  @DeleteDateColumn({ type: "datetime", nullable: true })
  deleted_at!: Date;

  @OneToMany(() => XFilterShare, (filterShare) => filterShare.filter)
  shares?: XFilterShare[];
}
