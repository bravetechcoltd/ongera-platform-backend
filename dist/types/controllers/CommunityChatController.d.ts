import type { Request, Response, NextFunction } from "express";
interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        account_type?: any;
        id?: string;
        username?: string;
    };
}
export declare class CommunityChatController {
    static getCommunityMessages: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    static getCommunityMembersForChat: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    static uploadChatFile: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    static getMessage: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    static getOnlineMembers: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
    private static groupMessagesByDate;
    static getDirectConversation: (req: AuthenticatedRequest, res: Response) => Promise<void>;
}
export {};
