// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { InstitutionResearchProject } from "./InstitutionResearchProject";
import { User } from "./User";

export enum InstitutionActivityType {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  SUBMITTED = "SUBMITTED",
  FILE_UPLOADED = "FILE_UPLOADED",
  FILE_REPLACED = "FILE_REPLACED",
  COMMENT_ADDED = "COMMENT_ADDED",
  COMMENT_RESOLVED = "COMMENT_RESOLVED",
  SUPERVISOR_APPROVED = "SUPERVISOR_APPROVED",
  SUPERVISOR_REWORK = "SUPERVISOR_REWORK",
  SUPERVISOR_REJECTED = "SUPERVISOR_REJECTED",
  INSTRUCTOR_APPROVED = "INSTRUCTOR_APPROVED",
  INSTRUCTOR_REWORK = "INSTRUCTOR_REWORK",
  INSTRUCTOR_REJECTED = "INSTRUCTOR_REJECTED",
  REWORK_SUBMITTED = "REWORK_SUBMITTED",
  PUBLISHED_PRIVATE = "PUBLISHED_PRIVATE",
  PUBLISHED_PUBLIC = "PUBLISHED_PUBLIC",
  ADMIN_REJECTED = "ADMIN_REJECTED",
  SUPERVISOR_ASSIGNED = "SUPERVISOR_ASSIGNED",
  INSTRUCTOR_ASSIGNED = "INSTRUCTOR_ASSIGNED",
  STUDENT_ASSIGNED = "STUDENT_ASSIGNED",
}

@Entity("institution_project_activities")
export class InstitutionProjectActivity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => InstitutionResearchProject, (p) => p.activities, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project: InstitutionResearchProject;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "actor_id" })
  actor: User;

  @Column({
    type: "enum",
    enum: InstitutionActivityType,
  })
  action_type: InstitutionActivityType;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;
}
