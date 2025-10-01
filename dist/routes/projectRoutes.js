"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ResearchProjectController_1 = require("../controllers/ResearchProjectController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = require("../helpers/multer");
const router = (0, express_1.Router)();
// ==================== ORIGINAL ROUTES (100% MAINTAINED) ====================
router.post("/", authMiddleware_1.authenticate, multer_1.uploadResearchFiles, multer_1.handleMulterError, ResearchProjectController_1.ResearchProjectController.createProject);
router.get("/my-projects", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.getUserProjects);
router.get("/", ResearchProjectController_1.ResearchProjectController.getAllProjects);
router.get("/:id", ResearchProjectController_1.ResearchProjectController.getProjectById);
// Like and Comment routes
router.post("/:id/like", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.likeProject);
router.post("/:id/comment", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.commentOnProject);
router.put("/:id", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.updateProject);
router.delete("/:id", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.deleteProject);
router.patch("/:id/status", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.updateProjectStatus);
// ==================== NEW: ADMIN MANAGEMENT ROUTES ====================
// Get all projects for admin management
router.get("/admin/all", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.getAllProjectsForAdmin);
// Activate/Deactivate project (Admin only)
router.patch("/admin/:id/status", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.activateDeactivateProject);
// Delete project by admin
router.delete("/admin/:id", authMiddleware_1.authenticate, ResearchProjectController_1.ResearchProjectController.deleteProjectByAdmin);
exports.default = router;
