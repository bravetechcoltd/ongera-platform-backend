"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HomePageController_1 = require("../controllers/HomePageController");
const router = (0, express_1.Router)();
router.get("/homepage/summary", HomePageController_1.HomePageController.getHomePageSummary);
router.get("/homepage/content", HomePageController_1.HomePageController.getHomePageContent);
exports.default = router;
