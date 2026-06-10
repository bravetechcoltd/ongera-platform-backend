import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { CommunityPost } from "./CommunityPost";

/**
 * A comment on a community post. Flat (non-threaded) — ordered by created_at.
 */
@Entity("community_post_comments")
export class CommunityPostComment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  post_id: string;

  @ManyToOne(() => CommunityPost, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: CommunityPost;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "author_id" })
  author: User;

  @Column({ type: "text" })
  content: string;

  @CreateDateColumn()
  created_at: Date;
}
