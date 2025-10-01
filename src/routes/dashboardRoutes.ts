import { Router } from "express";
import { DashboardSummaryController } from "../controllers/DashboardSummaryController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

/**
 * GET /api/dashboard/summary
 * Fetch comprehensive dashboard summary for authenticated user
 * Access: Authenticated users only
 */
router.get(
  "/summary",
  authenticate,
  DashboardSummaryController.getDashboardSummary
);

export default router;

