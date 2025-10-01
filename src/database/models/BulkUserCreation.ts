import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export enum BulkCreationStatus {
  PENDING = "Pending",
  PROCESSING = "Processing",
  COMPLETED = "Completed",
  FAILED = "Failed",
}

@Entity("bulk_user_creations")
export class BulkUserCreation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "creator_id" })
  creator: User;

  @Column({ type: "jsonb" })
  instructors: Array<{
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    department?: string;
    user_id?: string;
    password?: string;
  }>;

  @Column({ type: "jsonb" })
  students: Array<{
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    assigned_instructor_email: string;
    user_id?: string;
    password?: string;
  }>;

  @Column({
    type: "enum",
    enum: BulkCreationStatus,
    default: BulkCreationStatus.PENDING,
  })
  status: BulkCreationStatus;

  @Column({ type: "text", nullable: true })
  error_message: string;

  @Column({ default: 0 })
  total_instructors: number;

  @Column({ default: 0 })
  total_students: number;

  @Column({ default: 0 })
  processed_instructors: number;

  @Column({ default: 0 })
  processed_students: number;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "timestamp", nullable: true })
  completed_at: Date;
}