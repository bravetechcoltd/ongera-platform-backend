interface ProjectData {
    title: string;
    abstract: string;
    research_type: string;
    status: string;
    created_at: Date;
    author: {
        first_name: string;
        last_name: string;
        profile?: {
            institution_name?: string;
        };
    };
    community: {
        name: string;
        member_count: number;
    };
    tags?: Array<{
        name: string;
    }>;
    view_count?: number;
    download_count?: number;
    project_id: string;
}
interface MemberData {
    first_name: string;
}
export declare class NewsProjectCreatedTemplate {
    static getProjectCreatedTemplate(projectData: ProjectData, memberData: MemberData): string;
}
export {};
