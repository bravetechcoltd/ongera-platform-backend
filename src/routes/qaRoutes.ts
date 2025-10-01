import { Router } from "express";
import { QAController } from "../controllers/QAController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

// Thread routes
router.post("/threads", authenticate, QAController.createThread);
router.get("/threads", QAController.getAllThreads);
router.get("/threads/:id", QAController.getThreadById);
router.put("/threads/:id", authenticate, QAController.updateThread);
router.delete("/threads/:id", authenticate, QAController.deleteThread);
router.get("/my-questions", authenticate, QAController.getMyThreads);

// Answer routes
router.post("/threads/:thread_id/answers", authenticate, QAController.createAnswer);
router.get("/threads/:thread_id/answers", QAController.getThreadById); // Same as get thread
router.put("/answers/:id", authenticate, QAController.updateAnswer);
router.delete("/answers/:id", authenticate, QAController.deleteAnswer);
router.patch("/answers/:id/accept", authenticate, QAController.acceptAnswer);

// Vote routes
router.post("/answers/:id/vote", authenticate, QAController.voteAnswer);
router.delete("/answers/:id/vote", authenticate, QAController.removeVote);

export default router;