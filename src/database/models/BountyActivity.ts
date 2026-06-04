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
import { Bounty } from "./Bounty";

export enum BountyActivityType {
  CREATED = "CREATED",
  SUBMITTED = "SUBMITTED",
  SHORTLISTED = "SHORTLISTED",
  AWARDED = "AWARDED",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

/**
 * Timeline of meaningful events on a bounty — powers the activity feed on the
 * bounty detail page (mirrors InstitutionProjectActivity).
 */
@Entity("bounty_activities")
export class BountyActivity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  bounty_id: string;

  @ManyToOne(() => Bounty, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bounty_id" })
  bounty: Bounty;

  @Column({ type: "uuid", nullable: true })
  actor_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "actor_id" })
  actor: User;

  @Column({ type: "varchar", length: 60, nullable: true })
  actor_role: string;

  @Column({
    type: "enum",
    enum: BountyActivityType,
  })
  action_type: BountyActivityType;

  @Column({ type: "text", nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}
