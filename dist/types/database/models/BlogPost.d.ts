import { ProjectStatus, ResearchProject } from "./ResearchProject";
import { User } from "./User";
import { Community } from "./Community";
export declare class BlogPost {
    id: string;
    author: User;
    community: Community;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    cover_image_url: string;
    status: ProjectStatus;
    published_at: Date;
    view_count: number;
    reading_time_minutes: number;
    category: string;
    linked_project: ResearchProject;
    created_at: Date;
    updated_at: Date;
}
