// @ts-nocheck
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnection from '../database/db';
import { User } from "../database/models/User";
import { UserProfile } from "../database/models/UserProfile";
import { Otp } from "../database/models/Otp";
import { UploadToCloud } from "../helpers/cloud";
import { OAuth2Client } from "google-auth-library";
import { MoreThan } from "typeorm";
import {
  generateOTP,
  sendVerificationOTP,
  sendPasswordChangeOTP,
  sendEmailVerifiedNotification
} from "../services/emailTemplates";
import { sendEmail } from "../helpers/utils";
import { ActivateDeactivateDeleteUserTemplate } from "../helpers/ActivateDeactivateDeleteUserTemplate";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthController {
  // ENHANCED REGISTER - Sends verification OTP
  static async register(req: Request, res: Response) {
    try {
      const { email, password, first_name, last_name, phone_number, account_type, username } = req.body;

      const userRepo = dbConnection.getRepository(User);
      
      const existingUser = await userRepo.findOne({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ 
          success: false, 
          message: "User with this email already exists" 
        });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const user = userRepo.create({
        email,
        password_hash,
        first_name,
        last_name,
        phone_number,
        account_type,
        username: username || email.split("@")[0],
        is_verified: false // NOT VERIFIED YET
      });

      await userRepo.save(user);

      const profileRepo = dbConnection.getRepository(UserProfile);
      const profile = profileRepo.create({ user });
      await profileRepo.save(profile);

      // Generate and send verification OTP
      const otp = generateOTP();
      const otpRepo = dbConnection.getRepository(Otp);
      const otpRecord = otpRepo.create({
        user_id: user.id,
        otp_code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        purpose: 'email_verification',
        used: false
      });
      await otpRepo.save(otpRecord);

      await sendVerificationOTP(email, first_name, last_name, otp);

      res.status(201).json({
        success: true,
        message: "Registration successful. Please check your email to verify your account.",
        data: {
          email: user.email,
          requires_verification: true
        },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Registration failed", 
        error: error.message 
      });
    }
  }

  // ENHANCED LOGIN - Checks email verification
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const userRepo = dbConnection.getRepository(User);
      const user = await userRepo.findOne({ 
        where: { email },
        relations: ["profile"]
      });

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }

      if (!user.is_active) {
        return res.status(403).json({ 
          success: false, 
          message: "Account is deactivated" 
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials" 
        });
      }

      // CHECK IF EMAIL IS VERIFIED
      if (!user.is_verified) {
        // Send new verification OTP
        const otp = generateOTP();
        const otpRepo = dbConnection.getRepository(Otp);
        const otpRecord = otpRepo.create({
          user_id: user.id,
          otp_code: otp,
          expires_at: new Date(Date.now() + 10 * 60 * 1000),
          purpose: 'email_verification',
          used: false
        });
        await otpRepo.save(otpRecord);

        await sendVerificationOTP(email, user.first_name, user.last_name, otp);

        return res.status(403).json({
          success: false,
          message: "Email not verified. We've sent a new verification code to your email.",
          requires_verification: true,
          email: user.email
        });
      }

      user.last_login = new Date();
      await userRepo.save(user);

      const token = jwt.sign(
        { userId: user.id, email: user.email, account_type: user.account_type },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            account_type: user.account_type,
            is_verified: user.is_verified,
            profile: user.profile,
          },
          token,
        },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Login failed", 
        error: error.message 
      });
    }
  }

  // NEW: Verify Email with OTP and Set Password
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { email, otp, new_password } = req.body;

      if (!email || !otp || !new_password) {
        return res.status(400).json({
          success: false,
          message: "Email, OTP, and new password are required"
        });
      }

      if (new_password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const otpRepo = dbConnection.getRepository(Otp);

      const user = await userRepo.findOne({ 
        where: { email },
        relations: ["profile"]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Find valid OTP
      const otpRecord = await otpRepo.findOne({
        where: {
          user_id: user.id,
          otp_code: otp,
          purpose: 'email_verification',
          used: false,
          expires_at: MoreThan(new Date())
        }
      });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP"
        });
      }

      // Mark OTP as used
      otpRecord.used = true;
      await otpRepo.save(otpRecord);

      // Update user - verify email and change password
      user.is_verified = true;
      user.password_hash = await bcrypt.hash(new_password, 12);
      await userRepo.save(user);

      // Send success notification
      await sendEmailVerifiedNotification(email, user.first_name, user.last_name);

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email, account_type: user.account_type },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Email verified and password set successfully",
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            account_type: user.account_type,
            is_verified: user.is_verified,
            profile: user.profile,
          },
          token,
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Verification failed",
        error: error.message
      });
    }
  }

  // NEW: Resend Verification OTP
  static async resendVerificationOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const user = await userRepo.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.is_verified) {
        return res.status(400).json({
          success: false,
          message: "Email already verified"
        });
      }

      // Generate new OTP
      const otp = generateOTP();
      const otpRepo = dbConnection.getRepository(Otp);
      const otpRecord = otpRepo.create({
        user_id: user.id,
        otp_code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        purpose: 'email_verification',
        used: false
      });
      await otpRepo.save(otpRecord);

      await sendVerificationOTP(email, user.first_name, user.last_name, otp);

      res.json({
        success: true,
        message: "Verification code resent successfully"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to resend verification code",
        error: error.message
      });
    }
  }

  // NEW: Request Password Change (for verified users)
  static async requestPasswordChange(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const user = await userRepo.findOne({ where: { email } });

      if (!user) {
        // Don't reveal if user exists
        return res.json({
          success: true,
          message: "If the email exists, a verification code has been sent"
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpRepo = dbConnection.getRepository(Otp);
      const otpRecord = otpRepo.create({
        user_id: user.id,
        otp_code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        purpose: 'password_reset',
        used: false
      });
      await otpRepo.save(otpRecord);

      await sendPasswordChangeOTP(email, user.first_name, user.last_name, otp);

      res.json({
        success: true,
        message: "Verification code sent to your email"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to send verification code",
        error: error.message
      });
    }
  }

// NEW: Change Password with OTP — now also verifies unverified users
static async changePasswordWithOTP(req: Request, res: Response) {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    const userRepo = dbConnection.getRepository(User);
    const otpRepo = dbConnection.getRepository(Otp);

    const user = await userRepo.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Find valid OTP for password reset
    const otpRecord = await otpRepo.findOne({
      where: {
        user_id: user.id,
        otp_code: otp,
        purpose: 'password_reset',
        used: false,
        expires_at: MoreThan(new Date())
      }
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    // Mark OTP as used
    otpRecord.used = true;
    await otpRepo.save(otpRecord);

    // ✅ Change password
    user.password_hash = await bcrypt.hash(new_password, 12);

    // ✅ If user email is NOT verified, verify it now automatically
    if (!user.is_verified) {
      user.is_verified = true;
      try {
        await sendEmailVerifiedNotification(
          email,
          user.first_name,
          user.last_name
        );
      } catch (notifyErr: any) {
        console.warn("Email verification notification failed:", notifyErr.message);
      }
    }

    await userRepo.save(user);

    res.json({
      success: true,
      message: user.is_verified
        ? "Password changed successfully (email verified as well)"
        : "Password changed successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message
    });
  }
}


  // GOOGLE LOGIN (ENHANCED) - Auto-verify Google users
  static async googleLogin(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Google token is required" 
        });
      }

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid Google token" 
        });
      }

      const email = payload.email;
      const googleId = payload.sub;
      const firstName = payload.given_name || "";
      const lastName = payload.family_name || "";
      const profilePicture = payload.picture || "";

      const userRepo = dbConnection.getRepository(User);
      let user = await userRepo.findOne({ 
        where: { email },
        relations: ["profile"]
      });

      if (user && !user.social_auth_provider) {
        user.social_auth_provider = "google";
        user.social_auth_id = googleId;
        user.profile_picture_url = user.profile_picture_url || profilePicture;
        user.is_verified = true; // Auto-verify
        user.last_login = new Date();
        await userRepo.save(user);
      } 
      else if (!user) {
        user = userRepo.create({
          email,
          password_hash: "",
          first_name: firstName,
          last_name: lastName,
          username: email.split("@")[0],
          social_auth_provider: "google",
          social_auth_id: googleId,
          profile_picture_url: profilePicture,
          is_verified: true, // Google emails are verified
          account_type: "Student",
        });

        await userRepo.save(user);

        const profileRepo = dbConnection.getRepository(UserProfile);
        const profile = profileRepo.create({ user });
        await profileRepo.save(profile);
        user.profile = profile;
      }
      else {
        user.last_login = new Date();
        await userRepo.save(user);
      }

      if (!user.is_active) {
        return res.status(403).json({ 
          success: false, 
          message: "Account is deactivated" 
        });
      }

      const jwtToken = jwt.sign(
        { userId: user.id, email: user.email, account_type: user.account_type },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Google login successful",
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            account_type: user.account_type,
            is_verified: user.is_verified,
            profile_picture_url: user.profile_picture_url,
            profile: user.profile,
          },
          token: jwtToken,
        },
      });
    } catch (error: any) {
      console.error("Google login error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Google login failed", 
        error: error.message 
      });
    }
  }

  // ORIGINAL METHODS (100% maintained)
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user.userId;

      const userRepo = dbConnection.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: userId },
        relations: ["profile"],
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      const { password_hash, ...userData } = user;

      res.json({
        success: true,
        data: userData,
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch profile", 
        error: error.message 
      });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const updates = req.body;

      const userRepo = dbConnection.getRepository(User);
      const user = await userRepo.findOne({ 
        where: { id: userId },
        relations: ["profile"]
      });

      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      if (req.file) {
        const uploadResult = await UploadToCloud(req.file);
        user.profile_picture_url = uploadResult.secure_url;
      }

      if (updates.first_name) user.first_name = updates.first_name;
      if (updates.last_name) user.last_name = updates.last_name;
      if (updates.phone_number) user.phone_number = updates.phone_number;
      if (updates.bio) user.bio = updates.bio;
      if (updates.city) user.city = updates.city;
      if (updates.country) user.country = updates.country;

      await userRepo.save(user);

      if (updates.profile) {
        const profileData = typeof updates.profile === 'string' 
          ? JSON.parse(updates.profile) 
          : updates.profile;

        const profileRepo = dbConnection.getRepository(UserProfile);
        let profile = user.profile;
        
        if (!profile) {
          profile = profileRepo.create({ 
            user,
            ...profileData 
          });
        } else {
          Object.assign(profile, profileData);
        }
        
        await profileRepo.save(profile);
      }

      const updatedUser = await userRepo.findOne({
        where: { id: userId },
        relations: ["profile"]
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update profile", 
        error: error.message 
      });
    }
  }


    // Activate/Deactivate user
  static async activateDeactivateUser(req: Request, res: Response) {
    try {
      console.log("\n🔄 ========== ACTIVATE/DEACTIVATE USER START ==========");
      
      const { id } = req.params;
      const { is_active, reason } = req.body;

      console.log("📥 Request Data:", { userId: id, is_active, reason });

      // Validate input
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "is_active must be a boolean value"
        });
      }

      // If deactivating, reason should be provided
      if (!is_active && !reason) {
        return res.status(400).json({
          success: false,
          message: "Reason is required when deactivating a user"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const user = await userRepo.findOne({
        where: { id },
        relations: ["profile"]
      });

      if (!user) {
        console.log("❌ User not found");
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      console.log("✅ User found:", {
        name: `${user.first_name} ${user.last_name}`,
        currentStatus: user.is_active,
        newStatus: is_active
      });

      // Check if status is already the same
      if (user.is_active === is_active) {
        const statusText = is_active ? 'active' : 'inactive';
        return res.status(400).json({
          success: false,
          message: `User account is already ${statusText}`
        });
      }

      // Update user status
      user.is_active = is_active;
      await userRepo.save(user);
      console.log(`✅ User status updated to: ${is_active ? 'ACTIVE' : 'INACTIVE'}`);

      // Send email notification
      console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
      
      try {
        const userData = {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          account_type: user.account_type,
          profile: user.profile
        };

        const emailHtml = ActivateDeactivateDeleteUserTemplate.getStatusChangeTemplate(
          userData,
          is_active,
          reason
        );

        const emailSubject = is_active 
          ? `✅ Your Account Has Been Activated`
          : `⚠️ Your Account Has Been Deactivated`;

        await sendEmail({
          to: user.email,
          subject: emailSubject,
          html: emailHtml
        });

        console.log(`✅ Email sent successfully to: ${user.email}`);
      } catch (emailError: any) {
        console.error("❌ Email sending failed:", emailError.message);
        // Don't throw error - status update succeeded
      }

      console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
      console.log("🔄 ========== ACTIVATE/DEACTIVATE USER END ==========\n");

      const statusText = is_active ? 'activated' : 'deactivated';
      res.json({
        success: true,
        message: `User ${statusText} successfully and notification sent`,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_active: user.is_active
          }
        }
      });

    } catch (error: any) {
      console.error("❌ Activate/Deactivate user error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user status",
        error: error.message
      });
    }
  }

    // Delete user permanently
    static async deleteUser(req: Request, res: Response) {
      try {
        console.log("\n🗑️ ========== DELETE USER START ==========");
        
        const { id } = req.params;
  
        console.log("📥 Request Data:", { userId: id });
  
        const userRepo = dbConnection.getRepository(User);
        const user = await userRepo.findOne({
          where: { id },
          relations: ["profile"]
        });
  
        if (!user) {
          console.log("❌ User not found");
          return res.status(404).json({
            success: false,
            message: "User not found"
          });
        }
  
        console.log("✅ User found:", {
          name: `${user.first_name} ${user.last_name}`,
          email: user.email
        });
  
        // Store user data for email before deletion
        const userData = {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          account_type: user.account_type,
          profile: user.profile
        };
  
        // Send deletion notification email before deleting
        console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
        
        try {
          const emailHtml = ActivateDeactivateDeleteUserTemplate.getDeletionTemplate(userData);
  
          await sendEmail({
            to: user.email,
            subject: `🚨 Your Account Has Been Permanently Deleted`,
            html: emailHtml
          });
  
          console.log(`✅ Deletion notification email sent to: ${user.email}`);
        } catch (emailError: any) {
          console.error("❌ Email sending failed:", emailError.message);
          // Continue with deletion even if email fails
        }
  
        console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
  
        // Delete user profile first (if exists)
        if (user.profile) {
          const profileRepo = dbConnection.getRepository(UserProfile);
          await profileRepo.remove(user.profile);
          console.log("✅ User profile deleted");
        }
  
        // Delete user
        await userRepo.remove(user);
        console.log("✅ User deleted successfully");
  
        console.log("🗑️ ========== DELETE USER END ==========\n");
  
        res.json({
          success: true,
          message: "User deleted successfully and notification sent",
          data: {
            deletedUser: {
              email: userData.email,
              name: `${userData.first_name} ${userData.last_name}`
            }
          }
        });
  
      } catch (error: any) {
        console.error("❌ Delete user error:", error);
        res.status(500).json({
          success: false,
          message: "Failed to delete user",
          error: error.message
        });
      }
    }

      static async getAllUsers(req: Request, res: Response) {
        try {
          console.log("\n🔍 [GET ALL USERS] Starting...");
          
          const { page = 1, limit = 20, search, account_type, is_active } = req.query;
          
          const userRepo = dbConnection.getRepository(User);
          
          const queryBuilder = userRepo.createQueryBuilder("user")
            .leftJoinAndSelect("user.profile", "profile")
            .select([
              "user.id",
              "user.email",
              "user.username",
              "user.first_name",
              "user.last_name",
              "user.phone_number",
              "user.profile_picture_url",
              "user.account_type",
              "user.is_verified",
              "user.is_active",
              "user.date_joined",
              "user.last_login",
              "user.country",
              "user.city",
              "profile"
            ]);
    
          // Apply filters
          if (search) {
            queryBuilder.andWhere(
              "(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search OR user.username ILIKE :search)",
              { search: `%${search}%` }
            );
          }
    
          if (account_type) {
            queryBuilder.andWhere("user.account_type = :account_type", { account_type });
          }
    
          if (is_active !== undefined) {
            queryBuilder.andWhere("user.is_active = :is_active", { 
              is_active: is_active === 'true' 
            });
          }
    
          // Get total count
          const total = await queryBuilder.getCount();
    
          // Apply pagination
          const skip = (Number(page) - 1) * Number(limit);
          queryBuilder.skip(skip).take(Number(limit));
    
          // Order by date joined
          queryBuilder.orderBy("user.date_joined", "DESC");
    
          const users = await queryBuilder.getMany();
    
          console.log(`✅ Retrieved ${users.length} users (Total: ${total})`);
    
          res.json({
            success: true,
            data: {
              users,
              pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
              }
            }
          });
        } catch (error: any) {
          console.error("❌ Get all users error:", error);
          res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message
          });
        }
      }
    
}