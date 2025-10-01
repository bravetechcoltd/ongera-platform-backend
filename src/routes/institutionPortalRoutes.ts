import { Router } from "express";
import { InstitutionPortalController } from "../controllers/InstitutionPortalController";
import { authenticate } from "../middlewares/authMiddleware";
import { body } from "express-validator";

const router = Router();

/**
 * GET /api/institution-portal/overview
 * Get institution dashboard overview
 * Access: Institution accounts only
 */
router.get(
  "/overview",
  authenticate,
  InstitutionPortalController.getInstitutionOverview
);

/**
 * GET /api/institution-portal/members
 * Get all members (instructors + students) of institution
 * Access: Institution accounts only
 */
router.get(
  "/members",
  authenticate,
  InstitutionPortalController.getInstitutionMembers
);

/**
 * GET /api/institution-portal/instructor/students
 * Get instructor's assigned students
 * Access: Instructor accounts only
 */
router.get(
  "/instructor/students",
  authenticate,
  InstitutionPortalController.getInstructorStudents
);

/**
 * GET /api/institution-portal/instructor/pending-projects
 * Get projects pending review for instructor
 * Access: Instructor accounts only
 */
router.get(
  "/instructor/pending-projects",
  authenticate,
  InstitutionPortalController.getPendingProjectsForInstructor
);

/**
 * POST /api/institution-portal/instructor/projects/:projectId/approve
 * Approve a project
 * Access: Assigned instructor only
 */
router.post(
  "/instructor/projects/:projectId/approve",
  authenticate,
  [body("feedback").optional().isString()],
  InstitutionPortalController.approveProject
);

/**
 * POST /api/institution-portal/instructor/projects/:projectId/reject
 * Reject a project
 * Access: Assigned instructor only
 */
router.post(
  "/instructor/projects/:projectId/reject",
  authenticate,
  [
    body("feedback").notEmpty().withMessage("Feedback is required"),
    body("feedback").isLength({ min: 20 }).withMessage("Feedback must be at least 20 characters")
  ],
  InstitutionPortalController.rejectProject
);

/**
 * POST /api/institution-portal/instructor/projects/:projectId/return
 * Return project for revision
 * Access: Assigned instructor only
 */
router.post(
  "/instructor/projects/:projectId/return",
  authenticate,
  [
    body("feedback").notEmpty().withMessage("Feedback is required"),
    body("feedback").isLength({ min: 20 }).withMessage("Feedback must be at least 20 characters")
  ],
  InstitutionPortalController.returnProject
);

export default router;