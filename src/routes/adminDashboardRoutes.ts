import { Router } from "express";
import { AdminDashboardController } from "../controllers/AdminDashboardController";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";

const router = Router();


router.get(
  "/summary",
  authenticate,
  requireAdmin,
  AdminDashboardController.getAdminDashboardSummary
);


router.get(
  "/analytics",
  authenticate,
  requireAdmin,
  AdminDashboardController.getDetailedAnalytics
);



export default router;