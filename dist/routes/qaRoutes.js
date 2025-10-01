"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const QAController_1 = require("../controllers/QAController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Thread routes
router.post("/threads", authMiddleware_1.authenticate, QAController_1.QAController.createThread);
router.get("/threads", QAController_1.QAController.getAllThreads);
router.get("/threads/:id", QAController_1.QAController.getThreadById);
router.put("/threads/:id", authMiddleware_1.authenticate, QAController_1.QAController.updateThread);
router.delete("/threads/:id", authMiddleware_1.authenticate, QAController_1.QAController.deleteThread);
router.get("/my-questions", authMiddleware_1.authenticate, QAController_1.QAController.getMyThreads);
// Answer routes
router.post("/threads/:thread_id/answers", authMiddleware_1.authenticate, QAController_1.QAController.createAnswer);
router.get("/threads/:thread_id/answers", QAController_1.QAController.getThreadById); // Same as get thread
router.put("/answers/:id", authMiddleware_1.authenticate, QAController_1.QAController.updateAnswer);
router.delete("/answers/:id", authMiddleware_1.authenticate, QAController_1.QAController.deleteAnswer);
router.patch("/answers/:id/accept", authMiddleware_1.authenticate, QAController_1.QAController.acceptAnswer);
// Vote routes
router.post("/answers/:id/vote", authMiddleware_1.authenticate, QAController_1.QAController.voteAnswer);
router.delete("/answers/:id/vote", authMiddleware_1.authenticate, QAController_1.QAController.removeVote);
exports.default = router;
