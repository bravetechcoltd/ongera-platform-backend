// @ts-nocheck

import { Request, Response } from "express";
import { Like } from "../database/models/Like";
import { Comment } from "../database/models/Comment";
import { Bookmark } from "../database/models/Bookmark";
import dbConnection from '../database/db';

export class EngagementController {
  static async toggleLike(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { content_type, content_id } = req.body;

      const likeRepo = dbConnection.getRepository(Like);

      const existingLike = await likeRepo.findOne({
        where: {
          user: { id: userId },
          content_type,
          content_id,
        },
      });

      if (existingLike) {
        await likeRepo.remove(existingLike);
        return res.json({
          success: true,
          message: "Unliked successfully",
          data: { liked: false },
        });
      }

      const like = likeRepo.create({
        user: { id: userId },
        content_type,
        content_id,
      });

      await likeRepo.save(like);

      res.json({
        success: true,
        message: "Liked successfully",
        data: { liked: true },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to toggle like", 
        error: error.message 
      });
    }
  }

  static async createComment(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { content_type, content_id, comment_text, parent_comment_id } = req.body;

      const commentRepo = dbConnection.getRepository(Comment);

      const comment = commentRepo.create({
        author: { id: userId },
        content_type,
        content_id,
        comment_text,
        parent_comment: parent_comment_id ? { id: parent_comment_id } : null,
      });

      await commentRepo.save(comment);

      res.status(201).json({
        success: true,
        message: "Comment created successfully",
        data: { comment },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to create comment", 
        error: error.message 
      });
    }
  }

  static async getComments(req: Request, res: Response) {
    try {
      const { content_type, content_id } = req.query;

      const commentRepo = dbConnection.getRepository(Comment);
      const comments = await commentRepo.find({
        where: {
          content_type: content_type as any,
          content_id: content_id as string,
          parent_comment: null,
        },
        relations: ["author", "replies", "replies.author"],
        order: { created_at: "DESC" },
      });

      res.json({
        success: true,
        data: { comments },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch comments", 
        error: error.message 
      });
    }
  }

  static async toggleBookmark(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { content_type, content_id } = req.body;

      const bookmarkRepo = dbConnection.getRepository(Bookmark);

      const existingBookmark = await bookmarkRepo.findOne({
        where: {
          user: { id: userId },
          content_type,
          content_id,
        },
      });

      if (existingBookmark) {
        await bookmarkRepo.remove(existingBookmark);
        return res.json({
          success: true,
          message: "Bookmark removed",
          data: { bookmarked: false },
        });
      }

      const bookmark = bookmarkRepo.create({
        user: { id: userId },
        content_type,
        content_id,
      });

      await bookmarkRepo.save(bookmark);

      res.json({
        success: true,
        message: "Bookmarked successfully",
        data: { bookmarked: true },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to toggle bookmark", 
        error: error.message 
      });
    }
  }

  static async getUserBookmarks(req: Request, res: Response) {
    try {
      const userId = req.user.userId;

      const bookmarkRepo = dbConnection.getRepository(Bookmark);
      const bookmarks = await bookmarkRepo.find({
        where: { user: { id: userId } },
        order: { created_at: "DESC" },
      });

      res.json({
        success: true,
        data: { bookmarks },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch bookmarks", 
        error: error.message 
      });
    }
  }
}