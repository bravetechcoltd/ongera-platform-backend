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
import { QAAnswer } from "./QAAnswer";

export enum VoteType {
  UPVOTE = "UPVOTE",
  DOWNVOTE = "DOWNVOTE",
}

@Entity("qa_votes")
@Index(["user", "answer"], { unique: true })
export class QAVote {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => QAAnswer, (answer) => answer.votes)
  @JoinColumn({ name: "answer_id" })
  answer: QAAnswer;

  @Column({
    type: "enum",
    enum: VoteType,
  })
  vote_type: VoteType;

  @CreateDateColumn()
  created_at: Date;
}