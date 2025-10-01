import { Request, Response } from "express";
export declare class BlogController {
    static createBlogPost(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getAllBlogPosts(req: Request, res: Response): Promise<void>;
    static getCommunityBlogs(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getBlogById(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static createCommunityBlog(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateBlogStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static updateBlog(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static archiveBlog(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static deleteBlog(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
