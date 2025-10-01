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
export declare class AdminEventManagementTemplates {
    /**
     * Template for event date extension
     */
    static getDateExtendedTemplate(event: Event, data: DateExtensionData, recipientType: 'organizer' | 'attendee'): string;
    /**
     * Template for event closure
     */
    static getEventClosedTemplate(event: Event, data: EventCloseData): string;
    static getEventPostponedTemplate(event: Event, data: {
        oldDates: {
            start_datetime: Date;
            end_datetime: Date;
        };
        newDates: {
            start_datetime: Date;
            end_datetime: Date;
        };
        reason: string;
    }, recipientType: 'organizer' | 'attendee'): string;
    /**
     * Get template for ownership transfer notification
     */
    static getOwnershipTransferredTemplate(event: Event, data: {
        oldOrganizer: User;
        newOrganizer: User;
        reason: string;
    }, recipientType: 'old_organizer' | 'new_organizer'): string;
    /**
     * Get template for bulk attendee actions
     */
    static getBulkActionTemplate(event: Event, data: {
        action: 'approve' | 'reject';
        reason?: string;
        user: User;
    }): string;
}
export {};
