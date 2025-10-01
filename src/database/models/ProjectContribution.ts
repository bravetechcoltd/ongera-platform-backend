import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { ResearchProject } from "./ResearchProject";

@Entity("project_contributions")
 export class ProjectContribution {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => ResearchProject, { onDelete: "CASCADE" })
  @JoinColumn({ name: "project_id" })
  project: ResearchProject;

  @ManyToOne(() => User)
  @JoinColumn({ name: "contributor_id" })
  contributor: User;

  @Column({ type: "text" })
  contribution_title: string;

  @Column({ type: "text" })
  contribution_content: string;

  @Column({ type: "jsonb", nullable: true })
  contribution_files: {
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }[];

  @Column({ type: "text", nullable: true })
  contribution_section: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ default: false })
  is_approved: boolean;

  @Column({ type: "timestamp", nullable: true })
  approved_at: Date;
}
