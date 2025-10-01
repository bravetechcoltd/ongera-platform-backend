import { Request, Response } from "express";
export declare class AuthController {
    static register(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static checkExistingUser(req: Request, res: Response): Promise<void>;
    static getDatabaseStats(req: Request, res: Response): Promise<void>;
    static login(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static logout(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static verifyEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static resendVerificationOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static requestPasswordChange(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static changePasswordWithOTP(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static googleLogin(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static activateDeactivateUser(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteUser(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllUsers(req: Request, res: Response): Promise<void>;
}
