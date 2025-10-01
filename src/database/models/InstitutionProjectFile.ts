// @ts-nocheck
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { InstitutionResearchProject } from "./InstitutionResearchProject";
import { User } from "./User";

@Entity("institution_project_files")
export class InstitutionProjectFile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => InstitutionResearchProject, (project) => project.files, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "project_id" })
  project: InstitutionResearchProject;

  @Column()
  file_url: string;

  @Column()
  file_name: string;

  @Column()
  file_type: string;

  @Column({ type: "bigint", default: 0 })
  file_size: number;

  @CreateDateColumn()
  uploaded_at: Date;

  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "uploaded_by_id" })
  uploaded_by: User;

  @Column({ default: 1 })
  file_version: number;

  @Column({ default: true })
  is_latest_version: boolean;
}
