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
import { Bounty } from "./Bounty";
import { BountySubmission } from "./BountySubmission";

export enum PayoutStatus {
  PENDING = "PENDING", // winner picked, awaiting admin confirmation
  CONFIRMED = "CONFIRMED", // admin confirmed the split
  RELEASED = "RELEASED", // funds released to winner
}

/**
 * Money record for a bounty award. Captures the platform commission cut
 * (15–20%) and the net amount owed to the winning member.
 */
@Entity("bounty_payouts")
@Index(["status"])
export class BountyPayout {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  bounty_id: string;

  @ManyToOne(() => Bounty, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bounty_id" })
  bounty: Bounty;

  @Column({ type: "uuid", nullable: true })
  submission_id: string;

  @ManyToOne(() => BountySubmission, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "submission_id" })
  submission: BountySubmission;

  @Column("uuid")
  @Index()
  winner_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "winner_id" })
  winner: User;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  gross_amount: number;

  @Column({ type: "decimal", precision: 4, scale: 2, default: 0.15 })
  commission_rate: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  commission_amount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  net_to_winner: number;

  @Column({ type: "varchar", length: 8, default: "USD" })
  currency: string;

  @Column({
    type: "enum",
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus;

  @Column({ type: "uuid", nullable: true })
  confirmed_by_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "confirmed_by_id" })
  confirmed_by: User;

  @Column({ type: "timestamp", nullable: true })
  released_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
