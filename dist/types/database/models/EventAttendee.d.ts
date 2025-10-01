import { User } from "./User";
import { Event } from "./Event";
export declare enum RegistrationStatus {
    REGISTERED = "Registered",
    APPROVED = "Approved",
    REJECTED = "Rejected",
    WAITLISTED = "Waitlisted",
    ATTENDED = "Attended",
    NO_SHOW = "NoShow"
}
export declare class EventAttendee {
    id: string;
    event: Event;
    user: User;
    registration_status: RegistrationStatus;
    registered_at: Date;
    approval_note: string;
    check_in_time: Date;
    certificate_issued: boolean;
}
