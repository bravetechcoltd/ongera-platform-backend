import { UserProfile } from "./UserProfile";
import { ResearchProject } from "./ResearchProject";
import { Community } from "./Community";
import { BlogPost } from "./BlogPost";
import { Comment } from "./Comment";
import { QAThread } from "./QAThread";
import { Like } from "./Like";
import { CommunityPost } from "./CommunityPost";
import { Event } from "./Event";
import { EventAttendee } from "./EventAttendee";
export declare enum AccountType {
    STUDENT = "Student",
    RESEARCHER = "Researcher",
    DIASPORA = "Diaspora",
    INSTITUTION = "Institution",
    ADMIN = "admin"
}
export declare class User {
    id: string;
    email: string;
    password_hash: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    profile_picture_url: string;
    bio: string;
    account_type: AccountType;
    is_verified: boolean;
    is_active: boolean;
    date_joined: Date;
    last_login: Date;
    country: string;
    city: string;
    social_auth_provider: string;
    social_auth_id: string;
    profile: UserProfile;
    projects: ResearchProject[];
    created_communities: Community[];
    organized_events: Event[];
    community_posts: CommunityPost[];
    blog_posts: BlogPost[];
    qa_threads: QAThread[];
    comments: Comment[];
    likes: Like[];
    followers: User[];
    following: User[];
    eventAttendances: EventAttendee[];
}
