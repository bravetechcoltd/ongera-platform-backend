"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardSummaryController_1 = require("../controllers/DashboardSummaryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
/**
 * GET /api/dashboard/summary
 * Fetch comprehensive dashboard summary for authenticated user
 * Access: Authenticated users only
 */
router.get("/summary", authMiddleware_1.authenticate, DashboardSummaryController_1.DashboardSummaryController.getDashboardSummary);
router.get("/activities", authMiddleware_1.authenticate, DashboardSummaryController_1.DashboardSummaryController.getAllActivities);
exports.default = router;
