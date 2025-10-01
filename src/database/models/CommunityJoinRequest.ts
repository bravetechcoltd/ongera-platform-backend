import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Community } from "./Community";

export enum JoinRequestStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
}

@Entity("community_join_requests")
export class CommunityJoinRequest {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Community, { onDelete: "CASCADE" })
  @JoinColumn({ name: "community_id" })
  community: Community;


  

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "enum",
    enum: JoinRequestStatus,
    default: JoinRequestStatus.PENDING,
  })
  status: JoinRequestStatus;

  @Column({ type: "text", nullable: true })
  message: string;

  @CreateDateColumn()
  requested_at: Date;

  @Column({ type: "timestamp", nullable: true })
  responded_at: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "responded_by_id" })
  responded_by: User;
}