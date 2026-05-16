import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  Column,
} from "typeorm";
import { User } from "./User";

@Entity("user_follows")
@Unique("UQ_follower_following", ["follower_id", "following_id"])
@Index(["follower_id"])
@Index(["following_id"])
export class UserFollow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  follower_id: string;

  @Column("uuid")
  following_id: string;

  @ManyToOne(() => User, (user) => user.following_relations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "follower_id" })
  follower: User;

  @ManyToOne(() => User, (user) => user.follower_relations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "following_id" })
  following: User;

  @CreateDateColumn()
  created_at: Date;
}
