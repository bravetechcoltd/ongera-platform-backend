// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AccountType } from "../database/models/User";

interface DecodedToken {
  userId: string;
  id?: string; // FIXED: Support both field names
  email: string;
  account_type?: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        id: string; // Always include both fields
        email: string;
        account_type?: string;
        username?: string;
      };
    }
  }
}

// In your authMiddleware.ts file
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      // No token provided - continue without authentication
      req.user = null;
      return next();
    }

    // Token provided - verify it
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;
    req.user = {
      userId: decoded.userId,
      id: decoded.id || decoded.userId,
      email: decoded.email,
      account_type: decoded.account_type
    };
    
    console.log("✅ [optionalAuthenticate] User authenticated:", req.user);
    next();
  } catch (error: any) {
    // Invalid token - continue without authentication
    console.log("⚠️ [optionalAuthenticate] Invalid token, continuing as guest");
    req.user = null;
    next();
  }
};

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as DecodedToken;

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
  } catch (error: any) {
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

// ✅ Admin-only middleware (100% maintained)
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (req.user.account_type !== AccountType.ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Access denied",
    });
  }
};