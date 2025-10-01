interface EventData {
    title: string;
    description: string;
    event_type: string;
    event_mode: string;
    start_datetime: Date;
    end_datetime: Date;
    timezone: string;
    location_address?: string;
    online_meeting_url?: string;
    cover_image_url?: string;
    is_free: boolean;
    price_amount?: number;
    max_attendees?: number;
    requires_approval: boolean;
    organizer: {
        first_name: string;
        last_name: string;
        profile?: {
            institution_name?: string;
        };
    };
    community: {
        name: string;
        member_count: number;
    };
    event_id: string;
}
interface MemberData {
    first_name: string;
}
export declare class NewsEventCreatedTemplate {
    static getEventCreatedTemplate(eventData: EventData, memberData: MemberData): string;
}
export {};
