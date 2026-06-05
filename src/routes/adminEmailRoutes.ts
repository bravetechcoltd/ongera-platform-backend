import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import { AdminEmailController } from "../controllers/AdminEmailController";

const router = Router();

// Composer helpers
router.get("/recipient-counts", authenticate, requireAdmin, AdminEmailController.recipientCounts);
router.get("/recipients", authenticate, requireAdmin, AdminEmailController.listRecipients);

// Send (async, live progress over sockets)
router.post("/bulk", authenticate, requireAdmin, AdminEmailController.sendBulkEmail);

// History + management
router.get("/campaigns", authenticate, requireAdmin, AdminEmailController.listCampaigns);
router.get("/campaigns/:id", authenticate, requireAdmin, AdminEmailController.getCampaign);
router.get("/campaigns/:id/progress", authenticate, requireAdmin, AdminEmailController.getCampaignProgress);
router.post("/campaigns/:id/resend-failed", authenticate, requireAdmin, AdminEmailController.resendFailed);
router.delete("/campaigns/:id", authenticate, requireAdmin, AdminEmailController.deleteCampaign);

export default router;
