"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CommunityProjectController_1 = require("../controllers/CommunityProjectController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = require("../helpers/multer");
const router = (0, express_1.Router)();
/**
 * GET /api/communities/:communityId/projects
 * Fetch all projects for a specific community
 * Access: Community members only
 */
router.get("/:communityId/projects", authMiddleware_1.authenticate, CommunityProjectController_1.CommunityProjectController.getCommunityProjects);
/**
 * POST /api/communities/:communityId/projects
 * Create a new project linked to a community
 * Access: Community members only
 */
router.post("/:communityId/projects", authMiddleware_1.authenticate, multer_1.uploadResearchFiles, multer_1.handleMulterError, CommunityProjectController_1.CommunityProjectController.createCommunityProject);
exports.default = router;
