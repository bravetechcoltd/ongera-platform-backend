import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { ExcellenceController } from "../controllers/ExcellenceController";
import { AssessmentController } from "../controllers/AssessmentController";
import { uploadBountyFiles, uploadAssessmentFiles, handleMulterError } from "../helpers/multer";

const router = Router();

// ---- Official Talent Assessments (institution-prepared, timed) ----
// Talent (member) side
router.get("/my-assessments", authenticate, AssessmentController.talentAssessments);
router.get("/my-assessments/:pid", authenticate, AssessmentController.getTalentAssessment);
router.post("/my-assessments/:pid/start", authenticate, AssessmentController.startAssessment);
router.patch("/my-assessments/:pid/save", authenticate, AssessmentController.saveDraft);
router.post(
  "/my-assessments/:pid/submit",
  authenticate,
  uploadAssessmentFiles,
  handleMulterError,
  AssessmentController.submitAssessment
);
router.post("/my-assessments/:pid/offer-response", authenticate, AssessmentController.respondOffer);

// Institution side
router.get("/assessments", authenticate, AssessmentController.myAssessments);
router.post("/assessments", authenticate, AssessmentController.createAssessment);
// Static sub-path must be declared before "/assessments/:id".
router.get("/assessments/pending-grading", authenticate, AssessmentController.pendingGrading);
router.get("/assessments/:id", authenticate, AssessmentController.getAssessment);
router.patch("/assessments/:id", authenticate, AssessmentController.updateAssessment);
router.delete("/assessments/:id", authenticate, AssessmentController.deleteAssessment);
router.post("/assessments/:id/invite", authenticate, AssessmentController.inviteTalent);
router.post("/assessments/:id/publish", authenticate, AssessmentController.publishAssessment);
router.post("/assessments/:id/close", authenticate, AssessmentController.closeAssessment);
router.patch("/assessments/:id/participants/:pid/grade", authenticate, AssessmentController.gradeParticipant);
router.patch("/assessments/:id/participants/:pid/grade-answers", authenticate, AssessmentController.gradeAnswers);
router.post("/assessments/:id/participants/:pid/offer", authenticate, AssessmentController.offerParticipant);
router.post("/assessments/:id/participants/:pid/reject", authenticate, AssessmentController.rejectParticipant);

// ---- Member ----
router.get("/me", authenticate, ExcellenceController.me);
router.get("/bounties", authenticate, ExcellenceController.listOpenBounties);
router.get("/submissions", authenticate, ExcellenceController.mySubmissions);

// ---- Company (Institution) ----
router.get("/subscription", authenticate, ExcellenceController.mySubscription);
router.post("/subscription", authenticate, ExcellenceController.requestSubscription);
router.get("/talent", authenticate, ExcellenceController.listTalent);
router.get("/talent/:userId", authenticate, ExcellenceController.getTalent);
router.get("/my-bounties", authenticate, ExcellenceController.myBounties);
router.post("/bounties", authenticate, ExcellenceController.createBounty);

// ---- Shared / parameterised (declare after static paths) ----
router.get("/bounties/:id", authenticate, ExcellenceController.getBounty);
router.get("/bounties/:id/activity", authenticate, ExcellenceController.bountyActivity);
router.get("/bounties/:id/submissions", authenticate, ExcellenceController.listSubmissionsForBounty);
router.post(
  "/bounties/:id/submissions",
  authenticate,
  uploadBountyFiles,
  handleMulterError,
  ExcellenceController.submitSolution
);
router.patch("/submissions/:id", authenticate, ExcellenceController.reviewSubmission);

export default router;
