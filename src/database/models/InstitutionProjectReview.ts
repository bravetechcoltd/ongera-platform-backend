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

export enum InstitutionReviewerRole {
  INDUSTRIAL_SUPERVISOR = "INDUSTRIAL_SUPERVISOR",
  INSTRUCTOR = "INSTRUCTOR",
  INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
}

export enum InstitutionReviewAction {
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REWORK_REQUESTED = "REWORK_REQUESTED",
  PUBLISHED_PRIVATE = "PUBLISHED_PRIVATE",
  PUBLISHED_PUBLIC = "PUBLISHED_PUBLIC",
}

export enum InstitutionReviewStage {
  SUPERVISOR_STAGE = "SUPERVISOR_STAGE",
  INSTRUCTOR_STAGE = "INSTRUCTOR_STAGE",
  INSTITUTION_STAGE = "INSTITUTION_STAGE",
}

@Entity("institution_project_reviews")
export class InstitutionProjectReview {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => InstitutionResearchProject, (p) => p.reviews, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project: InstitutionResearchProject;

  @ManyToOne(() => User)
  @JoinColumn({ name: "reviewer_id" })
  reviewer: User;

  @Column({
    type: "enum",
    enum: InstitutionReviewerRole,
  })
  reviewer_role: InstitutionReviewerRole;

  @Column({
    type: "enum",
    enum: InstitutionReviewAction,
  })
  action: InstitutionReviewAction;

  @Column({ type: "text", nullable: true })
  feedback: string;

  @CreateDateColumn()
  reviewed_at: Date;

  @Column({
    type: "enum",
    enum: InstitutionReviewStage,
  })
  stage: InstitutionReviewStage;

  @Column({ default: false })
  is_final: boolean;
}
