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
import { AssessmentParticipant } from "./AssessmentParticipant";
import { AssessmentQuestion } from "./AssessmentQuestion";

/**
 * A talent's answer to a single AssessmentQuestion. Autosaved during the
 * attempt, finalised on submit. Objective answers are auto-graded immediately
 * (is_correct + points_earned + is_graded=true); subjective answers stay
 * is_graded=false until an institution reviewer grades them.
 */
@Entity("assessment_answers")
@Index(["participant_id"])
@Index(["question_id"])
export class AssessmentAnswer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  participant_id: string;

  @ManyToOne(() => AssessmentParticipant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "participant_id" })
  participant: AssessmentParticipant;

  @Column("uuid")
  question_id: string;

  @ManyToOne(() => AssessmentQuestion, { onDelete: "CASCADE" })
  @JoinColumn({ name: "question_id" })
  question: AssessmentQuestion;

  // The talent's response — a single option, "true"/"false", comma-joined
  // options for checkboxes, or free text for short-answer/essay.
  @Column({ type: "text", nullable: true })
  answer: string;

  // Null until graded. For objective questions this is set automatically.
  @Column({ type: "boolean", nullable: true })
  is_correct: boolean;

  @Column({ type: "int", nullable: true })
  points_earned: number;

  @Column({ default: false })
  is_graded: boolean;

  @Column({ type: "text", nullable: true })
  instructor_feedback: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
