import { User } from "./User";
import { Community } from "./Community";
export declare enum JoinRequestStatus {
    PENDING = "Pending",
    APPROVED = "Approved",
    REJECTED = "Rejected"
}
export declare class CommunityJoinRequest {
    id: string;
    community: Community;
    user: User;
    status: JoinRequestStatus;
    message: string;
    requested_at: Date;
    responded_at: Date;
    responded_by: User;
}
