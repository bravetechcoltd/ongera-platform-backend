"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CollaborationController_1 = require("../controllers/CollaborationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = require("../helpers/multer");
const router = (0, express_1.Router)();
// ==================== COLLABORATION REQUEST ROUTES ====================
router.post("/projects/:id/collaboration-request", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.requestCollaboration);
router.get("/projects/:id/collaboration-requests", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.getProjectCollaborationRequests);
router.get("/my-collaboration-requests", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.getMyCollaborationRequests);
router.post("/collaboration-requests/:requestId/approve", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.approveCollaborationRequest);
router.post("/collaboration-requests/:requestId/reject", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.rejectCollaborationRequest);
router.patch("/contributions/:contributionId/approve", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.approveContribution);
// ==================== NEW: PROJECT COLLABORATORS ROUTE ====================
/**
 * Get all collaborators for a project (author + approved collaborators)
 * GET /api/projects/:id/collaborators
 * @requires Authentication (optional - public for viewing)
 */
router.get("/projects/:id/collaborators", CollaborationController_1.CollaborationController.getProjectCollaborators);
/**
 * Remove a collaborator from project (creator only)
 * DELETE /api/projects/:id/collaborators/:userId
 * @requires Authentication
 */
router.delete("/projects/:id/collaborators/:userId", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.removeCollaborator);
// ==================== CONTRIBUTION MANAGEMENT ROUTES ====================
router.get("/my-projects/contributing", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.getProjectsUserCanContributeTo);
router.post("/projects/:id/contributions", authMiddleware_1.authenticate, multer_1.uploadContributionFiles, multer_1.handleMulterError, CollaborationController_1.CollaborationController.addContribution);
router.get("/projects/:id/contributions", authMiddleware_1.optionalAuthenticate, // <-- Use optional authentication
CollaborationController_1.CollaborationController.getProjectContributions);
router.put("/contributions/:contributionId", authMiddleware_1.authenticate, multer_1.uploadContributionFiles, multer_1.handleMulterError, CollaborationController_1.CollaborationController.updateContribution);
router.delete("/contributions/:contributionId", authMiddleware_1.authenticate, CollaborationController_1.CollaborationController.deleteContribution);
exports.default = router;
