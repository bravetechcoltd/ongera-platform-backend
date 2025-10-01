import { User } from "./User";
import { ResearchProject } from "./ResearchProject";
export declare class ProjectContribution {
    id: string;
    project: ResearchProject;
    contributor: User;
    contribution_title: string;
    contribution_content: string;
    contribution_files: {
        file_url: string;
        file_name: string;
        file_type: string;
        file_size: number;
    }[];
    contribution_section: string;
    created_at: Date;
    updated_at: Date;
    is_approved: boolean;
    approved_at: Date;
}
