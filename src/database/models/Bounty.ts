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

export enum BountyStatus {
  OPEN = "OPEN", // accepting submissions
  CLOSED = "CLOSED", // deadline passed / poster stopped intake
  UNDER_REVIEW = "UNDER_REVIEW", // poster reviewing submissions
  AWARDED = "AWARDED", // winner picked, payout pending
  PAID = "PAID", // payout confirmed & released
  CANCELLED = "CANCELLED",
}

/**
 * Reverse-pitch post: a company (Institution account) publishes an industrial
 * challenge with a cash prize and a deadline. Excellence members compete to
 * submit the best solution.
 */
@Entity("bounties")
@Index(["status"])
export class Bounty {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  institution_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "institution_id" })
  institution: User;

  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "text" })
  problem_statement: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string;

  @Column({ type: "simple-array", nullable: true })
  required_skills: string[];

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  prize_amount: number;

  @Column({ type: "varchar", length: 8, default: "USD" })
  currency: string;

  // Platform commission cut (0.15 – 0.20). Captured at post time.
  @Column({ type: "decimal", precision: 4, scale: 2, default: 0.15 })
  commission_rate: number;

  @Column({ type: "timestamp" })
  deadline: Date;

  @Column({
    type: "enum",
    enum: BountyStatus,
    default: BountyStatus.OPEN,
  })
  status: BountyStatus;

  @Column({ type: "uuid", nullable: true })
  winner_submission_id: string;

  // Denormalised counter so list views avoid an extra COUNT round-trip.
  @Column({ default: 0 })
  submissions_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
