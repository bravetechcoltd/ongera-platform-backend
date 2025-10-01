import { ResearchProject } from "./ResearchProject";
import { Event } from "./Event";
import { User } from "./User";
export declare enum SessionType {
    PRESENTATION = "Presentation",
    PANEL = "Panel",
    QA = "Q&A",
    BREAK = "Break"
}
export declare class EventAgenda {
    id: string;
    event: Event;
    session_title: string;
    description: string;
    speaker_name: string;
    speaker: User;
    start_time: string;
    end_time: string;
    session_type: SessionType;
    linked_project: ResearchProject;
    display_order: number;
}
