import { Request, Response } from "express";
export declare class CommunityController {
    static logRoute(routeName: string, req: Request): void;
    static searchCommunities(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createCommunityPost(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getCommunityPosts(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static approveCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static rejectCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllCommunitiesForAdmin(req: Request, res: Response): Promise<void>;
    static getCommunityById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getPendingCommunities(req: Request, res: Response): Promise<void>;
    static deleteCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static leaveCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createPost(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getSuggestedCommunities(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getCommunityMembers(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static activateDeactivateCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static requestToJoinCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getCommunityJoinRequests(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getUserPendingRequests(req: Request, res: Response): Promise<void>;
    static joinCommunity(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static approveJoinRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static rejectJoinRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllCommunities(req: Request, res: Response): Promise<void>;
    static getUserCommunities(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
