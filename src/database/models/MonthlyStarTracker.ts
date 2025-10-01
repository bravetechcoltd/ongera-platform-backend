import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("monthly_star_tracker")
export class MonthlyStarTracker {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  month: number; // 1-12

  @Column()
  year: number;

  @Column({ nullable: true })
  community_id: string; // NULL for all-platform stars

  // Statistics that determined the star
  @Column({ default: 0 })
  projects_count: number;

  @Column({ default: 0 })
  blogs_count: number;

  @Column({ default: 0 })
  events_count: number;

  @Column({ default: 0 })
  followers_count: number;

  @Column({ default: 0 })
  total_score: number;

  // Admin approval
  @Column({ default: false })
  admin_approved: boolean;

  @Column({ nullable: true })
  badge_image_url: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  rewards: string;

  @Column({ type: "timestamp", nullable: true })
  approved_at: Date;

  @CreateDateColumn()
  created_at: Date;
}