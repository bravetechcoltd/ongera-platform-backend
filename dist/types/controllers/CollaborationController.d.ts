import { Request, Response } from "express";
export declare class CollaborationController {
    /**
     * Create a collaboration request to contribute to a project
     * POST /api/projects/:id/collaboration-request
     * ENHANCEMENT: Now updates collaboration_info with pending request
     */
    static requestCollaboration(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all collaboration requests for a specific project (creator only)
     * GET /api/projects/:id/collaboration-requests
     */
    static getProjectCollaborationRequests(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Approve a collaboration request (project creator only)
     * POST /api/collaboration-requests/:requestId/approve
     * ENHANCEMENT: Now updates collaboration_info with approved status
     */
    static approveCollaborationRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Reject a collaboration request (project creator only)
     * POST /api/collaboration-requests/:requestId/reject
     * ENHANCEMENT: Now updates collaboration_info with rejected status
     */
    static rejectCollaborationRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all collaboration requests made by the current user
     * GET /api/my-collaboration-requests
     */
    static getMyCollaborationRequests(req: Request, res: Response): Promise<void>;
    /**
     * Get all projects the user is approved to contribute to
     * GET /api/my-projects/contributing
     */
    static getProjectsUserCanContributeTo(req: Request, res: Response): Promise<void>;
    /**
     * Add a contribution to a research project
     * POST /api/projects/:id/contributions
     */
    /**
     * Add a contribution to a research project
     * POST /api/projects/:id/contributions
     */
    static addContribution(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getProjectContributions(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateContribution(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Delete a contribution (contributor or project owner)
     * DELETE /api/contributions/:contributionId
     */
    static deleteContribution(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all collaborators for a project (author + approved collaborators)
     * GET /api/projects/:id/collaborators
     */
    static getProjectCollaborators(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Remove a collaborator from project (creator only)
     * DELETE /api/projects/:id/collaborators/:userId
     * ENHANCEMENT: Now also removes from collaboration_info
     */
    static removeCollaborator(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Approve a project contribution (project owner only)
     * PATCH /api/contributions/:contributionId/approve
     */
    static approveContribution(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
