import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from "typeorm";
import { ResearchProject } from "./ResearchProject";

export enum TagCategory {
  FIELD = "Field",
  METHOD = "Method",
  TOPIC = "Topic",
  REGION = "Region",
}

@Entity("project_tags")
export class ProjectTag {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: 0 })
  usage_count: number;

  @Column({
    type: "enum",
    enum: TagCategory,
  })
  category: TagCategory;

  @ManyToMany(() => ResearchProject, (project) => project.tags)
  projects: ResearchProject[];
}