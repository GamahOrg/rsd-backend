import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Post } from "./Post.entity";
import { Mentions } from "./Mentions.entity";

@Entity({ name: "user" })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "bigint", nullable: true })
  user_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  username?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  name?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  description?: string;

  @Column({ type: "varchar", nullable: true })
  profile_image_url?: string;

  @Column({ type: "int", nullable: true })
  followers_count?: number;

  @Column({ type: "int", nullable: true })
  following_count?: number;

  @Column({ type: "int", nullable: true })
  tweet_count?: number;

  @Column({ type: "int", nullable: true })
  listed_count?: number;

  @Column({ type: "int", nullable: true })
  like_count?: number;

  @Column({ type: "int", nullable: true })
  media_count?: number;

  @Column({ type: "bit", nullable: true })
  is_verified?: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  verified_type?: string;

  @Column({ type: "bigint", nullable: true })
  pinned_tweet_id?: string;

  @CreateDateColumn()
  created_at?: Date;

  @UpdateDateColumn()
  updated_at?: Date;

  @Column({ type: "datetime", nullable: true })
  user_created_at?: Date;

  @OneToMany(() => Post, (post) => post.user)
  posts?: Post[];

  @OneToMany(() => Mentions, (mention) => mention.user)
  mentions?: Mentions[];
}
