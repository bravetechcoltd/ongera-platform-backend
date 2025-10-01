import { Community } from "./Community";
import { User } from "./User";
import { ResearchProject } from "./ResearchProject";
import { Event } from "./Event";
export declare enum PostType {
    DISCUSSION = "Discussion",
    QUESTION = "Question",
    RESOURCE = "Resource",
    ANNOUNCEMENT = "Announcement",
    LINKED_PROJECT = "LinkedProject"
}
export declare class CommunityPost {
    id: string;
    community: Community;
    author: User;
    post_type: PostType;
    title: string;
    content: string;
    linked_project: ResearchProject;
    linked_event: Event;
    media_urls: string[];
    is_pinned: boolean;
    is_locked: boolean;
    view_count: number;
    created_at: Date;
    updated_at: Date;
}
