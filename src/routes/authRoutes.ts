import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/authMiddleware";
import { body } from "express-validator";
import upload from "../helpers/multer";

const router = Router();

// ==================== ORIGINAL ROUTES - 100% MAINTAINED ====================

// Original register route - 100% maintained
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

// Original login route - 100% maintained
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  AuthController.login
);

// Google login route - 100% maintained
router.post(
  "/google",
  [
    body("token").notEmpty().withMessage("Google token is required"),
  ],
  AuthController.googleLogin
);

// Original profile routes - 100% maintained
router.get("/profile", authenticate, AuthController.getProfile);
router.put(
  "/profile", 
  authenticate, 
  upload.single("profile_picture"),
  AuthController.updateProfile
);

// ==================== NEW: USER MANAGEMENT ROUTES ====================

// Get all users (Admin only)
router.get(
  "/users",
  authenticate,
  AuthController.getAllUsers
);

// Activate/Deactivate user (Admin only)
router.patch(
  "/users/:id/status",
  authenticate,
  [
    body("is_active").isBoolean().withMessage("is_active must be a boolean"),
    body("reason").optional().isString().withMessage("Reason must be a string"),
  ],
  AuthController.activateDeactivateUser
);

// Delete user permanently (Admin only)
router.delete(
  "/users/:id",
  authenticate,
  AuthController.deleteUser
);
router.post(
  "/verify-email",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
    body("new_password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
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

// NEW PASSWORD CHANGE WITH OTP ROUTES
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
export default router;