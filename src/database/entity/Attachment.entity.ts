import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Post } from "./Post.entity";

@Entity({ name: "attachment" })
export class Attachment extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "bigint", nullable: true })
  post_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  media_id?: string;

  @Column({ type: "varchar", nullable: true })
  preview_image_url?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  type?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  source?: string;

  @Column({ type: "int", nullable: true })
  view_count?: number;

  @Column({ type: "varchar", nullable: true })
  url?: string;

  @CreateDateColumn()
  created_at?: Date;

  @ManyToOne(() => Post, (post) => post.id)
  @JoinColumn({ name: "post_id", referencedColumnName: "post_id" })
  post?: Post;
}
