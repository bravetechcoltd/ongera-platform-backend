import { Request, Response } from "express";
export declare class QAController {
    static createThread(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllThreads(req: Request, res: Response): Promise<void>;
    static getThreadById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateThread(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteThread(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getMyThreads(req: Request, res: Response): Promise<void>;
    static createAnswer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateAnswer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteAnswer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static acceptAnswer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static voteAnswer(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static removeVote(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
