import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from "typeorm";
import { User } from "./User";

export enum ContentType {
  PROJECT = "Project",
  POST = "Post",
  COMMENT = "Comment",
  EVENT = "Event",
}

@Entity("likes")
@Index(["user", "content_type", "content_id"], { unique: true })
export class Like {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.likes)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "enum",
    enum: ContentType,
  })
  content_type: ContentType;

  @Column({ type: "uuid" })
  content_id: string;

  @CreateDateColumn()
  created_at: Date;
}