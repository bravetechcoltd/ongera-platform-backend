import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Community } from "./Community";
import { ResearchProject } from "./ResearchProject";

// Define BlogStatus enum
export enum BlogStatus {
  DRAFT = "Draft",
  UNDER_REVIEW = "Under Review",
  PUBLISHED = "Published",
  ARCHIVED = "Archived"
}

@Entity("blog_posts")
@Index("idx_blog_status", ["status"])
@Index("idx_blog_category", ["category"])
@Index("idx_blog_published_at", ["published_at"])
@Index("idx_blog_author", ["author"])
@Index("idx_blog_community", ["community"])
export class BlogPost {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.blog_posts)
  @JoinColumn({ name: "author_id" })
  author: User;

  @ManyToOne(() => Community, { nullable: true })
  @JoinColumn({ name: "community_id" })
  community: Community;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "text" })
  excerpt: string;

  @Column({ nullable: true })
  cover_image_url: string;

  @Column({
    type: "enum",
    enum: BlogStatus,
    default: BlogStatus.DRAFT,
  })
  status: BlogStatus;

  @Column({ type: "timestamp", nullable: true })
  published_at: Date;

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: 0 })
  reading_time_minutes: number;

  @Column()
  category: string;

  @ManyToOne(() => ResearchProject, { nullable: true })
  @JoinColumn({ name: "linked_project_id" })
  linked_project: ResearchProject;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Helper method to check if blog is visible to public
  isPublic(): boolean {
    return this.status === BlogStatus.PUBLISHED;
  }

  // Helper method to check if blog is archived
  isArchived(): boolean {
    return this.status === BlogStatus.ARCHIVED;
  }

  // Helper method to check if blog can be published
  canPublish(): boolean {
    return [BlogStatus.DRAFT, BlogStatus.UNDER_REVIEW, BlogStatus.ARCHIVED].includes(this.status);
  }

  // Helper method to publish blog
  publish(): void {
    if (this.canPublish()) {
      this.status = BlogStatus.PUBLISHED;
      this.published_at = new Date();
    }
  }

  // Helper method to archive blog
  archive(): void {
    this.status = BlogStatus.ARCHIVED;
  }

  // Helper method to restore from archive
  restoreFromArchive(): void {
    if (this.status === BlogStatus.ARCHIVED) {
      this.status = BlogStatus.DRAFT;
    }
  }
}