// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { InstitutionResearchProject } from "./InstitutionResearchProject";
import { User } from "./User";

export enum InstitutionCommentType {
  GENERAL = "GENERAL",
  METHODOLOGY = "METHODOLOGY",
  LITERATURE = "LITERATURE",
  RESULTS = "RESULTS",
  FORMATTING = "FORMATTING",
  CITATION = "CITATION",
}

export enum InstitutionCommentPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

@Entity("institution_project_comments")
export class InstitutionProjectComment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => InstitutionResearchProject, (p) => p.comments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project: InstitutionResearchProject;

  @ManyToOne(() => User)
  @JoinColumn({ name: "author_id" })
  author: User;

  @Column({ type: "text" })
  content: string;

  @Column({
    type: "enum",
    enum: InstitutionCommentType,
    default: InstitutionCommentType.GENERAL,
  })
  comment_type: InstitutionCommentType;

  @Column({ nullable: true })
  page_reference: string;

  @Column({
    type: "enum",
    enum: InstitutionCommentPriority,
    default: InstitutionCommentPriority.MEDIUM,
  })
  priority: InstitutionCommentPriority;

  @Column({ default: false })
  is_resolved: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "resolved_by_id" })
  resolved_by: User;

  @Column({ type: "timestamp", nullable: true })
  resolved_at: Date;

  @Column({ type: "uuid", nullable: true })
  parent_comment_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
