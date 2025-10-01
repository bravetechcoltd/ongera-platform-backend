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
import { ProjectFile } from "./ProjectFile";
import { ProjectTag } from "./ProjectTag";
import { User } from "./User";
import { CommunityPost } from "./CommunityPost";
import { Event } from "./Event";
import { Community } from "./Community";
import { Like } from "./Like";
import { Comment } from "./Comment";
import { CollaborationRequest } from "./CollaborationRequest";
import { ProjectContribution } from "./ProjectContribution";
export enum ProjectApprovalStatus {
  DRAFT = "Draft",
  PENDING_REVIEW = "Pending Review",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  RETURNED = "Returned",
}


export enum AcademicLevel {
  UNDERGRADUATE = "Undergraduate",
  MASTERS = "Masters",
  PHD = "PhD",
  RESEARCHER = "Researcher",
  DIASPORA = "Diaspora",
  INSTITUTION = "Institution",
}

export enum ProjectStatus {
  DRAFT = "Draft",
  PUBLISHED = "Published",
  UNDER_REVIEW = "Under Review",
  ARCHIVED = "Archived",
}

export enum ResearchType {
  THESIS = "Thesis",
  PAPER = "Paper",
  PROJECT = "Project",
  DATASET = "Dataset",
  CASE_STUDY = "Case Study",
}

export enum Visibility {
  PUBLIC = "Public",
  COMMUNITY_ONLY = "Community-Only",
  PRIVATE = "Private",
}

export enum CollaborationStatus {
  SOLO = "Solo",
  SEEKING_COLLABORATORS = "Seeking Collaborators",
  COLLABORATIVE = "Collaborative",
}

// ==================== NEW: Collaboration Info Status Enum ====================
export enum CollaborationInfoStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
}

// ==================== NEW: Collaboration Info Interface ====================
export interface CollaborationInfo {
  user_id: string;
  user_email: string;
  user_name: string;
  status: CollaborationInfoStatus;
  requested_at: Date;
  updated_at: Date;
  reason?: string;
  expertise?: string;
  rejection_reason?: string;
}

@Entity("research_projects")
export class ResearchProject {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn({ name: "author_id" })
  author: User;

  @Column()
  title: string;

  @Column({ type: "text" })
  abstract: string;

  @Column({ type: "text", nullable: true })
  full_description: string;

  @Column({
    type: "enum",
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;
  @Column({
    type: "enum",
    enum: ProjectApprovalStatus,
    default: ProjectApprovalStatus.DRAFT,
  })
  approval_status: ProjectApprovalStatus;

  @Column({ default: false })
  requires_approval: boolean;
  
    @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb",
    nullable: false
  })
  status_change_history: {
    from_status: ProjectStatus;
    to_status: ProjectStatus;
    changed_by: string; 
    changed_at: Date;
    reason?: string;
    notes?: string;
  }[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "assigned_instructor_id" })
  assigned_instructor: User;
  @Column({
    type: "enum",
    enum: ResearchType,
  })
  research_type: ResearchType;

  @Column({ nullable: true })
  project_file_url: string;

  @Column({ nullable: true })
  cover_image_url: string;

  @Column({ type: "date", nullable: true })
  publication_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ default: false })
  is_featured: boolean;

  @Column({
    type: "enum",
    enum: Visibility,
    default: Visibility.PUBLIC,
  })
  visibility: Visibility;

  @Column({ nullable: true })
  field_of_study: string;

  @Column({ nullable: true })
  doi: string;

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: 0 })
  download_count: number;

  @Column({ default: 0 })
  like_count: number;

  @Column({ default: 0 })
  comment_count: number;

  @Column({
    type: "enum",
    enum: CollaborationStatus,
    default: CollaborationStatus.SOLO,
  })
  collaboration_status: CollaborationStatus;

  // ==================== COLLABORATION COLUMNS ====================

  @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb",
    nullable: false
  })
  approved_collaborators: {
    user_id: string;
    approved_at: Date;
  }[];

  @Column({
    default: 0,
    nullable: false
  })
  collaborator_count: number;

  // ==================== NEW: COLLABORATION INFO COLUMN ====================
  /**
   * Tracks all collaboration requests and their status changes
   * This provides a complete history of: pending requests, approved collaborators, and rejected requests
   */
  @Column({
    type: "jsonb",
    default: () => "'[]'::jsonb",
    nullable: false
  })
  collaboration_info: CollaborationInfo[];

  // ==================== RELATIONS ====================

  @OneToMany(() => ProjectFile, (file) => file.project)
  files: ProjectFile[];
  @Column({
    type: "enum",
    enum: AcademicLevel,
    nullable: true,
  })
  academic_level: AcademicLevel;
  @ManyToMany(() => ProjectTag, (tag) => tag.projects)
  @JoinTable({
    name: "project_tag_association",
    joinColumn: { name: "project_id" },
    inverseJoinColumn: { name: "tag_id" },
  })
  tags: ProjectTag[];

  @OneToMany(() => CommunityPost, (post) => post.linked_project)
  community_posts: CommunityPost[];

  @ManyToOne(() => Community, (community) => community.projects, { nullable: true })
  @JoinColumn({ name: "community_id" })
  community: Community;

  @ManyToMany(() => Event, (event) => event.linked_projects)
  events: Event[];

  @OneToMany(() => Like, (like) => like.content_id)
  likes: Like[];

  @OneToMany(() => Comment, (comment) => comment.content_id)
  comments: Comment[];

  @OneToMany(() => CollaborationRequest, (request) => request.project)
  collaboration_requests: CollaborationRequest[];

  @OneToMany(() => ProjectContribution, (contribution) => contribution.project)
  contributions: ProjectContribution[];
}