import { Request, Response, NextFunction } from "express";
import dbConnection from "../database/db";
import { UserSession } from "../database/models/UserSession";
import { User } from "../database/models/User";
import { MoreThan } from "typeorm";

export interface SessionRequest extends Request {
  session?: UserSession;
  sessionUser?: User;
}

/**
 * Middleware to validate and refresh user sessions
 * This ensures sessions remain active and consistent
 */
export async function validateSession(
  req: SessionRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      return next(); // Skip if no user (let authMiddleware handle)
    }

    const sessionRepo = dbConnection.getRepository(UserSession);
    const userRepo = dbConnection.getRepository(User);

    // Find active session for this user
    const activeSession = await sessionRepo.findOne({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: MoreThan(new Date()),
      },
      order: {
        last_activity: "DESC",
      },
    });

    if (!activeSession) {
      console.log(`⚠️ No active session found for user ${userId}`);
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "SESSION_EXPIRED",
      });
    }

    // Update last_activity to keep session alive
    activeSession.last_activity = new Date();
    await sessionRepo.save(activeSession);

    // Ensure user isUserLogin is true
    const user = await userRepo.findOne({ where: { id: userId } });
    if (user && !user.isUserLogin) {
      user.isUserLogin = true;
      await userRepo.save(user);
    }

    // Attach session to request
    req.session = activeSession;
    req.sessionUser = user || undefined;

    next();
  } catch (error: any) {
    console.error("❌ Session validation error:", error);
    next(); // Continue even if validation fails
  }
}

/**
 * Middleware to refresh session expiry
 * Extends session by 7 days on each request
 */
export async function refreshSessionExpiry(
  req: SessionRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.session) {
      return next();
    }

    const sessionRepo = dbConnection.getRepository(UserSession);

    // Extend expiry by 7 days
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await sessionRepo.update(
      { id: req.session.id },
      { 
        expires_at: newExpiry,
        last_activity: new Date()
      }
    );

    console.log(`✅ Session refreshed for user ${req.session.user_id}`);

    next();
  } catch (error: any) {
    console.error("❌ Session refresh error:", error);
    next(); // Continue even if refresh fails
  }
}