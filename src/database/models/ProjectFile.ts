import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { ResearchProject } from "./ResearchProject";

@Entity("project_files")
export class ProjectFile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => ResearchProject, (project) => project.files)
  @JoinColumn({ name: "project_id" })
  project: ResearchProject;

  @Column()
  file_url: string;

  @Column()
  file_name: string;

  @Column()
  file_type: string;

  @Column({ type: "bigint" })
  file_size: number;

  @CreateDateColumn()
  uploaded_at: Date;

  @Column({ type: "text", nullable: true })
  description: string;
}
