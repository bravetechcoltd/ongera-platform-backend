"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BlogController_1 = require("../controllers/BlogController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("../helpers/multer"));
const router = (0, express_1.Router)();
// Global blog routes
router.post("/", authMiddleware_1.authenticate, multer_1.default.single("cover_image"), BlogController_1.BlogController.createBlogPost);
router.get("/", BlogController_1.BlogController.getAllBlogPosts);
// ✅ NEW: Get single blog by ID
router.get("/:id", BlogController_1.BlogController.getBlogById);
// ✅ NEW: Community blog routes
router.get("/communities/:communityId", BlogController_1.BlogController.getCommunityBlogs);
router.post("/communities/:communityId", authMiddleware_1.authenticate, multer_1.default.single("cover_image"), BlogController_1.BlogController.createCommunityBlog);
// Update blog status
router.patch("/:id/status", authMiddleware_1.authenticate, BlogController_1.BlogController.updateBlogStatus);
// Update blog
router.put("/:id", authMiddleware_1.authenticate, multer_1.default.single("cover_image"), BlogController_1.BlogController.updateBlog);
router.patch("/:id/archive", authMiddleware_1.authenticate, BlogController_1.BlogController.archiveBlog);
router.delete("/:id", authMiddleware_1.authenticate, BlogController_1.BlogController.deleteBlog);
exports.default = router;
