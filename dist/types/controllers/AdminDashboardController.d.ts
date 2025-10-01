import { Request, Response } from "express";
export declare class AdminDashboardController {
    /**
     * Get comprehensive admin dashboard summary with enhanced community and project analytics
     */
    static getAdminDashboardSummary(req: Request, res: Response): Promise<void>;
    /**
     * Get detailed analytics for specific date range
     */
    static getDetailedAnalytics(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
