interface CommunityData {
    name: string;
    description: string;
    community_id: string;
    cover_image_url?: string;
    category?: string;
    community_type?: string;
}
interface RequesterData {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
    account_type?: string;
}
interface RecipientData {
    first_name: string;
    email: string;
}
export declare class JoinRequestEmailTemplate {
    /**
     * Email to Community Creator - New Join Request
     */
    static getCreatorNotification(communityData: CommunityData, requesterData: RequesterData, creatorData: RecipientData, requestId: string): string;
    /**
     * Email to Admin - New Join Request
     */
    static getAdminNotification(communityData: CommunityData, requesterData: RequesterData, creatorData: {
        first_name: string;
        last_name: string;
        email: string;
    }, adminData: RecipientData, requestId: string): string;
    /**
     * Email to Requester - Request Confirmation
     */
    static getRequesterConfirmation(communityData: CommunityData, requesterData: RequesterData): string;
    /**
     * Email to Requester - Request Approved
     */
    static getApprovalNotification(communityData: CommunityData, requesterData: RequesterData): string;
    /**
     * Email to Requester - Request Rejected
     */
    static getRejectionNotification(communityData: CommunityData, requesterData: RequesterData, reason?: string): string;
}
export {};
