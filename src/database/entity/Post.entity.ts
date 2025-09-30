import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User.entity";
import { Mentions } from "./Mentions.entity";
import { Attachment } from "./Attachment.entity";

@Entity({ name: "post" })
export class Post extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "bigint", nullable: true })
  conversation_id?: string;

  @Column({ type: "bigint", nullable: true })
  post_id?: string;

  @Column({ type: "bigint", nullable: true })
  user_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  username?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  name?: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  lang?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  sentiment?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  country?: string;

  @Column({ type: "bit", nullable: true })
  possibly_sensitive?: boolean;

  @Column({ type: "nvarchar", length: "max", nullable: true })
  text?: string;

  @Column({ type: "int", nullable: true })
  like_count?: number;

  @Column({ type: "int", nullable: true })
  reply_count?: number;

  @Column({ type: "int", nullable: true })
  retweet_count?: number;

  @Column({ type: "int", nullable: true })
  bookmark_count?: number;

  @Column({ type: "int", nullable: true })
  quote_count?: number;

  @Column({ type: "int", nullable: true })
  impression_count?: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  post_type?: string;

  @Column({ type: "bigint", nullable: true })
  referenced_tweet_id?: string;

  @Column({ type: "bigint", nullable: true })
  reply_to_user_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  reply_to_username?: string;

  @Column({ type: "datetime", nullable: true })
  posted_at?: Date;

  @CreateDateColumn()
  created_at?: Date;

  @ManyToOne(() => User, (user) => user.posts, { nullable: false })
  @JoinColumn({ name: "user_id", referencedColumnName: "user_id" })
  user!: User;

  @OneToMany(() => Mentions, (mention) => mention.post)
  mentions?: Mentions[];

  @OneToMany(() => Attachment, (attachment) => attachment.post)
  @JoinColumn({ name: "post_id", referencedColumnName: "post_id" })
  attachments?: Attachment[];
}
