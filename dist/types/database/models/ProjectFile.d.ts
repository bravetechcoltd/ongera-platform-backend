import { ResearchProject } from "./ResearchProject";
export declare class ProjectFile {
    id: string;
    project: ResearchProject;
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
    uploaded_at: Date;
    description: string;
}
