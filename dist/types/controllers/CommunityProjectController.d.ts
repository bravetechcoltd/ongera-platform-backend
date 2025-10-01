import { Request, Response } from "express";
export declare class CommunityProjectController {
    static getCommunityProjects(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createCommunityProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
