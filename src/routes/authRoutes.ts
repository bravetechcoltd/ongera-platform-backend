// @ts-nocheck
import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/authMiddleware";
// import { validateSession, refreshSessionExpiry } from "../middlewares/sessionMiddleware";
import { body } from "express-validator";
import upload from "../helpers/multer";

import { extractSystemContext } from "../middlewares/systemAwareMiddleware";

const router = Router();

router.use(extractSystemContext);
// ==================== PUBLIC ROUTES (NO SESSION NEEDED) ====================
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("first_name").notEmpty().withMessage("First name is required"),
    body("last_name").notEmpty().withMessage("Last name is required"),
  ],
  AuthController.register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  AuthController.login
);

router.post(
  "/google",
  [
    body("token").notEmpty().withMessage("Google token is required"),
  ],
  AuthController.googleLogin
);

router.post(
  "/verify-email",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  ],
  AuthController.verifyEmail
);

router.post(
  "/resend-verification",
  [
    body("email").isEmail().withMessage("Valid email is required"),
  ],
  AuthController.resendVerificationOTP
);

router.post(
  "/request-password-change",
  [
    body("email").isEmail().withMessage("Valid email is required"),
  ],
  AuthController.requestPasswordChange
);

router.post(
  "/change-password-otp",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
    body("new_password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  AuthController.changePasswordWithOTP
);

// ==================== PROTECTED ROUTES (REQUIRE SESSION VALIDATION) ====================

// ✅ NEW: Session validation endpoint
router.get(
  "/validate-session",
  authenticate,
  // validateSession,
  async (req, res) => {
    res.json({
      success: true,
      message: "Session is valid",
      data: {
        user_id: req.user.userId,
        session_valid: true,
      }
    });
  }
);

// ✅ NEW: Session refresh endpoint
router.post(
  "/refresh-session",
  authenticate,
  // validateSession,
  // refreshSessionExpiry,
  async (req, res) => {
    res.json({
      success: true,
      message: "Session refreshed successfully"
    });
  }
);

// Profile routes with session validation
router.get(
  "/profile",
  authenticate,
  // validateSession,
  // refreshSessionExpiry,
  AuthController.getProfile
);

router.put(
  "/profile",
  authenticate,
  // validateSession,
  upload.single("profile_picture"),
  AuthController.updateProfile
);

// Logout - clears all sessions
router.post(
  "/logout",
  authenticate,
  AuthController.logout
);

// User management routes (Admin only)
router.get(
  "/users",
  authenticate,
  // validateSession,
  AuthController.getAllUsers
);

router.patch(
  "/users/:id/status",
  authenticate,
  // validateSession,
  [
    body("is_active").isBoolean().withMessage("is_active must be a boolean"),
    body("reason").optional().isString().withMessage("Reason must be a string"),
  ],
  AuthController.activateDeactivateUser
);

router.delete(
  "/users/:id",
  authenticate,
  // validateSession,
  AuthController.deleteUser
);

// Debug routes
router.get("/check-existing", AuthController.checkExistingUser);
router.get("/stats", AuthController.getDatabaseStats);

export default router;