// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

export enum SupervisorInvitationStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  REVOKED = "REVOKED",
}

@Entity("industrial_supervisors")
export class IndustrialSupervisor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "institution_id" })
  institution: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "invited_by_id" })
  invited_by: User;

  @Column({
    type: "enum",
    enum: SupervisorInvitationStatus,
    default: SupervisorInvitationStatus.PENDING,
  })
  invitation_status: SupervisorInvitationStatus;

  @Column({ unique: true })
  invitation_token: string;

  @Column({ type: "timestamp", nullable: true })
  invitation_expires_at: Date;

  @Column({ nullable: true })
  organization: string;

  @Column({ nullable: true })
  expertise_area: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: "timestamp", nullable: true })
  accepted_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
