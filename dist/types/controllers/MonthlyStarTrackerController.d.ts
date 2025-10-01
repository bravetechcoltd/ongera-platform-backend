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
     * Get top 3 performers across entire platform for current month
     */
    static getBestPerformerAllCommunities(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/tracker/best-performer/community/:communityId
     * Get top 3 performers in specific community for current month
     */
    static getBestPerformerOneCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * POST /api/tracker/approve-best-performer
     * Admin approves monthly star and sends congratulations email
     */
    static approveBestPerformer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
