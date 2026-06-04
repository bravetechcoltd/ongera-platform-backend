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

export enum SubmissionStatus {
  SUBMITTED = "SUBMITTED",
  SHORTLISTED = "SHORTLISTED",
  WINNER = "WINNER",
  NOT_SELECTED = "NOT_SELECTED",
}

/**
 * An Excellence member's (optionally small-team) entry against a bounty.
 */
@Entity("bounty_submissions")
@Index(["bounty_id", "status"])
export class BountySubmission {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  bounty_id: string;

  @ManyToOne(() => Bounty, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bounty_id" })
  bounty: Bounty;

  @Column("uuid")
  @Index()
  submitter_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "submitter_id" })
  submitter: User;

  // Optional collaborators (user-ids) — small teams are allowed.
  @Column({ type: "simple-array", nullable: true })
  team_member_ids: string[];

  @Column({ type: "text" })
  summary: string;

  @Column({
    type: "enum",
    enum: SubmissionStatus,
    default: SubmissionStatus.SUBMITTED,
  })
  status: SubmissionStatus;

  @Column({ type: "int", nullable: true })
  score: number;

  @Column({ type: "text", nullable: true })
  feedback: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
