import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { User } from "./User";
import { Event } from "./Event";

export enum RegistrationStatus {
  REGISTERED = "Registered",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  WAITLISTED = "Waitlisted",
  ATTENDED = "Attended",
  NO_SHOW = "NoShow",
}

@Entity("event_attendees")
export class EventAttendee {
  @PrimaryGeneratedColumn("uuid")
  id: string;

@ManyToOne(() => Event, (event) => event.attendees, { 
  onDelete: "CASCADE"
})
@JoinColumn({ name: "event_id" })
event: Event;

  @ManyToOne(() => User, (user) => user.eventAttendances, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({
    type: "enum",
    enum: RegistrationStatus,
    default: RegistrationStatus.REGISTERED,
  })
  registration_status: RegistrationStatus;

  @CreateDateColumn()
  registered_at: Date;

  @Column({ type: "text", nullable: true })
  approval_note: string;

  @Column({ type: "timestamp", nullable: true })
  check_in_time: Date;

  @Column({ default: false })
  certificate_issued: boolean;
}
