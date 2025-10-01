import { Request, Response } from "express";
export declare class HomePageController {
    /**
     * Get homepage summary statistics
     * Returns counts for projects, researchers, communities, and events
     */
    static getHomePageSummary(req: Request, res: Response): Promise<void>;
    /**
     * Get featured content for homepage
     * Returns top 3 projects, events, and communities
     */
    static getHomePageContent(req: Request, res: Response): Promise<void>;
}
