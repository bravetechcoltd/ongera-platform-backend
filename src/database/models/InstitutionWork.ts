
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum WorkType {
  RESEARCH_COLLABORATION = "Research Collaboration",
  EDUCATIONAL_PARTNERSHIP = "Educational Partnership",
  JOINT_PROJECT = "Joint Project",
  TRAINING_PROGRAM = "Training Program",
  CONFERENCE = "Conference",
  WORKSHOP = "Workshop",
  OTHER = "Other",
}

export enum PartnershipStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  COMPLETED = "completed",
}

@Entity("institution_work")
export class InstitutionWork {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ nullable: true })
  website_url: string;

  @Column({
    type: "enum",
    enum: WorkType,
    default: WorkType.OTHER,
  })
  work_type: WorkType;

  @Column({
    type: "enum",
    enum: PartnershipStatus,
    default: PartnershipStatus.ACTIVE,
  })
  status: PartnershipStatus;

  @Column({ nullable: true })
  contact_email: string;

  @Column({ nullable: true })
  contact_phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: "jsonb", nullable: true })
  social_links: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    founded_year?: number;
    employees_count?: number;
    specializations?: string[];
    achievements?: string[];
  };

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}