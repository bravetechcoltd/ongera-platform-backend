import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { ResearchProject } from "./ResearchProject";
import { Event } from "./Event";
import { User } from "./User";
export enum SessionType {
  PRESENTATION = "Presentation",
  PANEL = "Panel",
  QA = "Q&A",
  BREAK = "Break",
}

@Entity("event_agenda")
export class EventAgenda {
  @PrimaryGeneratedColumn("uuid")
  id: string;
@ManyToOne(() => Event, (event) => event.agenda_items, { 
  onDelete: "CASCADE" 
})
@JoinColumn({ name: "event_id" })
event: Event;

  @Column()
  session_title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  speaker_name: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "speaker_id" })
  speaker: User;

  @Column({ type: "time" })
  start_time: string;

  @Column({ type: "time" })
  end_time: string;

  @Column({
    type: "enum",
    enum: SessionType,
  })
  session_type: SessionType;

  @ManyToOne(() => ResearchProject, { nullable: true })
  @JoinColumn({ name: "linked_project_id" })
  linked_project: ResearchProject;

  @Column({ default: 0 })
  display_order: number;
}