import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity({ name: "inquiry_log" })
export class InquiryLog extends BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: number;

  @Column({ type: "nvarchar", length: "MAX" })
  request_body!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  user_id?: string;

  @Column({ type: "varchar", length: 50, default: "rsd" })
  platform!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  service?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  environment?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip_address?: string;

  @Column({ type: "nvarchar", length: 500, nullable: true })
  user_agent?: string;

  @Column({ type: "datetime", default: () => "GETDATE()" })
  created_at!: Date;
}
