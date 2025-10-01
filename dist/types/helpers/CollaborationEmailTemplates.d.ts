import { ResearchProject } from "../database/models/ResearchProject";
import { User } from "../database/models/User";
import { CollaborationRequest } from "../database/models/CollaborationRequest";
/**
 * Collaboration Email Templates
 * Maintains same design standards as existing templates
 */
export declare class CollaborationEmailTemplates {
    /**
     * Email sent to project creator when someone requests to collaborate
     */
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
