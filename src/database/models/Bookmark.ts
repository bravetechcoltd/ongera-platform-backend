import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { ContentType } from "./Like";

@Entity("bookmarks")
export class Bookmark {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User)
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