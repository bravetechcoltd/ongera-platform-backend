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
import { QAAnswer } from "./QAAnswer";
import { Community } from "./Community";
import { User } from "./User";

@Entity("qa_threads")
export class QAThread {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.qa_threads)
  @JoinColumn({ name: "asker_id" })
  asker: User;

  @ManyToOne(() => Community, { nullable: true })
  @JoinColumn({ name: "community_id" })
  community: Community;

  @Column({ length: 200 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "jsonb", nullable: true })
  tags: string[];

  @Column({ nullable: true })
  category: string;

  @Column({ default: false })
  is_answered: boolean;

  @ManyToOne(() => QAAnswer, { nullable: true })
  @JoinColumn({ name: "best_answer_id" })
  best_answer: QAAnswer;

  @Column({ default: 0 })
  view_count: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => QAAnswer, (answer) => answer.thread)
  answers: QAAnswer[];

  // Virtual field for answer count
  answer_count?: number;
}