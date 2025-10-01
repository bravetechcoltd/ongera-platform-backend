"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MonthlyStarTrackerController_1 = require("../controllers/MonthlyStarTrackerController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("../helpers/multer"));
const router = (0, express_1.Router)();
// GET: Top performers across all communities (current month)
router.get("/best-performer/all-communities", authMiddleware_1.authenticate, MonthlyStarTrackerController_1.MonthlyStarTrackerController.getBestPerformerAllCommunities);
// GET: Top performers in one specific community (current month)
router.get("/best-performer/community/:communityId", authMiddleware_1.authenticate, MonthlyStarTrackerController_1.MonthlyStarTrackerController.getBestPerformerOneCommunity);
// POST: Admin approves and sets monthly star (with badge upload)
router.post("/approve-best-performer", authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, multer_1.default.single("badge_image"), MonthlyStarTrackerController_1.MonthlyStarTrackerController.approveBestPerformer);
router.get("/approved-stars", authMiddleware_1.authenticate, MonthlyStarTrackerController_1.MonthlyStarTrackerController.getApprovedStars);
exports.default = router;
