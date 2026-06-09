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
import { TalentAssessment } from "./TalentAssessment";

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE", // one correct option (auto-graded)
  TRUE_FALSE = "TRUE_FALSE",           // true/false (auto-graded)
  CHECKBOXES = "CHECKBOXES",           // multiple correct options (auto-graded, set-equality)
  SHORT_ANSWER = "SHORT_ANSWER",       // free text (manual grading)
  ESSAY = "ESSAY",                     // long free text (manual grading)
}

/** Objective question types are auto-gradable by the system. */
export const OBJECTIVE_TYPES = [
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.TRUE_FALSE,
  QuestionType.CHECKBOXES,
];

export const isObjectiveType = (t: QuestionType) => OBJECTIVE_TYPES.includes(t);

/**
 * A single question inside a TalentAssessment. Objective questions
 * (MCQ / true-false / checkboxes) carry a correct_answer and are auto-graded;
 * subjective questions (short answer / essay) are graded manually.
 */
@Entity("assessment_questions")
@Index(["assessment_id"])
export class AssessmentQuestion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  assessment_id: string;

  @ManyToOne(() => TalentAssessment, { onDelete: "CASCADE" })
  @JoinColumn({ name: "assessment_id" })
  assessment: TalentAssessment;

  @Column({ type: "int", default: 0 })
  order_index: number;

  @Column({ type: "enum", enum: QuestionType, default: QuestionType.MULTIPLE_CHOICE })
  type: QuestionType;

  @Column({ type: "text" })
  prompt: string;

  // For MCQ / checkboxes — the selectable options.
  @Column({ type: "simple-array", nullable: true })
  options: string[];

  // Objective questions: the correct option (or comma-joined options for checkboxes,
  // "true"/"false" for true-false). Null for subjective questions.
  @Column({ type: "text", nullable: true })
  correct_answer: string;

  @Column({ type: "int", default: 1 })
  points: number;

  // Optional explanation shown to talent in the review after grading.
  @Column({ type: "text", nullable: true })
  explanation: string;

  // Cached at save time: true for objective types, false for subjective.
  @Column({ default: true })
  is_auto_gradable: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
