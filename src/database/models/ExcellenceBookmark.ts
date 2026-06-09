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
import { Bounty } from "./Bounty";

/**
 * A talent's saved/bookmarked bounty. Server-backed replacement for the old
 * localStorage-only "saved bounties" list, so saves persist across devices.
 * One row per (user, bounty).
 */
@Entity("excellence_bookmarks")
@Unique(["user_id", "bounty_id"])
export class ExcellenceBookmark {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column("uuid")
  @Index()
  bounty_id: string;

  @ManyToOne(() => Bounty, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bounty_id" })
  bounty: Bounty;

  @CreateDateColumn()
  created_at: Date;
}
