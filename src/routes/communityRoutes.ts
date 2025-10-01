import { Router } from "express";
import { CommunityController } from "../controllers/CommunityController";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import upload from "../helpers/multer";

const router = Router();
router.get("/search", CommunityController.searchCommunities);

router.get("/admin/all", authenticate, requireAdmin, CommunityController.getAllCommunitiesForAdmin);
router.get("/admin/pending", authenticate, requireAdmin, CommunityController.getPendingCommunities);
router.patch("/admin/:id/approve", authenticate, requireAdmin, CommunityController.approveCommunity);
router.delete("/admin/:id/reject", authenticate, requireAdmin, CommunityController.rejectCommunity);
router.delete("/admin/:id", authenticate, requireAdmin, CommunityController.deleteCommunity);

router.patch("/admin/:id/status", authenticate, requireAdmin, CommunityController.activateDeactivateCommunity);

router.post("/", authenticate, upload.single("cover_image"), CommunityController.createCommunity);
router.get("/my-communities", authenticate, CommunityController.getUserCommunities);
router.post("/community-posts", authenticate, CommunityController.createPost);

router.post("/:community_id/posts", authenticate, upload.single("post_image"), CommunityController.createCommunityPost);
router.get("/:community_id/posts", CommunityController.getCommunityPosts);

router.get("/suggestions/:projectId", authenticate, CommunityController.getSuggestedCommunities);
router.get("/:community_id/members", CommunityController.getCommunityMembers);

router.get("/", CommunityController.getAllCommunities);

router.get("/:id", CommunityController.getCommunityById);
// router.post("/:id/join", authenticate, CommunityController.joinCommunity);
router.post("/:id/leave", authenticate, CommunityController.leaveCommunity);


router.post("/:id/join", authenticate, CommunityController.joinCommunity); // Enhanced to handle approval
router.get("/join-requests/my-pending", authenticate, CommunityController.getUserPendingRequests);
router.get("/:community_id/join-requests", authenticate, CommunityController.getCommunityJoinRequests);
router.patch("/join-requests/:request_id/approve", authenticate, CommunityController.approveJoinRequest);
router.patch("/join-requests/:request_id/reject", authenticate, CommunityController.rejectJoinRequest);

export default router;

