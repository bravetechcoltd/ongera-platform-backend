interface CommunityData {
    name: string;
    description: string;
    category: string;
    member_count: number;
    cover_image_url?: string;
    creator: {
        first_name: string;
        last_name: string;
        profile?: {
            institution_name?: string;
        };
    };
    community_id: string;
    is_active: boolean;
    reason?: string;
}
interface UserData {
    first_name: string;
    email: string;
}
export declare class ActivateDeactiveCommunityTemplate {
    static getStatusChangeTemplate(communityData: CommunityData, userData: UserData, isActivation: boolean): string;
}
export {};
