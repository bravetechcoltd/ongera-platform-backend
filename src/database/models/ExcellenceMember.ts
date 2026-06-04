import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

export enum ExcellenceTier {
  RISING = "RISING",
  OUTSTANDING = "OUTSTANDING",
  ELITE = "ELITE",
}

export enum ExcellenceMemberStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  REVOKED = "REVOKED",
}

/**
 * A persistent recognition record. An admin enrolls an outstanding bwenge user
 * (Student / Researcher / Diaspora) into the Excellence space. This is the
 * bigger sibling of MonthlyStarTracker: instead of a per-month snapshot it is a
 * standing membership that unlocks the Excellence Dashboard (User.is_excellence_member).
 */
@Entity("excellence_members")
@Index(["status"])
export class ExcellenceMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  @Index()
  user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  // The admin who enrolled this member.
  @Column({ type: "uuid", nullable: true })
  enrolled_by_id: string;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "enrolled_by_id" })
  enrolled_by: User;

  @Column({
    type: "enum",
    enum: ExcellenceMemberStatus,
    default: ExcellenceMemberStatus.ACTIVE,
  })
  status: ExcellenceMemberStatus;

  @Column({
    type: "enum",
    enum: ExcellenceTier,
    default: ExcellenceTier.RISING,
  })
  tier: ExcellenceTier;

  // Short professional one-liner shown on the talent card.
  @Column({ type: "varchar", length: 180, nullable: true })
  headline: string;

  @Column({ type: "text", nullable: true })
  bio_highlight: string;

  // e.g. ["Data Science", "Mechanical", "Web"]
  @Column({ type: "simple-array", nullable: true })
  specialties: string[];

  // Snapshot of the contribution score that justified enrolment.
  @Column({ default: 0 })
  total_score: number;

  // Institution (company) user-ids an admin connected this star to.
  @Column({ type: "simple-array", nullable: true })
  linked_institution_ids: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
