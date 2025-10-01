"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../database/models/User");
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                success: false,
                message: "No token provided",
            });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({
                success: false,
                message: "Invalid token format",
            });
            return;
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "your-secret-key");
        // FIXED: Extract user ID from either field and ensure BOTH are set
        const extractedUserId = decoded.userId || decoded.id;
        if (!extractedUserId) {
            console.error("❌ [authenticate] No user ID in token:", decoded);
            res.status(401).json({
                success: false,
                message: "Invalid token: missing user ID",
            });
            return;
        }
        // FIXED: Set BOTH userId and id for maximum compatibility
        req.user = {
            userId: extractedUserId,
            id: extractedUserId,
            email: decoded.email,
            account_type: decoded.account_type,
        };
        console.log("✅ [authenticate] User authenticated:", {
            userId: req.user.userId,
            id: req.user.id,
            email: req.user.email,
            account_type: req.user.account_type
        });
        next();
    }
    catch (error) {
        console.error("❌ [authenticate] Authentication failed:", error.message);
        if (error.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                message: "Token expired",
            });
            return;
        }
        if (error.name === "JsonWebTokenError") {
            res.status(401).json({
                success: false,
                message: "Invalid token",
            });
            return;
        }
        res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
};
exports.authenticate = authenticate;
// ✅ Admin-only middleware (100% maintained)
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        if (req.user.account_type !== User_1.AccountType.ADMIN) {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }
        next();
    }
    catch (error) {
        return res.status(403).json({
            success: false,
            message: "Access denied",
        });
    }
};
exports.requireAdmin = requireAdmin;
