import { ResearchProject } from "../database/models/ResearchProject";
export declare class ActivateDeactivateDeleteResearchProjectsTemplate {
    /**
     * Template for project activation/deactivation (Published/Archived)
     */
    static getStatusChangeTemplate(project: ResearchProject, isActivation: boolean, reason?: string): string;
    /**
     * Template for project deletion notification
     */
    static getDeletionTemplate(project: ResearchProject): string;
}
