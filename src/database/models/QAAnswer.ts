import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { QAThread } from "./QAThread";
import { User } from "./User";
import { QAVote } from "./QAVote";

@Entity("qa_answers")
export class QAAnswer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => QAThread, (thread) => thread.answers)
  @JoinColumn({ name: "thread_id" })
  thread: QAThread;

  @ManyToOne(() => User)
  @JoinColumn({ name: "answerer_id" })
  answerer: User;

  @Column({ type: "text" })
  content: string;

  @Column({ default: false })
  is_accepted: boolean;

  @Column({ default: 0 })
  upvotes_count: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => QAVote, (vote) => vote.answer)
  votes: QAVote[];

  // Virtual field for user's vote
  user_vote?: string;
}