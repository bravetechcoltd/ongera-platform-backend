import { Router } from "express";
import { ResearchProjectController } from "../controllers/ResearchProjectController";
import { authenticate } from "../middlewares/authMiddleware";
import { uploadResearchFiles, handleMulterError } from "../helpers/multer";

const router = Router();

// ==================== ORIGINAL ROUTES (100% MAINTAINED) ====================

router.post(
  "/", 
  authenticate, 
  uploadResearchFiles, 
  handleMulterError,
  ResearchProjectController.createProject
);

router.get("/my-projects", authenticate, ResearchProjectController.getUserProjects);
router.get("/", ResearchProjectController.getAllProjects);
router.get("/:id", ResearchProjectController.getProjectById);

// Like and Comment routes
router.post("/:id/like", authenticate, ResearchProjectController.likeProject);
router.post("/:id/comment", authenticate, ResearchProjectController.commentOnProject);

router.put("/:id", authenticate, ResearchProjectController.updateProject);
router.delete("/:id", authenticate, ResearchProjectController.deleteProject);
router.patch("/:id/status", authenticate, ResearchProjectController.updateProjectStatus);

// ==================== NEW: ADMIN MANAGEMENT ROUTES ====================

// Get all projects for admin management
router.get("/admin/all", authenticate, ResearchProjectController.getAllProjectsForAdmin);

// Activate/Deactivate project (Admin only)
router.patch("/admin/:id/status", authenticate, ResearchProjectController.activateDeactivateProject);

// Delete project by admin
router.delete("/admin/:id", authenticate, ResearchProjectController.deleteProjectByAdmin);

export default router;