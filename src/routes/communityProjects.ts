
import { Router } from "express";
import { CommunityProjectController } from "../controllers/CommunityProjectController";
import { authenticate } from "../middlewares/authMiddleware";
import { uploadResearchFiles, handleMulterError } from "../helpers/multer";

const router = Router();

/**
 * GET /api/communities/:communityId/projects
 * Fetch all projects for a specific community
 * Access: Community members only
 */
router.get(
  "/:communityId/projects",
  authenticate,
  CommunityProjectController.getCommunityProjects
);

/**
 * POST /api/communities/:communityId/projects
 * Create a new project linked to a community
 * Access: Community members only
 */
router.post(
  "/:communityId/projects",
  authenticate,
  uploadResearchFiles,
  handleMulterError,
  CommunityProjectController.createCommunityProject
);

export default router;

