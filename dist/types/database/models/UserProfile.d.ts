import { User } from "./User";
export declare enum AcademicLevel {
    UNDERGRADUATE = "Undergraduate",
    MASTERS = "Masters",
    PHD = "PhD",
    PROFESSIONAL = "Professional"
}
export declare class UserProfile {
    id: string;
    user: User;
    institution_name: string;
    department: string;
    academic_level: AcademicLevel;
    research_interests: string[];
    orcid_id: string;
    google_scholar_url: string;
    linkedin_url: string;
    website_url: string;
    cv_file_url: string;
    current_position: string;
    home_institution: string;
    willing_to_mentor: boolean;
    total_projects_count: number;
    total_followers_count: number;
    total_following_count: number;
    institution_address: string;
    institution_phone: string;
    institution_type: string;
    institution_website: string;
    institution_description: string;
    institution_departments: string[];
    institution_founded_year: number;
    institution_accreditation: string;
}
