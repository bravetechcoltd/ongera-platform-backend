import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import { AdminEmailController } from "../controllers/AdminEmailController";

const router = Router();

router.get("/recipient-counts", authenticate, requireAdmin, AdminEmailController.recipientCounts);
router.post("/bulk", authenticate, requireAdmin, AdminEmailController.sendBulkEmail);

export default router;
