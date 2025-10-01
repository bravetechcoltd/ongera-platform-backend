import { Request, Response, NextFunction } from "express";
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                id: string;
                email: string;
                account_type?: string;
                username?: string;
            };
        }
    }
}
export declare const optionalAuthenticate: (req: Request, res: Response, next: NextFunction) => void;
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
