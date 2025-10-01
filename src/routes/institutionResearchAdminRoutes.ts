import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import { InstitutionResearchAdminController } from "../controllers/InstitutionResearchAdminController";
import { IndustrialSupervisorController } from "../controllers/IndustrialSupervisorController";

const router = Router();

router.get("/projects", authenticate, requireAdmin, InstitutionResearchAdminController.listAllProjects);
router.get("/projects/:id", authenticate, requireAdmin, InstitutionResearchAdminController.getProject);
router.get("/supervisors", authenticate, requireAdmin, IndustrialSupervisorController.listAllAdmin);
router.delete(
  "/supervisors/:supervisorId",
  authenticate,
  requireAdmin,
  InstitutionResearchAdminController.revokeSupervisor
);

export default router;
