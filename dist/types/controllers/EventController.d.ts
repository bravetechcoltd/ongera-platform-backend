import { Request, Response } from "express";
export declare class EventController {
    static createCommunityEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getCommunityEvents(req: Request, res: Response): Promise<void>;
    static createEvent(req: Request, res: Response): Promise<void>;
    static getAllEvents(req: Request, res: Response): Promise<void>;
    static getMyEvents(req: Request, res: Response): Promise<void>;
    static getEventById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static registerForEvent(req: any, res: any): Promise<any>;
    static unregisterFromEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static addAgendaItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateAgendaItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteAgendaItem(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getEventAttendees(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateAttendeeStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static removeAttendee(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllEventsForAdmin(req: Request, res: Response): Promise<void>;
    /**
     * Activate/Deactivate event (Admin only)
     * Changes event status and sends notification email
     */
    static activateDeactivateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Cancel event permanently (Admin only)
     * Sets status to Cancelled and sends notification
     */
    static cancelEventPermanently(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getLatestUpcomingEvents(req: Request, res: Response): Promise<void>;
    /**
     * Helper function to update event statuses based on dates
     * Call this once if your events have wrong status values
     */
    static updateEventStatuses(req: Request, res: Response): Promise<void>;
    static extendEventDate(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Close Event Early (Admin only)
     */
    static closeEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Postpone Event (Admin only)
     */
    static postponeEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Transfer Event Ownership (Admin only)
     */
    static transferOwnership(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Bulk Attendee Actions (Admin only)
     */
    static bulkAttendeeAction(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Export Attendees (Admin only)
     */
    static exportAttendees(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get Event Statistics (Admin only)
     */
    static getEventStatistics(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Duplicate Event (Admin only)
     */
    static duplicateEvent(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
