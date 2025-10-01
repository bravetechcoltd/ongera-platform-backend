// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { User } from "./User";
import { InstitutionProjectFile } from "./InstitutionProjectFile";
import { InstitutionProjectReview } from "./InstitutionProjectReview";
import { InstitutionProjectComment } from "./InstitutionProjectComment";
import { InstitutionProjectActivity } from "./InstitutionProjectActivity";

export enum InstitutionProjectType {
  BACHELORS = "BACHELORS",
  MASTERS_THESIS = "MASTERS_THESIS",
  DISSERTATION = "DISSERTATION",
  FUNDS = "FUNDS",
}

export enum AcademicSemester {
  FIRST = "FIRST",
  SECOND = "SECOND",
  THIRD = "THIRD",
}

export enum InstitutionProjectStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  UNDER_SUPERVISOR_REVIEW = "UNDER_SUPERVISOR_REVIEW",
  REWORK_REQUESTED = "REWORK_REQUESTED",
  UNDER_INSTRUCTOR_REVIEW = "UNDER_INSTRUCTOR_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  PUBLISHED = "PUBLISHED",
}

export enum InstitutionPublishVisibility {
  INSTITUTION_ONLY = "INSTITUTION_ONLY",
  PUBLIC = "PUBLIC",
}

@Entity("institution_research_projects")
export class InstitutionResearchProject {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column({ type: "text" })
  abstract: string;

  @Column({ type: "text", nullable: true })
  full_description: string;

  @Column({
    type: "enum",
    enum: InstitutionProjectType,
  })
  project_type: InstitutionProjectType;

  @Column({ nullable: true })
  academic_year: string;

  @Column({
    type: "enum",
    enum: AcademicSemester,
    nullable: true,
  })
  semester: AcademicSemester;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "institution_id" })
  institution: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  cover_image_url: string;

  @Column({ nullable: true })
  project_file_url: string;

  @Column({
    type: "enum",
    enum: InstitutionProjectStatus,
    default: InstitutionProjectStatus.DRAFT,
  })
  status: InstitutionProjectStatus;

  @Column({
    type: "enum",
    enum: InstitutionPublishVisibility,
    nullable: true,
  })
  visibility_after_publish: InstitutionPublishVisibility;

  @Column({ type: "text", nullable: true })
  rejection_reason: string;

  @Column({ type: "text", nullable: true })
  rework_reason: string;

  @Column({ default: false })
  is_multi_student: boolean;

  @Column({ default: 1 })
  max_students: number;

  @Column({ nullable: true })
  field_of_study: string;

  @Column({ type: "simple-array", nullable: true })
  keywords: string[];

  @Column({ nullable: true })
  doi: string;

  @Column({ type: "date", nullable: true })
  publication_date: Date;

  @Column({ type: "timestamp", nullable: true })
  submission_date: Date;

  @Column({ type: "timestamp", nullable: true })
  final_approval_date: Date;

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: 0 })
  download_count: number;

  @Column({ default: false })
  requires_rework: boolean;

  @Column({ default: 0 })
  rework_count: number;

  @ManyToMany(() => User)
  @JoinTable({
    name: "institution_project_students",
    joinColumn: { name: "project_id" },
    inverseJoinColumn: { name: "student_id" },
  })
  students: User[];

  @ManyToMany(() => User)
  @JoinTable({
    name: "institution_project_instructors",
    joinColumn: { name: "project_id" },
    inverseJoinColumn: { name: "instructor_id" },
  })
  instructors: User[];

  @ManyToMany(() => User)
  @JoinTable({
    name: "institution_project_supervisors",
    joinColumn: { name: "project_id" },
    inverseJoinColumn: { name: "supervisor_id" },
  })
  industrial_supervisors: User[];

  @OneToMany(() => InstitutionProjectFile, (file) => file.project)
  files: InstitutionProjectFile[];

  @OneToMany(() => InstitutionProjectReview, (review) => review.project)
  reviews: InstitutionProjectReview[];

  @OneToMany(() => InstitutionProjectComment, (comment) => comment.project)
  comments: InstitutionProjectComment[];

  @OneToMany(() => InstitutionProjectActivity, (activity) => activity.project)
  activities: InstitutionProjectActivity[];
}
