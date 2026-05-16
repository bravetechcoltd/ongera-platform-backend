// @ts-nocheck
import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticate, optionalAuthenticate } from "../middlewares/authMiddleware";

const router = Router();

// ---------- ME ----------
router.get("/me/profile", authenticate, UserController.getMe);

// ---------- BATCH ENRICH (lightweight users -> enriched users) ----------
router.post("/batch-enrich", optionalAuthenticate, UserController.batchEnrich);

// ---------- NOTIFICATIONS ----------
router.get("/me/notifications", authenticate, UserController.myNotifications);
router.patch("/me/notifications/:id/read", authenticate, UserController.markNotificationRead);
router.post("/me/notifications/read-all", authenticate, UserController.markAllNotificationsRead);

// ---------- USER LOOKUP / GRAPH ----------
router.get("/:id/full", optionalAuthenticate, UserController.getFull);
router.get("/:id/projects", optionalAuthenticate, UserController.getProjects);
router.get("/:id/followers", optionalAuthenticate, UserController.getFollowers);
router.get("/:id/following", optionalAuthenticate, UserController.getFollowing);
router.get("/:id/communities", optionalAuthenticate, UserController.getCommunities);
router.get("/:id/suggestions/to-follow", optionalAuthenticate, UserController.suggestUsersToFollow);
router.get("/:id/suggestions/communities", optionalAuthenticate, UserController.suggestCommunitiesToJoin);

// ---------- FOLLOW ACTIONS ----------
router.post("/:id/follow", authenticate, UserController.follow);
router.delete("/:id/follow", authenticate, UserController.unfollow);

export default router;
