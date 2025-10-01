import { User } from "./User";
import { CommunityPost } from "./CommunityPost";
import { Event } from "./Event";
import { ResearchProject } from "./ResearchProject";
export declare enum CommunityType {
    PUBLIC = "Public",
    PRIVATE = "Private",
    INSTITUTION_SPECIFIC = "Institution-Specific"
}
export declare class Community {
    id: string;
    name: string;
    slug: string;
    rules: string;
    description: string;
    cover_image_url: string;
    creator: User;
    community_type: CommunityType;
    category: string;
    member_count: number;
    post_count: number;
    created_at: Date;
    is_active: boolean;
    join_approval_required: boolean;
    members: User[];
    posts: CommunityPost[];
    events: Event[];
    projects: ResearchProject[];
}
