import { EventAttendee } from "./EventAttendee";
import { EventAgenda } from "./EventAgenda";
import { User } from "./User";
import { Community } from "./Community";
import { ResearchProject } from "./ResearchProject";
export declare enum EventType {
    WEBINAR = "Webinar",
    CONFERENCE = "Conference",
    WORKSHOP = "Workshop",
    SEMINAR = "Seminar",
    MEETUP = "Meetup"
}
export declare enum EventMode {
    ONLINE = "Online",
    PHYSICAL = "Physical",
    HYBRID = "Hybrid"
}
export declare enum EventStatus {
    UPCOMING = "Upcoming",
    ONGOING = "Ongoing",
    COMPLETED = "Completed",
    CANCELLED = "Cancelled",
    DELETED = "Deleted"
}
export declare class Event {
    id: string;
    organizer: User;
    community: Community;
    title: string;
    description: string;
    event_type: EventType;
    event_mode: EventMode;
    start_datetime: Date;
    end_datetime: Date;
    timezone: string;
    location_address: string;
    online_meeting_url: string;
    meeting_id: string;
    meeting_password: string;
    cover_image_url: string;
    max_attendees: number;
    registration_deadline: Date;
    is_free: boolean;
    price_amount: number;
    status: EventStatus;
    requires_approval: boolean;
    created_at: Date;
    updated_at: Date;
    attendees: EventAttendee[];
    agenda_items: EventAgenda[];
    linked_projects: ResearchProject[];
}
