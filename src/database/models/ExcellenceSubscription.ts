import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

export enum SubscriptionPlan {
  NEGOTIATION = "NEGOTIATION",
  ONLINE = "ONLINE",
}

export enum SubscriptionStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REJECTED = "REJECTED",
}

/**
 * A company's (Institution account) right to access the Excellence talent pool
 * and post bounties. For now access is granted via negotiation (admin flips it
 * ACTIVE); the ONLINE plan slot is reserved for a future payment integration.
 */
@Entity("excellence_subscriptions")
@Index(["status"])
export class ExcellenceSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  institution_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "institution_id" })
  institution: User;

  @Column({
    type: "enum",
    enum: SubscriptionPlan,
    default: SubscriptionPlan.NEGOTIATION,
  })
  plan: SubscriptionPlan;

  @Column({
    type: "enum",
    enum: SubscriptionStatus,
    default: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  // What the company wrote when requesting access.
  @Column({ type: "text", nullable: true })
  contact_message: string;

  // Admin's internal note / negotiation outcome.
  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "timestamp", nullable: true })
  starts_at: Date;

  @Column({ type: "timestamp", nullable: true })
  ends_at: Date;

  @Column({ type: "uuid", nullable: true })
  approved_by_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "approved_by_id" })
  approved_by: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
