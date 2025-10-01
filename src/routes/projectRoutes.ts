import { Router } from "express";
import { ResearchProjectController } from "../controllers/ResearchProjectController";
import { authenticate } from "../middlewares/authMiddleware";
import { uploadResearchFiles, handleMulterError } from "../helpers/multer";

const router = Router();

// ==================== ORIGINAL ROUTES (100% MAINTAINED) ====================
router.get("/search", ResearchProjectController.searchProjects);

// Create project with file upload
router.post(
  "/", 
  authenticate, 
  uploadResearchFiles, 
  handleMulterError,
  ResearchProjectController.createProject
);

// Get user's projects
router.get("/my-projects", authenticate, ResearchProjectController.getUserProjects);

// Get all projects (public)
router.get("/", ResearchProjectController.getAllProjects);

// Get single project by ID
router.get("/:id", ResearchProjectController.getProjectById);

// Like and Comment routes
router.post("/:id/like", authenticate, ResearchProjectController.likeProject);
router.post("/:id/comment", authenticate, ResearchProjectController.commentOnProject);

// ==================== ENHANCED: UPDATE WITH FILE UPLOAD SUPPORT ====================

// Update project - NOW SUPPORTS FILE UPLOADS
router.put(
  "/:id", 
  authenticate, 
  uploadResearchFiles,  // Add file upload middleware
  handleMulterError,    // Handle upload errors
  ResearchProjectController.updateProject
);

// Delete project
router.delete("/:id", authenticate, ResearchProjectController.deleteProject);

// Update project status
router.patch("/:id/status", authenticate, ResearchProjectController.updateProjectStatus);

// ==================== ADMIN MANAGEMENT ROUTES ====================

// Get all projects for admin management
router.get("/admin/all", authenticate, ResearchProjectController.getAllProjectsForAdmin);

// Activate/Deactivate project (Admin only)
router.patch("/admin/:id/status", authenticate, ResearchProjectController.activateDeactivateProject);

// Delete project by admin
router.delete("/admin/:id", authenticate, ResearchProjectController.deleteProjectByAdmin);

export default router;