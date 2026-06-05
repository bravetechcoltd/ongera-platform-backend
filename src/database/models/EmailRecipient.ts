import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { EmailCampaign } from "./EmailCampaign";
import { User } from "./User";

export enum EmailRecipientStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

/**
 * One row per recipient of an EmailCampaign. Powers both the live "ticking"
 * progress view and the historic "who actually received this" breakdown.
 */
@Entity("email_recipients")
@Index(["campaign_id", "status"])
export class EmailRecipient {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  campaign_id: string;

  @ManyToOne(() => EmailCampaign, (c) => c.recipients, { onDelete: "CASCADE" })
  @JoinColumn({ name: "campaign_id" })
  campaign: EmailCampaign;

  // Nullable: a recipient can be a raw email address with no platform account.
  @Column({ type: "uuid", nullable: true })
  user_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "varchar", length: 255 })
  email: string;

  // Snapshot of the display name at send time (first + last, or username).
  @Column({ type: "varchar", length: 255, nullable: true })
  name: string;

  @Column({
    type: "enum",
    enum: EmailRecipientStatus,
    default: EmailRecipientStatus.PENDING,
  })
  status: EmailRecipientStatus;

  @Column({ type: "text", nullable: true })
  error: string;

  @Column({ type: "timestamp", nullable: true })
  sent_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
