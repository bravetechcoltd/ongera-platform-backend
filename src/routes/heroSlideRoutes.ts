import { Router } from "express";
import { HeroSlideController } from "../controllers/HeroSlideController";
import { authenticate, requireAdmin } from "../middlewares/authMiddleware";
import upload from "../helpers/multer";

const router = Router();

// ✅ PUBLIC - used by the home page hero section (right side dynamic content)
router.get("/public", HeroSlideController.getPublicHeroSlides);

// ✅ ADMIN - full management
router.get("/", authenticate, requireAdmin, HeroSlideController.getAllHeroSlides);
router.get("/:id", authenticate, requireAdmin, HeroSlideController.getHeroSlideById);
router.post(
  "/",
  authenticate,
  requireAdmin,
  upload.single("image"),
  HeroSlideController.createHeroSlide
);
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  upload.single("image"),
  HeroSlideController.updateHeroSlide
);
router.patch(
  "/:id/toggle",
  authenticate,
  requireAdmin,
  HeroSlideController.toggleHeroSlideStatus
);
router.delete("/:id", authenticate, requireAdmin, HeroSlideController.deleteHeroSlide);

export default router;
