interface CommunityData {
    name: string;
    description: string;
    category: string;
    community_type: string;
    cover_image_url?: string;
    community_id: string;
}
interface CreatorData {
    first_name: string;
    email: string;
}
export declare class ApproveRejectCommunityToCreatorTemplate {
    /**
     * Generate email template for community approval notification
     */
    static getApprovalTemplate(communityData: CommunityData, creatorData: CreatorData): string;
    static getRejectionTemplate(communityData: CommunityData, creatorData: CreatorData, reason?: string): string;
}
export {};
