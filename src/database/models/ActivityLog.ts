// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { ContentType } from "./Like";
import { Community } from "./Community";
export enum ActionType {
  VIEW = "View",
  DOWNLOAD = "Download",
  SEARCH = "Search",
  SHARE = "Share",
  REGISTER = "Register",
}

@Entity("activity_logs")
export class ActivityLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "enum",
    enum: ActionType,
  })
  action_type: ActionType;

  @Column({
    type: "enum",
    enum: ContentType,
    nullable: true,
  })
  content_type: ContentType;

  @Column({ type: "uuid", nullable: true })
  content_id: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ type: "text", nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;
}
