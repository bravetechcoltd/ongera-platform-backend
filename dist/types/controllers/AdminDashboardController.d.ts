import { Request, Response } from "express";
export declare class AdminDashboardController {
    /**
     * Get comprehensive admin dashboard summary
     * Returns overview statistics across all platform activities
     */
    static getAdminDashboardSummary(req: Request, res: Response): Promise<void>;
    /**
     * Get detailed analytics for specific date range
     * Allows admins to analyze trends over custom periods
     */
    static getDetailedAnalytics(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
