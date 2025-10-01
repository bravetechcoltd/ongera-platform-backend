import { Router } from "express";
import { InstitutionResearchController } from "../controllers/InstitutionResearchController";
import { InstitutionProjectCommentController } from "../controllers/InstitutionProjectCommentController";
import { authenticate } from "../middlewares/authMiddleware";
import { uploadResearchFiles } from "../helpers/multer";

const router = Router();

// Projects CRUD
router.post("/", authenticate, uploadResearchFiles, InstitutionResearchController.createProject);
router.get("/", authenticate, InstitutionResearchController.listProjects);
router.get("/:id", authenticate, InstitutionResearchController.getProject);
router.put("/:id", authenticate, uploadResearchFiles, InstitutionResearchController.updateProject);

// Submit & review
router.post("/:id/submit", authenticate, InstitutionResearchController.submitProject);
router.post("/:id/supervisor-review", authenticate, InstitutionResearchController.supervisorReview);
router.post("/:id/instructor-review", authenticate, InstitutionResearchController.instructorReview);
router.post("/:id/publish", authenticate, InstitutionResearchController.publishProject);

// Activity
router.get("/:id/activity", authenticate, InstitutionResearchController.getActivity);

// Comments
router.post("/:id/comments", authenticate, InstitutionProjectCommentController.create);
router.get("/:id/comments", authenticate, InstitutionProjectCommentController.list);
router.patch("/:id/comments/:commentId/resolve", authenticate, InstitutionProjectCommentController.resolve);

export default router;
