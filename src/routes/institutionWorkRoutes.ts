

import { Router } from "express";
import { InstitutionWorkController } from "../controllers/InstitutionWorkController";
import { authenticate } from "../middlewares/authMiddleware";
import upload from "../helpers/multer";

const router = Router();

// ==================== PUBLIC ROUTES ====================
// Get active institutions for homepage
router.get(
  "/public/active",
  InstitutionWorkController.getActiveForHomepage
);

// Get all institutions (public)
router.get(
  "/",
  InstitutionWorkController.getAll
);

// Get institution by ID
router.get(
  "/:id",
  InstitutionWorkController.getById
);

// ==================== PROTECTED ROUTES (ADMIN ONLY) ====================
// Create new institution work
router.post(
  "/",
  authenticate,
  upload.single("logo"),
  InstitutionWorkController.create
);

// Update institution work
router.put(
  "/:id",
  authenticate,
  upload.single("logo"),
  InstitutionWorkController.update
);

// Delete institution work
router.delete(
  "/:id",
  authenticate,
  InstitutionWorkController.delete
);

// Toggle active status
router.patch(
  "/:id/toggle",
  authenticate,
  InstitutionWorkController.toggleActive
);

export default router;