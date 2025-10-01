import { Router } from "express";
import { CollaborationController } from "../controllers/CollaborationController";
import { authenticate, optionalAuthenticate } from "../middlewares/authMiddleware";
import { uploadContributionFiles, handleMulterError } from "../helpers/multer";

const router = Router();

// ==================== COLLABORATION REQUEST ROUTES ====================

router.post(
  "/projects/:id/collaboration-request",
  authenticate,
  CollaborationController.requestCollaboration
);

router.get(
  "/projects/:id/collaboration-requests",
  authenticate,
  CollaborationController.getProjectCollaborationRequests
);

router.get(
  "/my-collaboration-requests",
  authenticate,
  CollaborationController.getMyCollaborationRequests
);

router.post(
  "/collaboration-requests/:requestId/approve",
  authenticate,
  CollaborationController.approveCollaborationRequest
);

router.post(
  "/collaboration-requests/:requestId/reject",
  authenticate,
  CollaborationController.rejectCollaborationRequest
);


router.patch(
  "/contributions/:contributionId/approve",
  authenticate,
  CollaborationController.approveContribution
);
// ==================== NEW: PROJECT COLLABORATORS ROUTE ====================

/**
 * Get all collaborators for a project (author + approved collaborators)
 * GET /api/projects/:id/collaborators
 * @requires Authentication (optional - public for viewing)
 */
router.get(
  "/projects/:id/collaborators",
  CollaborationController.getProjectCollaborators
);

/**
 * Remove a collaborator from project (creator only)
 * DELETE /api/projects/:id/collaborators/:userId
 * @requires Authentication
 */
router.delete(
  "/projects/:id/collaborators/:userId",
  authenticate,
  CollaborationController.removeCollaborator
);

// ==================== CONTRIBUTION MANAGEMENT ROUTES ====================

router.get(
  "/my-projects/contributing",
  authenticate,
  CollaborationController.getProjectsUserCanContributeTo
);

router.post(
  "/projects/:id/contributions",
  authenticate,
  uploadContributionFiles,
  handleMulterError,
  CollaborationController.addContribution
);

router.get(
  "/projects/:id/contributions",
  optionalAuthenticate, // <-- Use optional authentication
  CollaborationController.getProjectContributions
);

router.put(
  "/contributions/:contributionId",
  authenticate,
  uploadContributionFiles,
  handleMulterError,
  CollaborationController.updateContribution
);

router.delete(
  "/contributions/:contributionId",
  authenticate,
  CollaborationController.deleteContribution
);

export default router;
