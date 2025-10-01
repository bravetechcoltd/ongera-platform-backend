import { User } from "./User";
import { ResearchProject } from "./ResearchProject";
export declare enum CollaborationRequestStatus {
    PENDING = "Pending",
    APPROVED = "Approved",
    REJECTED = "Rejected"
}
/**
 * CollaborationRequest Entity
 * Manages requests from users wanting to contribute to research projects
 */
export declare class CollaborationRequest {
    id: string;
    project: ResearchProject;
    requester: User;
    reason: string;
    expertise: string;
    status: CollaborationRequestStatus;
    rejection_reason: string;
    requested_at: Date;
    updated_at: Date;
    responded_at: Date;
}
