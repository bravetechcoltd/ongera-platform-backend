import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { ProjectStatus, ResearchProject } from "./ResearchProject";
import { User } from "./User";
import { Community } from "./Community";

@Entity("blog_posts")
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
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;

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
}