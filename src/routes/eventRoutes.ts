import { Router } from "express";
import { EventController } from "../controllers/EventController";
import { authenticate } from "../middlewares/authMiddleware";
import upload from "../helpers/multer";

const router = Router();

// Event creation and listing
router.post("/", authenticate, upload.single("cover_image"), EventController.createEvent);
router.get("/", EventController.getAllEvents);
router.get("/my-events", authenticate, EventController.getMyEvents);

// Single event operations
router.get("/:id", EventController.getEventById);
router.put("/:id", authenticate, upload.single("cover_image"), EventController.updateEvent);
router.delete("/:id", authenticate, EventController.deleteEvent);

// Event registration
router.post("/:id/register", authenticate, EventController.registerForEvent);
router.delete("/:id/register", authenticate, EventController.unregisterFromEvent);

// Event agenda management
router.post("/:id/agenda", authenticate, EventController.addAgendaItem);
router.put("/:id/agenda/:agendaId", authenticate, EventController.updateAgendaItem);
router.delete("/:id/agenda/:agendaId", authenticate, EventController.deleteAgendaItem);
// NEW ROUTES (must be BEFORE /:id routes)
router.post("/communities/:community_id/events", authenticate, upload.single("cover_image"), EventController.createCommunityEvent);
router.get("/communities/:community_id/events", EventController.getCommunityEvents);
// Attendee management
router.get("/:id/attendees", authenticate, EventController.getEventAttendees);
router.put("/:id/attendees/:userId", authenticate, EventController.updateAttendeeStatus);
router.delete("/:id/attendees/:userId", authenticate, EventController.removeAttendee);
router.get(
  "/admin/all",
    authenticate,
  EventController.getAllEventsForAdmin
);


router.patch(
  "/admin/:id/status",
  authenticate,
  EventController.activateDeactivateEvent
);


router.post(
  "/admin/:id/cancel",
authenticate,
  EventController.cancelEventPermanently
);
router.get("/upcoming/latest", EventController.getLatestUpcomingEvents);
router.patch("/admin/:id/extend-date", authenticate, EventController.extendEventDate);
router.patch("/admin/:id/close", authenticate, EventController.closeEvent);
router.patch("/admin/:id/postpone", authenticate, EventController.postponeEvent);
router.patch("/admin/:id/transfer-ownership", authenticate, EventController.transferOwnership);
router.post("/:id/attendees/bulk-action", authenticate, EventController.bulkAttendeeAction);
router.get("/:id/attendees/export", authenticate, EventController.exportAttendees);
router.get("/:id/statistics", authenticate, EventController.getEventStatistics);
router.post("/:id/duplicate", authenticate, EventController.duplicateEvent);
export default router;