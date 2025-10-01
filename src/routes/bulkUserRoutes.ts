import { Router } from "express";
import { BulkUserCreationController } from "../controllers/BulkUserCreationController";
import { authenticate } from "../middlewares/authMiddleware";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/bulk-users/parse-excel
 * Parse Excel file and return instructors/students data
 * Access: Institution accounts only
 */
router.post(
  "/parse-excel",
  authenticate,
  upload.single("file"),
  BulkUserCreationController.parseExcelFile
);

/**
 * POST /api/bulk-users/create
 * Create bulk users (instructors + students)
 * Access: Institution accounts only
 */
router.post(
  "/create",
  authenticate,
  BulkUserCreationController.createBulkUsers
);

/**
 * GET /api/bulk-users/status/:id
 * Get bulk creation status
 * Access: Authenticated users
 */
router.get(
  "/status/:id",
  authenticate,
  BulkUserCreationController.getBulkCreationStatus
);

/**
 * GET /api/bulk-users/my-students
 * Get students assigned to instructor
 * Access: Instructor accounts only
 */
router.get(
  "/my-students",
  authenticate,
  BulkUserCreationController.getInstructorStudents
);

/**
 * GET /api/bulk-users/download-template
 * Download Excel template
 * Access: Authenticated users
 */
router.get(
  "/download-template",
  authenticate,
  BulkUserCreationController.downloadTemplate
);

export default router;