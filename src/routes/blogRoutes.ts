import { Router } from "express";
import { BlogController } from "../controllers/BlogController";
import { authenticate } from "../middlewares/authMiddleware";
import upload from "../helpers/multer";

const router = Router();

// Global blog routes
router.post("/", authenticate, upload.single("cover_image"), BlogController.createBlogPost);
router.get("/", BlogController.getAllBlogPosts);

// ✅ NEW: Get single blog by ID
router.get("/:id", BlogController.getBlogById);

// ✅ NEW: Community blog routes
router.get("/communities/:communityId", BlogController.getCommunityBlogs);
router.post("/communities/:communityId", authenticate, upload.single("cover_image"), BlogController.createCommunityBlog);


// Update blog status
router.patch("/:id/status", authenticate, BlogController.updateBlogStatus);

// Update blog
router.put("/:id", authenticate, upload.single("cover_image"), BlogController.updateBlog);

router.patch("/:id/archive", authenticate, BlogController.archiveBlog);
router.delete("/:id", authenticate, BlogController.deleteBlog);


export default router;