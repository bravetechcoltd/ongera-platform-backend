import { Router } from "express";
import { MonthlyStarTrackerController } from "../controllers/MonthlyStarTrackerController";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import upload from "../helpers/multer";

const router = Router();

// GET: Top performers across all communities (current month)
router.get(
  "/best-performer/all-communities",
  authenticate,
  MonthlyStarTrackerController.getBestPerformerAllCommunities
);

// GET: Top performers in one specific community (current month)
router.get(
  "/best-performer/community/:communityId",
  authenticate,
  MonthlyStarTrackerController.getBestPerformerOneCommunity
);

// POST: Admin approves and sets monthly star (with badge upload)
router.post(
  "/approve-best-performer",
  authenticate,
  requireAdmin,
  upload.single("badge_image"),
  MonthlyStarTrackerController.approveBestPerformer
);

router.get(
  "/approved-stars",
  authenticate,
  MonthlyStarTrackerController.getApprovedStars
);

export default router;
