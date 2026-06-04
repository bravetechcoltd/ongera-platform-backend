import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import { ExcellenceAdminController } from "../controllers/ExcellenceAdminController";

const router = Router();

router.get("/stats/overview", authenticate, requireAdmin, ExcellenceAdminController.statsOverview);
router.get("/candidates", authenticate, requireAdmin, ExcellenceAdminController.listCandidates);
router.get("/institutions", authenticate, requireAdmin, ExcellenceAdminController.listInstitutions);

router.get("/members", authenticate, requireAdmin, ExcellenceAdminController.listMembers);
router.post("/members", authenticate, requireAdmin, ExcellenceAdminController.enrollMember);
router.patch("/members/:id", authenticate, requireAdmin, ExcellenceAdminController.updateMember);
router.post("/members/:id/link-institutions", authenticate, requireAdmin, ExcellenceAdminController.linkInstitutions);
router.delete("/members/:id", authenticate, requireAdmin, ExcellenceAdminController.removeMember);

router.get("/subscriptions", authenticate, requireAdmin, ExcellenceAdminController.listSubscriptions);
router.patch("/subscriptions/:id", authenticate, requireAdmin, ExcellenceAdminController.updateSubscription);

router.get("/payouts", authenticate, requireAdmin, ExcellenceAdminController.listPayouts);
router.post("/payouts/:id/confirm", authenticate, requireAdmin, ExcellenceAdminController.confirmPayout);

export default router;
