// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { ContentType } from "./Like";
import { Community } from "./Community";

export enum NotificationType {
  LIKE = "Like",
  COMMENT = "Comment",
  FOLLOW = "Follow",
  EVENT_REMINDER = "EventReminder",
  NEW_POST = "NewPost",
  PROJECT_FEATURED = "ProjectFeatured",
  COMMUNITY_INVITE = "CommunityInvite",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "recipient_id" })
  recipient: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "actor_id" })
  actor: User;

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  notification_type: NotificationType;

  @Column({
    type: "enum",
    enum: ContentType,
    nullable: true,
  })
  content_type: ContentType;

  @Column({ type: "uuid", nullable: true })
  content_id: string;

  @Column({ type: "text" })
  message: string;

  @Column({ default: false })
  is_read: boolean;

  @Column({ type: "timestamp", nullable: true })
  read_at: Date;

  @CreateDateColumn()
  created_at: Date;
}