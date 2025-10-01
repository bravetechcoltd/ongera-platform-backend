"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementController = void 0;
const Like_1 = require("../database/models/Like");
const Comment_1 = require("../database/models/Comment");
const Bookmark_1 = require("../database/models/Bookmark");
const db_1 = __importDefault(require("../database/db"));
class EngagementController {
    static async toggleLike(req, res) {
        try {
            const userId = req.user.userId;
            const { content_type, content_id } = req.body;
            const likeRepo = db_1.default.getRepository(Like_1.Like);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to toggle like",
                error: error.message
            });
        }
    }
    static async createComment(req, res) {
        try {
            const userId = req.user.userId;
            const { content_type, content_id, comment_text, parent_comment_id } = req.body;
            const commentRepo = db_1.default.getRepository(Comment_1.Comment);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to create comment",
                error: error.message
            });
        }
    }
    static async getComments(req, res) {
        try {
            const { content_type, content_id } = req.query;
            const commentRepo = db_1.default.getRepository(Comment_1.Comment);
            const comments = await commentRepo.find({
                where: {
                    content_type: content_type,
                    content_id: content_id,
                    parent_comment: null,
                },
                relations: ["author", "replies", "replies.author"],
                order: { created_at: "DESC" },
            });
            res.json({
                success: true,
                data: { comments },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch comments",
                error: error.message
            });
        }
    }
    static async toggleBookmark(req, res) {
        try {
            const userId = req.user.userId;
            const { content_type, content_id } = req.body;
            const bookmarkRepo = db_1.default.getRepository(Bookmark_1.Bookmark);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to toggle bookmark",
                error: error.message
            });
        }
    }
    static async getUserBookmarks(req, res) {
        try {
            const userId = req.user.userId;
            const bookmarkRepo = db_1.default.getRepository(Bookmark_1.Bookmark);
            const bookmarks = await bookmarkRepo.find({
                where: { user: { id: userId } },
                order: { created_at: "DESC" },
            });
            res.json({
                success: true,
                data: { bookmarks },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch bookmarks",
                error: error.message
            });
        }
    }
}
exports.EngagementController = EngagementController;
