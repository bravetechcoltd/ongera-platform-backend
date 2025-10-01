import { ProjectFile } from "./ProjectFile";
import { ProjectTag } from "./ProjectTag";
import { User } from "./User";
import { CommunityPost } from "./CommunityPost";
import { Event } from "./Event";
import { Community } from "./Community";
import { Like } from "./Like";
import { Comment } from "./Comment";
export declare enum ProjectStatus {
    DRAFT = "Draft",
    PUBLISHED = "Published",
    UNDER_REVIEW = "Under Review",
    ARCHIVED = "Archived"
}
export declare enum ResearchType {
    THESIS = "Thesis",
    PAPER = "Paper",
    PROJECT = "Project",
    DATASET = "Dataset",
    CASE_STUDY = "Case Study"
}
export declare enum Visibility {
    PUBLIC = "Public",
    COMMUNITY_ONLY = "Community-Only",
    PRIVATE = "Private"
}
export declare enum CollaborationStatus {
    SOLO = "Solo",
    SEEKING_COLLABORATORS = "Seeking Collaborators",
    COLLABORATIVE = "Collaborative"
}
export declare class ResearchProject {
    id: string;
    author: User;
    title: string;
    abstract: string;
    full_description: string;
    status: ProjectStatus;
    research_type: ResearchType;
    project_file_url: string;
    cover_image_url: string;
    publication_date: Date;
    created_at: Date;
    updated_at: Date;
    is_featured: boolean;
    visibility: Visibility;
    field_of_study: string;
    doi: string;
    view_count: number;
    download_count: number;
    like_count: number;
    comment_count: number;
    collaboration_status: CollaborationStatus;
    files: ProjectFile[];
    tags: ProjectTag[];
    community_posts: CommunityPost[];
    community: Community;
    events: Event[];
    likes: Like[];
    comments: Comment[];
}
