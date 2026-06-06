import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { AssessmentParticipant } from "./AssessmentParticipant";

/** A deliverable file attached to an assessment participant's submission. */
@Entity("assessment_submission_files")
export class AssessmentSubmissionFile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  participant_id: string;

  @ManyToOne(() => AssessmentParticipant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "participant_id" })
  participant: AssessmentParticipant;

  @Column({ type: "varchar", length: 500 })
  file_url: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  original_name: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  mime_type: string;

  @Column({ type: "bigint", nullable: true })
  size: number;

  @Column({ type: "uuid", nullable: true })
  uploaded_by_id: string;

  @CreateDateColumn()
  created_at: Date;
}
