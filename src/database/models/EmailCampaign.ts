import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from "typeorm";
import { User } from "./User";
import { EmailRecipient } from "./EmailRecipient";

export enum EmailCampaignStatus {
  PENDING = "PENDING",
  SENDING = "SENDING",
  COMPLETED = "COMPLETED",
  PARTIAL = "PARTIAL", // finished, but some recipients failed
  FAILED = "FAILED",   // nothing went out
}

/**
 * A single bulk-email send. One row per "Email Users" action so admins can later
 * review history: what was sent, to which audience, and which users received it
 * (the per-recipient breakdown lives in EmailRecipient).
 */
@Entity("email_campaigns")
@Index(["status"])
export class EmailCampaign {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  subject: string;

  @Column({ type: "text" })
  body: string;

  // Human-readable audience summary, e.g. "All active users", "Students, Researchers",
  // or "12 selected users". Shown in the history list.
  @Column({ type: "varchar", length: 255, nullable: true })
  audience_label: string;

  // Raw selection echoed back for resend/audit.
  @Column({ type: "simple-array", nullable: true })
  account_types: string[];

  @Column({ default: false })
  sent_to_all: boolean;

  @Column({
    type: "enum",
    enum: EmailCampaignStatus,
    default: EmailCampaignStatus.PENDING,
  })
  status: EmailCampaignStatus;

  @Column({ type: "int", default: 0 })
  total_recipients: number;

  @Column({ type: "int", default: 0 })
  sent_count: number;

  @Column({ type: "int", default: 0 })
  failed_count: number;

  // The admin who triggered the send.
  @Column({ type: "uuid", nullable: true })
  created_by_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "created_by_id" })
  created_by: User;

  @Column({ type: "timestamp", nullable: true })
  started_at: Date;

  @Column({ type: "timestamp", nullable: true })
  completed_at: Date;

  @OneToMany(() => EmailRecipient, (r) => r.campaign)
  recipients: EmailRecipient[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
