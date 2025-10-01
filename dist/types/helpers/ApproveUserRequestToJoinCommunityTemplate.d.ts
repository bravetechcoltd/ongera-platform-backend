interface JoinRequestData {
    community_name: string;
    community_description: string;
    community_id: string;
    cover_image_url?: string;
    requester: {
        first_name: string;
        last_name: string;
        email: string;
        profile_picture_url?: string;
        account_type: string;
        profile?: {
            institution_name?: string;
            field_of_study?: string;
        };
    };
    request_id: string;
    requested_at: Date;
}
interface CreatorData {
    first_name: string;
    email: string;
}
interface ApprovedMemberData {
    first_name: string;
    email: string;
}
export declare class ApproveUserRequestToJoinCommunityTemplate {
    static getJoinRequestNotification(requestData: JoinRequestData, creatorData: CreatorData): string;
    static getMembershipApprovedTemplate(communityData: {
        name: string;
        description: string;
        community_id: string;
        cover_image_url?: string;
    }, memberData: ApprovedMemberData): string;
}
export {};
