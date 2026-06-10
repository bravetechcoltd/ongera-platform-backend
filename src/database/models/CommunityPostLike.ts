import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";
import { User } from "./User";
import { CommunityPost } from "./CommunityPost";

/**
 * A user's "like" on a community post. One row per (post, user) — the unique
 * constraint makes liking idempotent and lets us toggle by deleting the row.
 */
@Entity("community_post_likes")
@Unique(["post_id", "user_id"])
export class CommunityPostLike {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  post_id: string;

  @ManyToOne(() => CommunityPost, { onDelete: "CASCADE" })
  @JoinColumn({ name: "post_id" })
  post: CommunityPost;

  @Column("uuid")
  @Index()
  user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @CreateDateColumn()
  created_at: Date;
}
