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
import { InstructorStudent } from "./InstructorStudent";
import { UserSession } from "./UserSession";
export declare enum AccountType {
    STUDENT = "Student",
    RESEARCHER = "Researcher",
    DIASPORA = "Diaspora",
    INSTITUTION = "Institution",
    ADMIN = "admin"
}
export declare enum BwengeRole {
    SYSTEM_ADMIN = "SYSTEM_ADMIN",
    INSTITUTION_ADMIN = "INSTITUTION_ADMIN",
    CONTENT_CREATOR = "CONTENT_CREATOR",
    INSTRUCTOR = "INSTRUCTOR",
    LEARNER = "LEARNER"
}
export declare enum SystemType {
    BWENGEPLUS = "bwengeplus",
    ONGERA = "ongera"
}
export declare enum InstitutionRole {
    ADMIN = "ADMIN",
    CONTENT_CREATOR = "CONTENT_CREATOR",
    INSTRUCTOR = "INSTRUCTOR",
    MEMBER = "MEMBER"
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
    isUserLogin: boolean;
    date_joined: Date;
    last_login: Date;
    country: string;
    city: string;
    social_auth_provider: string;
    social_auth_id: string;
    IsForWhichSystem: SystemType;
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
    assignedStudents: InstructorStudent[];
    assignedInstructor: InstructorStudent[];
    sessions: UserSession[];
    bwenge_role: BwengeRole;
    primary_institution_id: string;
    is_institution_member: boolean;
    institution_ids: string[];
    institution_role: InstitutionRole;
    private _originalBwengeRole;
    private _originalIsForWhichSystem;
    private _originalInstitutionIds;
    private _originalInstitutionRole;
    private _originalPrimaryInstitutionId;
    private _originalIsInstitutionMember;
    storeOriginalValues(): void;
    protectAllCriticalFields(): void;
    setOriginalBwengeRole(role: BwengeRole): void;
    isInstructor(): boolean;
    hasAssignedInstructor(): boolean;
    getStudentCount(): number;
}
