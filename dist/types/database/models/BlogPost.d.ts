import { User } from "./User";
import { Community } from "./Community";
import { ResearchProject } from "./ResearchProject";
export declare enum BlogStatus {
    DRAFT = "Draft",
    UNDER_REVIEW = "Under Review",
    PUBLISHED = "Published",
    ARCHIVED = "Archived"
}
export declare class BlogPost {
    id: string;
    author: User;
    community: Community;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    cover_image_url: string;
    status: BlogStatus;
    published_at: Date;
    view_count: number;
    reading_time_minutes: number;
    category: string;
    linked_project: ResearchProject;
    created_at: Date;
    updated_at: Date;
    isPublic(): boolean;
    isArchived(): boolean;
    canPublish(): boolean;
    publish(): void;
    archive(): void;
    restoreFromArchive(): void;
}
