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

  @OneToMany(() => ProjectFile, (file) => file.project)
  files: ProjectFile[];

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

  // Virtual relation for likes (filtered from Like entity)
  @OneToMany(() => Like, (like) => like.content_id)
  likes: Like[];

  // Virtual relation for comments (filtered from Comment entity)
  @OneToMany(() => Comment, (comment) => comment.content_id)
  comments: Comment[];
}