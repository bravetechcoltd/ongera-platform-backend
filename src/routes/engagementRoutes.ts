import { Router } from "express";
import { EngagementController } from "../controllers/EngagementController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.post("/like", authenticate, EngagementController.toggleLike);
router.post("/comment", authenticate, EngagementController.createComment);
router.get("/comments", EngagementController.getComments);
router.post("/bookmark", authenticate, EngagementController.toggleBookmark);
router.get("/bookmarks", authenticate, EngagementController.getUserBookmarks);

export default router;
