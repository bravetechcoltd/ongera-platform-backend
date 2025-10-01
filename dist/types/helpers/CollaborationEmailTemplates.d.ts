import { ResearchProject } from "../database/models/ResearchProject";
import { User } from "../database/models/User";
import { CollaborationRequest } from "../database/models/CollaborationRequest";
import { ProjectContribution } from "../database/models/ProjectContribution";
/**
 * Collaboration Email Templates
 * Maintains same design standards as existing templates
 */
export declare class CollaborationEmailTemplates {
    /**
     * Email sent to project creator when someone requests to collaborate
     */
    /**
     * Email sent to contributor when their contribution is approved
     */
    static getContributionApprovedTemplate(project: ResearchProject, contributor: User, contribution: ProjectContribution): string;
    static getCollaborationRequestTemplate(project: ResearchProject, requester: User, request: CollaborationRequest): string;
    /**
     * Email sent to requester when their collaboration request is approved
     */
    static getRequestApprovedTemplate(project: ResearchProject, requester: User): string;
    /**
     * Email sent to requester when their collaboration request is rejected
     */
    static getRequestRejectedTemplate(project: ResearchProject, requester: User, rejectionReason?: string): string;
}
