import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { ResearchProject } from "./ResearchProject";

// Collaboration Request Status
export enum CollaborationRequestStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
}

/**
 * CollaborationRequest Entity
 * Manages requests from users wanting to contribute to research projects
 */
@Entity("collaboration_requests")
export class CollaborationRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => ResearchProject, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project: ResearchProject;

  @ManyToOne(() => User)
  @JoinColumn({ name: "requester_id" })
  requester: User;

  @Column({ type: "text" })
  reason: string;

  @Column({ type: "text", nullable: true })
  expertise: string;

  @Column({
    type: "enum",
    enum: CollaborationRequestStatus,
    default: CollaborationRequestStatus.PENDING,
  })
  status: CollaborationRequestStatus;

  @Column({ type: "text", nullable: true })
  rejection_reason: string;

  @CreateDateColumn()
  requested_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "timestamp", nullable: true })
  responded_at: Date;
}
