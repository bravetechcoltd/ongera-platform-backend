import { Request, Response } from "express";
export declare class ResearchProjectController {
    static createProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllProjects(req: Request, res: Response): Promise<void>;
    static getProjectById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static likeProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static commentOnProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getUserProjects(req: Request, res: Response): Promise<void>;
    static updateProjectStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all research projects for admin management
     * Includes filtering by status, research_type, visibility
     */
    static getAllProjectsForAdmin(req: Request, res: Response): Promise<void>;
    /**
     * Activate/Deactivate research project (Admin only)
     */
    static activateDeactivateProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Delete research project permanently (Admin only)
     */
    static deleteProjectByAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
