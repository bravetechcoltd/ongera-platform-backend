import { Request, Response } from "express";
export declare class MonthlyStarTrackerController {
    /**
     * Helper: Check if date is in current month
     */
    private static isInCurrentMonth;
    /**
     * Helper: Calculate user score for a specific month
     */
    private static calculateUserScore;
    /**
     * GET /api/tracker/best-performer/all-communities
     */
    static getBestPerformerAllCommunities(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/tracker/best-performer/community/:communityId
     */
    static getBestPerformerOneCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * GET /api/tracker/approved-stars
     * Get all approved monthly stars
     */
    static getApprovedStars(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/tracker/approve-best-performer
     */
    static approveBestPerformer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
