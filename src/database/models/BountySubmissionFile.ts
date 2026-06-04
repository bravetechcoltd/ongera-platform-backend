import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { BountySubmission } from "./BountySubmission";

/**
 * A deliverable file attached to a bounty submission.
 */
@Entity("bounty_submission_files")
export class BountySubmissionFile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  submission_id: string;

  @ManyToOne(() => BountySubmission, { onDelete: "CASCADE" })
  @JoinColumn({ name: "submission_id" })
  submission: BountySubmission;

  @Column({ type: "varchar", length: 1000 })
  file_url: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  original_name: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  mime_type: string;

  @Column({ type: "int", nullable: true })
  size: number;

  @Column({ type: "uuid", nullable: true })
  uploaded_by_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "uploaded_by_id" })
  uploaded_by: User;

  @CreateDateColumn()
  created_at: Date;
}
