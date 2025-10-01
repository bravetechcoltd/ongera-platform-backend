import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Community } from "./Community";
import { User } from "./User";
import { ResearchProject } from "./ResearchProject";
import { Event } from "./Event";  // ✅ FIXED

export enum PostType {
  DISCUSSION = "Discussion",
  QUESTION = "Question",
  RESOURCE = "Resource",
  ANNOUNCEMENT = "Announcement",
  LINKED_PROJECT = "LinkedProject",
}

@Entity("community_posts")
export class CommunityPost {
  @PrimaryGeneratedColumn("uuid")
  id: string;

@ManyToOne(() => Community, (community) => community.posts, {
  onDelete: "CASCADE" 
})
@JoinColumn({ name: "community_id" })
community: Community;

  @ManyToOne(() => User, (user) => user.community_posts)
  @JoinColumn({ name: "author_id" })
  author: User;

  @Column({
    type: "enum",
    enum: PostType,
  })
  post_type: PostType;

  @Column({ nullable: true })
  title: string;

  @Column({ type: "text" })
  content: string;

  @ManyToOne(() => ResearchProject, { nullable: true })
  @JoinColumn({ name: "linked_project_id" })
  linked_project: ResearchProject;

  @ManyToOne(() => Event, { nullable: true })   // ✅ Now valid
  @JoinColumn({ name: "linked_event_id" })
  linked_event: Event;

  @Column({ type: "jsonb", nullable: true })
  media_urls: string[];

  @Column({ default: false })
  is_pinned: boolean;

  @Column({ default: false })
  is_locked: boolean;

  @Column({ default: 0 })
  view_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
