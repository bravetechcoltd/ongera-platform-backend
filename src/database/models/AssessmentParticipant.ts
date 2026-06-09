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
import { TalentAssessment } from "./TalentAssessment";

export enum ParticipantStatus {
  INVITED = "INVITED",         // invited, not started
  IN_PROGRESS = "IN_PROGRESS", // timer running
  SUBMITTED = "SUBMITTED",     // work submitted (manual or auto)
  GRADED = "GRADED",           // institution graded it
  OFFERED = "OFFERED",         // institution extended an offer
  ACCEPTED = "ACCEPTED",       // talent accepted the offer
  DECLINED = "DECLINED",       // talent declined the offer
  REJECTED = "REJECTED",       // institution rejected the talent
  EXPIRED = "EXPIRED",         // window closed before they started
}

/**
 * One selected talent's participation in a TalentAssessment. Combines the
 * invitation, the timed attempt, the submission, the grade, and the final
 * offer decision in a single row (1 talent : 1 assessment).
 */
@Entity("assessment_participants")
@Index(["assessment_id", "status"])
@Index(["talent_user_id"])
export class AssessmentParticipant {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  assessment_id: string;

  @ManyToOne(() => TalentAssessment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "assessment_id" })
  assessment: TalentAssessment;

  @Column("uuid")
  talent_user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "talent_user_id" })
  talent: User;

  @Column({
    type: "enum",
    enum: ParticipantStatus,
    default: ParticipantStatus.INVITED,
  })
  status: ParticipantStatus;

  @Column({ type: "timestamp", nullable: true })
  started_at: Date;

  // Auto-submit deadline = started_at + duration (capped at assessment.closes_at).
  @Column({ type: "timestamp", nullable: true })
  due_at: Date;

  @Column({ type: "timestamp", nullable: true })
  submitted_at: Date;

  @Column({ default: false })
  auto_submitted: boolean;

  // The talent's work — autosaved during the attempt, finalised on submit.
  @Column({ type: "text", nullable: true })
  response_text: string;

  // Final total score (auto_score + manual_score) once fully graded.
  @Column({ type: "int", nullable: true })
  score: number;

  // Points earned from auto-graded objective questions.
  @Column({ type: "int", nullable: true })
  auto_score: number;

  // Points earned from manually graded subjective questions.
  @Column({ type: "int", nullable: true })
  manual_score: number;

  // True while subjective answers still await institution grading.
  @Column({ default: false })
  pending_manual: boolean;

  @Column({ type: "int", nullable: true })
  max_score: number;

  @Column({ type: "text", nullable: true })
  feedback: string;

  @Column({ type: "timestamp", nullable: true })
  graded_at: Date;

  @Column({ type: "uuid", nullable: true })
  graded_by_id: string;

  @Column({ type: "text", nullable: true })
  offer_message: string;

  @Column({ type: "timestamp", nullable: true })
  offered_at: Date;

  @Column({ type: "timestamp", nullable: true })
  decision_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
