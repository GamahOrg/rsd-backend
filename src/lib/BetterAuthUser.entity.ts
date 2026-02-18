import {
  BaseEntity,
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Entity representing the better-auth user table.
 * This is stored in the USERS_DB database (separate from social media data).
 */
@Entity({ name: "user" })
export class BetterAuthUser extends BaseEntity {
  @PrimaryColumn({ type: "varchar", length: 36 })
  id!: string;

  @Column({ type: "nvarchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "smallint" })
  emailVerified!: number;

  @Column({ type: "varchar", length: 8000, nullable: true })
  image?: string;

  @Column({ type: "varchar", length: 255, nullable: true, unique: true })
  nationalId?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  firstName?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  fatherName?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  grandName?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  familyName?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  fullName?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  gender?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  nationality?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  language?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  idIssueDate?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  idExpiryDate?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  birthDateG?: string;

  @Column({ type: "nvarchar", length: 255, nullable: true })
  birthDateH?: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status!: "active" | "inactive" | "pending";

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
