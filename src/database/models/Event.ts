import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { EventAttendee } from "./EventAttendee";
import { EventAgenda } from "./EventAgenda";
import { User } from "./User";
import { Community } from "./Community";
import { ResearchProject } from "./ResearchProject";
export enum EventType {
  WEBINAR = "Webinar",
  CONFERENCE = "Conference",
  WORKSHOP = "Workshop",
  SEMINAR = "Seminar",
  MEETUP = "Meetup",
}

export enum EventMode {
  ONLINE = "Online",
  PHYSICAL = "Physical",
  HYBRID = "Hybrid",
}
export enum EventStatus {
  UPCOMING = "Upcoming",
  ONGOING = "Ongoing",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  DELETED = "Deleted" 
}
@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.organized_events)
  @JoinColumn({ name: "organizer_id" })
  organizer: User;

  @ManyToOne(() => Community, (community) => community.events, { nullable: true })
  @JoinColumn({ name: "community_id" })
  community: Community;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({
    type: "enum",
    enum: EventType,
  })
  event_type: EventType;

  @Column({
    type: "enum",
    enum: EventMode,
  })
  event_mode: EventMode;

  @Column({ type: "timestamp" })
  start_datetime: Date;

  @Column({ type: "timestamp" })
  end_datetime: Date;

  @Column()
  timezone: string;

  @Column({ nullable: true })
  location_address: string;

  @Column({ nullable: true })
  online_meeting_url: string;

  @Column({ nullable: true })
  meeting_id: string;

  @Column({ nullable: true })
  meeting_password: string;

  @Column({ nullable: true })
  cover_image_url: string;

  @Column({ type: "int", nullable: true })
  max_attendees: number;

  @Column({ type: "timestamp", nullable: true })
  registration_deadline: Date;

  @Column({ default: true })
  is_free: boolean;

  @Column({ type: "decimal", nullable: true })
  price_amount: number;

  @Column({
    type: "enum",
    enum: EventStatus,
    default: EventStatus.UPCOMING,
  })
  status: EventStatus;

  @Column({ default: false })
  requires_approval: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => EventAttendee, (attendee) => attendee.event)
  attendees: EventAttendee[];

  @OneToMany(() => EventAgenda, (agenda) => agenda.event)
  agenda_items: EventAgenda[];

  @ManyToMany(() => ResearchProject)
  @JoinTable({
    name: "event_projects",
    joinColumn: { name: "event_id" },
    inverseJoinColumn: { name: "project_id" },
  })
  linked_projects: ResearchProject[];
}