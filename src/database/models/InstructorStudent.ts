import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity("instructor_students")
export class InstructorStudent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "instructor_id" })
  instructor: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" }) 
  @JoinColumn({ name: "student_id" })
  student: User;

  @Column({ type: "timestamp", nullable: true })
  assigned_at: Date;

  // ==================== INSTITUTION RESEARCH PORTAL — ADDITIVE COLUMNS ====================
  @Column({ default: false })
  has_industrial_supervisor: boolean;

  @Column({ type: "uuid", nullable: true })
  industrial_supervisor_id: string;

  @Column({ type: "uuid", nullable: true })
  assigned_by_institution_id: string;

  @CreateDateColumn()
  created_at: Date;
}