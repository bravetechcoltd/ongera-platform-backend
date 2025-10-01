interface CommunityData {
    name: string;
    description: string;
    category: string;
    community_type: string;
    cover_image_url?: string;
    creator: {
        first_name: string;
        last_name: string;
        email: string;
        profile?: {
            institution_name?: string;
        };
    };
    community_id: string;
    created_at: Date;
}
interface AdminData {
    first_name: string;
    email: string;
}
export declare class SendEmailToAdminTemplate {
    static getNewCommunityNotification(communityData: CommunityData, adminData: AdminData): string;
}
export {};
