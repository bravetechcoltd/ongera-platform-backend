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

export enum AssessmentStatus {
  DRAFT = "DRAFT",         // being prepared, not visible to talent
  PUBLISHED = "PUBLISHED", // invitations sent, talent can start/submit
  CLOSED = "CLOSED",       // window closed, no new starts/submits
  ARCHIVED = "ARCHIVED",
}

/**
 * An official, invite-only, timed selection challenge an institution prepares
 * for its selected Excellence talent. Unlike a public Bounty, this drives a
 * formal selection process that can end in a talent offer.
 */
@Entity("talent_assessments")
@Index(["status"])
export class TalentAssessment {
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

  // The challenge / research prompt the talent must work on.
  @Column({ type: "text" })
  brief: string;

  @Column({ type: "text", nullable: true })
  instructions: string;

  @Column({ type: "simple-array", nullable: true })
  required_skills: string[];

  // Per-attempt time limit in minutes (countdown starts when a talent starts).
  // 0 means "no per-attempt timer" — only the closes_at window applies.
  @Column({ type: "int", default: 60 })
  duration_minutes: number;

  // Optional window during which talent may start/submit.
  @Column({ type: "timestamp", nullable: true })
  opens_at: Date;

  @Column({ type: "timestamp", nullable: true })
  closes_at: Date;

  @Column({ type: "int", default: 100 })
  max_score: number;

  @Column({ default: true })
  allow_files: boolean;

  @Column({
    type: "enum",
    enum: AssessmentStatus,
    default: AssessmentStatus.DRAFT,
  })
  status: AssessmentStatus;

  @Column({ default: 0 })
  invited_count: number;

  @Column({ default: 0 })
  submitted_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
