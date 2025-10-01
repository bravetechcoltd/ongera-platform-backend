interface CommunityNotificationData {
    name: string;
    description: string;
    category: string;
    community_type: string;
    cover_image_url?: string;
    creator: {
        first_name: string;
        last_name: string;
    };
    community_id: string;
    created_at: Date;
}
interface ProjectNotificationData {
    title: string;
    abstract: string;
    research_type: string;
    author: {
        first_name: string;
        last_name: string;
    };
    community: {
        name: string;
    };
    project_id: string;
    created_at: Date;
}
interface EventNotificationData {
    title: string;
    description: string;
    event_type: string;
    event_mode: string;
    start_datetime: Date;
    community: {
        name: string;
    };
    event_id: string;
}
export declare class SubscribeEmailTemplate {
    /**
     * Email Template - New Community Created
     */
    static getNewCommunityNotification(communityData: CommunityNotificationData, subscriberEmail: string): string;
    /**
     * Email Template - New Research Project Created
     */
    static getNewProjectNotification(projectData: ProjectNotificationData, subscriberEmail: string): string;
    /**
     * Email Template - New Event Created
     */
    static getNewEventNotification(eventData: EventNotificationData, subscriberEmail: string): string;
}
export {};
