"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ResearchProjectController_1 = require("../controllers/ResearchProjectController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = require("../helpers/multer");
const router = (0, express_1.Router)();
// ==================== ORIGINAL ROUTES (100% MAINTAINED) ====================
router.get("/search", ResearchProjectController_1.ResearchProjectController.searchProjects);
// Create project with file upload
router.post("/", authMiddleware_1.authenticate, multer_1.uploadResearchFiles, multer_1.handleMulterError, ResearchProjectController_1.ResearchProjectController.createProject);
// Get user's projects
router.get("/my-projects", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.getUserProjects);
// Get all projects (public)
router.get("/", ResearchProjectController_1.ResearchProjectController.getAllProjects);
// Get single project by ID
router.get("/:id", ResearchProjectController_1.ResearchProjectController.getProjectById);
// Like and Comment routes
router.post("/:id/like", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.likeProject);
router.post("/:id/comment", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.commentOnProject);
// ==================== ENHANCED: UPDATE WITH FILE UPLOAD SUPPORT ====================
// Update project - NOW SUPPORTS FILE UPLOADS
router.put("/:id", authMiddleware_1.authenticate, multer_1.uploadResearchFiles, // Add file upload middleware
multer_1.handleMulterError, // Handle upload errors
ResearchProjectController_1.ResearchProjectController.updateProject);
// Delete project
router.delete("/:id", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.deleteProject);
// Update project status
router.patch("/:id/status", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.updateProjectStatus);
// ==================== ADMIN MANAGEMENT ROUTES ====================
// Get all projects for admin management
router.get("/admin/all", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.getAllProjectsForAdmin);
// Activate/Deactivate project (Admin only)
router.patch("/admin/:id/status", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.activateDeactivateProject);
// Delete project by admin
router.delete("/admin/:id", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.deleteProjectByAdmin);
exports.default = router;
