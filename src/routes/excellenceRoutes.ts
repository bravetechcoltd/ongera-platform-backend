import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { ExcellenceController } from "../controllers/ExcellenceController";
import { uploadBountyFiles, handleMulterError } from "../helpers/multer";

const router = Router();

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
