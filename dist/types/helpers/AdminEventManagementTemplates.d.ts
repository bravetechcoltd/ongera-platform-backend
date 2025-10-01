import { Event } from "../database/models/Event";
import { User } from "../database/models/User";
interface DateExtensionData {
    start_datetime: Date;
    end_datetime: Date;
    reason: string;
}
interface EventCloseData {
    reason: string;
    send_certificates: boolean;
}
interface PostponementData {
    oldDates: {
        start_datetime: Date;
        end_datetime: Date;
    };
    newDates: {
        start_datetime: Date;
        end_datetime: Date;
    };
    reason: string;
}
interface OwnershipTransferData {
    oldOrganizer: User;
    newOrganizer: User;
    reason: string;
}
interface BulkActionData {
    action: 'approve' | 'reject';
    reason?: string;
    user: User;
}
export declare class AdminEventManagementTemplates {
    /**
     * Template for event date extension
     */
    static getDateExtendedTemplate(event: Event, data: DateExtensionData, recipientType: 'organizer' | 'attendee'): string;
    /**
     * Template for event closure
     */
    static getEventClosedTemplate(event: Event, data: EventCloseData): string;
    static getEventPostponedTemplate(event: Event, data: PostponementData, recipientType: 'organizer' | 'attendee'): string;
    static getOwnershipTransferredTemplate(event: Event, data: OwnershipTransferData, recipientType: 'old_organizer' | 'new_organizer'): string;
    static getBulkActionTemplate(event: Event, data: BulkActionData): string;
}
export {};
