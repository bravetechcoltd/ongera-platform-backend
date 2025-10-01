"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AdminDashboardController_1 = require("../controllers/AdminDashboardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get("/summary", authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, AdminDashboardController_1.AdminDashboardController.getAdminDashboardSummary);
router.get("/analytics", authMiddleware_1.authenticate, authMiddleware_1.requireAdmin, AdminDashboardController_1.AdminDashboardController.getDetailedAnalytics);
exports.default = router;
