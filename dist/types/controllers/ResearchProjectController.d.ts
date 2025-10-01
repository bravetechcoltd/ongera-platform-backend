import { Request, Response } from "express";
export declare class ResearchProjectController {
    static searchProjects(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllProjects(req: Request, res: Response): Promise<void>;
    static likeProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static commentOnProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProjectStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllProjectsForAdmin(req: Request, res: Response): Promise<void>;
    static activateDeactivateProject(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteProjectByAdmin(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getUserProjects(req: Request, res: Response): Promise<void>;
    static getProjectById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getProjectsSeekingCollaborators(req: Request, res: Response): Promise<void>;
    static getProjectCollaborators(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static removeCollaborator(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
