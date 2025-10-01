"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EventController_1 = require("../controllers/EventController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const multer_1 = __importDefault(require("../helpers/multer"));
const router = (0, express_1.Router)();
// Event creation and listing
router.post("/", authMiddleware_1.authenticate, multer_1.default.single("cover_image"), EventController_1.EventController.createEvent);
router.get("/", EventController_1.EventController.getAllEvents);
router.get("/my-events", authMiddleware_1.authenticate, EventController_1.EventController.getMyEvents);
// Single event operations
router.get("/:id", EventController_1.EventController.getEventById);
router.put("/:id", authMiddleware_1.authenticate, multer_1.default.single("cover_image"), EventController_1.EventController.updateEvent);
router.delete("/:id", authMiddleware_1.authenticate, EventController_1.EventController.deleteEvent);
// Event registration
router.post("/:id/register", authMiddleware_1.authenticate, EventController_1.EventController.registerForEvent);
router.delete("/:id/register", authMiddleware_1.authenticate, EventController_1.EventController.unregisterFromEvent);
// Event agenda management
router.post("/:id/agenda", authMiddleware_1.authenticate, EventController_1.EventController.addAgendaItem);
router.put("/:id/agenda/:agendaId", authMiddleware_1.authenticate, EventController_1.EventController.updateAgendaItem);
router.delete("/:id/agenda/:agendaId", authMiddleware_1.authenticate, EventController_1.EventController.deleteAgendaItem);
// NEW ROUTES (must be BEFORE /:id routes)
router.post("/communities/:community_id/events", authMiddleware_1.authenticate, multer_1.default.single("cover_image"), EventController_1.EventController.createCommunityEvent);
router.get("/communities/:community_id/events", EventController_1.EventController.getCommunityEvents);
// Attendee management
router.get("/:id/attendees", authMiddleware_1.authenticate, EventController_1.EventController.getEventAttendees);
router.put("/:id/attendees/:userId", authMiddleware_1.authenticate, EventController_1.EventController.updateAttendeeStatus);
router.delete("/:id/attendees/:userId", authMiddleware_1.authenticate, EventController_1.EventController.removeAttendee);
router.get("/admin/all", authMiddleware_1.authenticate, EventController_1.EventController.getAllEventsForAdmin);
router.patch("/admin/:id/status", authMiddleware_1.authenticate, EventController_1.EventController.activateDeactivateEvent);
router.post("/admin/:id/cancel", authMiddleware_1.authenticate, EventController_1.EventController.cancelEventPermanently);
router.get("/upcoming/latest", EventController_1.EventController.getLatestUpcomingEvents);
router.patch("/admin/:id/extend-date", authMiddleware_1.authenticate, EventController_1.EventController.extendEventDate);
router.patch("/admin/:id/close", authMiddleware_1.authenticate, EventController_1.EventController.closeEvent);
router.patch("/admin/:id/postpone", authMiddleware_1.authenticate, EventController_1.EventController.postponeEvent);
router.patch("/admin/:id/transfer-ownership", authMiddleware_1.authenticate, EventController_1.EventController.transferOwnership);
router.post("/:id/attendees/bulk-action", authMiddleware_1.authenticate, EventController_1.EventController.bulkAttendeeAction);
router.get("/:id/attendees/export", authMiddleware_1.authenticate, EventController_1.EventController.exportAttendees);
router.get("/:id/statistics", authMiddleware_1.authenticate, EventController_1.EventController.getEventStatistics);
router.post("/:id/duplicate", authMiddleware_1.authenticate, EventController_1.EventController.duplicateEvent);
exports.default = router;
