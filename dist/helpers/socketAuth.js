"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.error("❌ [socketAuth] No token provided");
            return next(new Error("Authentication token required"));
        }
        // Verify JWT token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "your-secret-key");
        console.log("✅ [socketAuth] Token decoded:", {
            id: decoded.id,
            userId: decoded.userId,
            email: decoded.email,
            account_type: decoded.account_type
        });
        // FIXED: Attach user data with BOTH id and userId for compatibility
        socket.data.user = {
            id: decoded.id || decoded.userId, // Support both field names
            userId: decoded.id || decoded.userId, // Ensure userId is always set
            email: decoded.email,
            username: decoded.username,
            account_type: decoded.account_type,
        };
        console.log("✅ [socketAuth] User authenticated:", {
            id: socket.data.user.id,
            userId: socket.data.user.userId,
            email: socket.data.user.email
        });
        next();
    }
    catch (error) {
        console.error("❌ [socketAuth] Authentication failed:", error);
        next(new Error("Authentication failed"));
    }
};
exports.socketAuthMiddleware = socketAuthMiddleware;
