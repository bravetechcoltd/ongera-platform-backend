import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import { AdminInstitutionUsersController } from "../controllers/AdminInstitutionUsersController";

const router = Router();

router.get("/", authenticate, requireAdmin, AdminInstitutionUsersController.list);
router.post(
  "/",
  authenticate,
  requireAdmin,
  AdminInstitutionUsersController.createInstitution
);
router.get(
  "/stats/overview",
  authenticate,
  requireAdmin,
  AdminInstitutionUsersController.statsOverview
);
router.get("/:id", authenticate, requireAdmin, AdminInstitutionUsersController.detail);

router.post(
  "/:id/approve",
  authenticate,
  requireAdmin,
  AdminInstitutionUsersController.approve
);
router.post(
  "/:id/reject",
  authenticate,
  requireAdmin,
  AdminInstitutionUsersController.reject
);
router.patch(
  "/:id/portal-access",
  authenticate,
  requireAdmin,
  AdminInstitutionUsersController.setPortalAccess
);
router.patch(
  "/:id/suspend",
  authenticate,
  requireAdmin,
  AdminInstitutionUsersController.setSuspension
);

export default router;
