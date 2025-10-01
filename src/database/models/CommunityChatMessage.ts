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

export enum MessageType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
}

// NEW: Chat Type Enum
export enum ChatType {
  COMMUNITY = "community", // Messages visible to all community members
  DIRECT = "direct"        // Private messages between two users
}

@Entity("community_chat_messages")
@Index(["community_id", "chat_type"]) // Index for filtering by chat type
@Index(["community_id", "sender_id", "recipient_user_id"]) // Index for direct messages
export class CommunityChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  community_id: string;

  @Column()
  sender_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "sender_id" })
  sender: User;

  // NEW: Chat type field
  @Column({ 
    type: "enum", 
    enum: ChatType, 
    default: ChatType.COMMUNITY 
  })
  chat_type: ChatType;

  // NEW: Recipient user ID for direct messages
  @Column({ nullable: true })
  recipient_user_id: string | null;

  // NEW: Relation to recipient user
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "recipient_user_id" })
  recipient_user: User;

  @Column({ type: "text" })
  content: string;

  @Column({
    type: "enum",
    enum: MessageType,
    default: MessageType.TEXT,
  })
  message_type: MessageType;

  @Column({ default: "", nullable: true })
  file_url: string;

  @Column({ default: "", nullable: true })
  file_name: string;

  @Column({ default: "", nullable: true })
  file_type: string;

  // FIXED: Changed from default "" to nullable true
  @Column({ nullable: true })
  reply_to_message_id: string | null;

  @ManyToOne(() => CommunityChatMessage, { nullable: true })
  @JoinColumn({ name: "reply_to_message_id" })
  reply_to: CommunityChatMessage;

  @Column({ type: "jsonb", default: {} })
  reactions: Record<string, string>;

  @Column({ default: false })
  edited: boolean;

  @Column({ default: false })
  deleted_for_everyone: boolean;

  @Column({ type: "text", array: true, default: [] })
  deleted_by_users: string[];

  @Column({ type: "text", array: true, default: [] })
  read_by: string[];

  @CreateDateColumn()
  created_at: Date;
}