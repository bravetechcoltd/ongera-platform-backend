import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { ContentType } from "./Like";

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.comments)
  @JoinColumn({ name: "author_id" })
  author: User;

  @Column({
    type: "enum",
    enum: ContentType,
  })
  content_type: ContentType;

  @Column({ type: "uuid" })
  content_id: string;

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: "parent_comment_id" })
  parent_comment: Comment;

  @OneToMany(() => Comment, (comment) => comment.parent_comment)
  replies: Comment[];

  @Column({ type: "text" })
  comment_text: string;

  @Column({ nullable: true })
  media_url: string;

  @Column({ default: false })
  is_edited: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
