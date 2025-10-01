// @ts-nocheck
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { ContentType } from "./Like";

@Entity("search_queries")
export class SearchQuery {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  query_text: string;

  @Column({ default: 0 })
  results_count: number;

  @CreateDateColumn()
  created_at: Date;
}