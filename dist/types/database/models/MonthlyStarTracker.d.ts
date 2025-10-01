import { User } from "./User";
export declare class MonthlyStarTracker {
    id: string;
    user: User;
    month: number;
    year: number;
    community_id: string;
    projects_count: number;
    blogs_count: number;
    events_count: number;
    followers_count: number;
    total_score: number;
    admin_approved: boolean;
    badge_image_url: string;
    description: string;
    rewards: string;
    approved_at: Date;
    created_at: Date;
}
