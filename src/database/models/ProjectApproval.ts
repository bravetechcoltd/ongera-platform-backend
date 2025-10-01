import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ResearchProject } from "./ResearchProject";
import { User } from "./User";

export enum ApprovalStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  RETURNED = "Returned",
}

@Entity("project_approvals")
export class ProjectApproval {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => ResearchProject)
  @JoinColumn({ name: "project_id" })
  project: ResearchProject;

  @ManyToOne(() => User)
  @JoinColumn({ name: "instructor_id" })
  instructor: User;

  @Column({
    type: "enum",
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ type: "text", nullable: true })
  feedback: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "timestamp", nullable: true })
  reviewed_at: Date;
}
