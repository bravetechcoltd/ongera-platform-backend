"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const express_validator_1 = require("express-validator");
const multer_1 = __importDefault(require("../helpers/multer"));
const router = (0, express_1.Router)();
router.post("/register", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    (0, express_validator_1.body)("first_name").notEmpty().withMessage("First name is required"),
    (0, express_validator_1.body)("last_name").notEmpty().withMessage("Last name is required"),
], AuthController_1.AuthController.register);
router.post("/login", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
], AuthController_1.AuthController.login);
router.post("/google", [
    (0, express_validator_1.body)("token").notEmpty().withMessage("Google token is required"),
], AuthController_1.AuthController.googleLogin);
// Original profile routes - 100% maintained
router.get("/profile", authMiddleware_1.authenticate, AuthController_1.AuthController.getProfile);
router.put("/profile", authMiddleware_1.authenticate, multer_1.default.single("profile_picture"), AuthController_1.AuthController.updateProfile);
// ==================== NEW: USER MANAGEMENT ROUTES ====================
// Get all users (Admin only)
router.get("/users", authMiddleware_1.authenticate, AuthController_1.AuthController.getAllUsers);
// Activate/Deactivate user (Admin only)
router.patch("/users/:id/status", authMiddleware_1.authenticate, [
    (0, express_validator_1.body)("is_active").isBoolean().withMessage("is_active must be a boolean"),
    (0, express_validator_1.body)("reason").optional().isString().withMessage("Reason must be a string"),
], AuthController_1.AuthController.activateDeactivateUser);
// Delete user permanently (Admin only)
router.delete("/users/:id", authMiddleware_1.authenticate, AuthController_1.AuthController.deleteUser);
router.post("/verify-email", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
], AuthController_1.AuthController.verifyEmail);
router.post("/resend-verification", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
], AuthController_1.AuthController.resendVerificationOTP);
// NEW PASSWORD CHANGE WITH OTP ROUTES
router.post("/request-password-change", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
], AuthController_1.AuthController.requestPasswordChange);
router.post("/change-password-otp", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Valid email is required"),
    (0, express_validator_1.body)("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
    (0, express_validator_1.body)("new_password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
], AuthController_1.AuthController.changePasswordWithOTP);
router.get("/check-existing", AuthController_1.AuthController.checkExistingUser);
router.get("/stats", AuthController_1.AuthController.getDatabaseStats);
exports.default = router;
