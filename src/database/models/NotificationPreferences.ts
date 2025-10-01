// @ts-nocheck

import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { User } from "./User";
import { ContentType } from "./Like";
@Entity("notification_preferences")
export class NotificationPreferences {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ default: true })
  email_notifications_enabled: boolean;

  @Column({ default: true })
  push_notifications_enabled: boolean;

  @Column({ default: true })
  new_follower_notify: boolean;

  @Column({ default: true })
  project_comment_notify: boolean;

  @Column({ default: true })
  event_reminder_notify: boolean;

  @Column({ default: true })
  community_post_notify: boolean;

  @Column({ default: false })
  weekly_digest: boolean;
}
