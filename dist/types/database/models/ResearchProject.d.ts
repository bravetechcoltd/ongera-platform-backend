import { ProjectFile } from "./ProjectFile";
import { ProjectTag } from "./ProjectTag";
import { User } from "./User";
import { CommunityPost } from "./CommunityPost";
import { Event } from "./Event";
import { Community } from "./Community";
import { Like } from "./Like";
import { Comment } from "./Comment";
import { CollaborationRequest } from "./CollaborationRequest";
import { ProjectContribution } from "./ProjectContribution";
export declare enum ProjectApprovalStatus {
    DRAFT = "Draft",
    PENDING_REVIEW = "Pending Review",
    APPROVED = "Approved",
    REJECTED = "Rejected",
    RETURNED = "Returned"
}
export declare enum AcademicLevel {
    UNDERGRADUATE = "Undergraduate",
    MASTERS = "Masters",
    PHD = "PhD",
    RESEARCHER = "Researcher",
    DIASPORA = "Diaspora",
    INSTITUTION = "Institution"
}
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
export declare enum CollaborationInfoStatus {
    PENDING = "Pending",
    APPROVED = "Approved",
    REJECTED = "Rejected"
}
export interface CollaborationInfo {
    user_id: string;
    user_email: string;
    user_name: string;
    status: CollaborationInfoStatus;
    requested_at: Date;
    updated_at: Date;
    reason?: string;
    expertise?: string;
    rejection_reason?: string;
}
export declare class ResearchProject {
    id: string;
    author: User;
    title: string;
    abstract: string;
    full_description: string;
    status: ProjectStatus;
    approval_status: ProjectApprovalStatus;
    requires_approval: boolean;
    status_change_history: {
        from_status: ProjectStatus;
        to_status: ProjectStatus;
        changed_by: string;
        changed_at: Date;
        reason?: string;
        notes?: string;
    }[];
    assigned_instructor: User;
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
    approved_collaborators: {
        user_id: string;
        approved_at: Date;
    }[];
    collaborator_count: number;
    /**
     * Tracks all collaboration requests and their status changes
     * This provides a complete history of: pending requests, approved collaborators, and rejected requests
     */
    collaboration_info: CollaborationInfo[];
    files: ProjectFile[];
    academic_level: AcademicLevel;
    tags: ProjectTag[];
    community_posts: CommunityPost[];
    community: Community;
    events: Event[];
    likes: Like[];
    comments: Comment[];
    collaboration_requests: CollaborationRequest[];
    contributions: ProjectContribution[];
}
