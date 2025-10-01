import { Request, Response } from "express";
export declare class EngagementController {
    static toggleLike(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createComment(req: Request, res: Response): Promise<void>;
    static getComments(req: Request, res: Response): Promise<void>;
    static toggleBookmark(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getUserBookmarks(req: Request, res: Response): Promise<void>;
}
