import { Request, Response } from "express";
import { Subscribe } from "../database/models/Subscribe";
export declare class SubscribeController {
    /**
     * Subscribe a new email
     * POST /api/subscribe
     */
    static subscribe(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all active subscribers
     * Internal use only - for sending notifications
     */
    static getAllActiveSubscribers(): Promise<Subscribe[]>;
    /**
     * Get all subscribers with filters
     * GET /api/subscribe/all (Admin only)
     */
    static getAllSubscribers(req: Request, res: Response): Promise<void>;
    /**
     * Unsubscribe
     * POST /api/subscribe/unsubscribe
     */
    static unsubscribe(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update notification preferences
     * PATCH /api/subscribe/preferences
     */
    static updatePreferences(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Send email notifications to subscribers - NEW COMMUNITY
     */
    static notifyNewCommunity(communityData: any): Promise<void>;
    /**
     * Send email notifications to subscribers - NEW PROJECT
     */
    static notifyNewProject(projectData: any): Promise<void>;
    /**
     * Send email notifications to subscribers - NEW EVENT
     */
    static notifyNewEvent(eventData: any): Promise<void>;
}
