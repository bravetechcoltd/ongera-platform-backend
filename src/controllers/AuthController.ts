import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnection from '../database/db';
import { User } from "../database/models/User";
import { SSOToken } from "../database/models/SSOToken";
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
import crypto from "crypto";
import { UserSession, SystemType } from "../database/models/UserSession";

import { ActivateDeactivateDeleteUserTemplate } from "../helpers/ActivateDeactivateDeleteUserTemplate";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthController {
  static async register(req: Request, res: Response) {
    console.log("\n🚀 ========== REGISTRATION START ==========");
    console.log("📥 Request Body:", JSON.stringify(req.body, null, 2));
    
    try {
      const { 
        email, 
        password, 
        first_name, 
        last_name, 
        phone_number, 
        account_type, 
        username,
        // NEW: Institution-specific fields
        institution_address,
        institution_type,
        institution_website,
        institution_description
      } = req.body;

      console.log("\n📋 Extracted Data:");
      console.log("  - Email:", email);
      console.log("  - First Name:", first_name);
      console.log("  - Last Name:", last_name);
      console.log("  - Account Type:", account_type);
      console.log("  - Username (provided):", username);
      console.log("  - Phone:", phone_number);

      const userRepo = dbConnection.getRepository(User);
      
      // Check for existing user by EMAIL
      console.log("\n🔍 Checking for existing user with email:", email);
      const existingUserByEmail = await userRepo.findOne({ where: { email } });
      
      if (existingUserByEmail) {
        console.log("❌ User with this email already exists:", existingUserByEmail.id);
        return res.status(409).json({ 
          success: false, 
          message: "User with this email already exists" 
        });
      }
      console.log("✅ Email is available");

      // Generate username if not provided
      const generatedUsername = username && username.trim() !== '' 
        ? username.trim() 
        : email.split("@")[0];
      
      console.log("\n🔑 Username Generation:");
      console.log("  - Provided username:", username);
      console.log("  - Generated username:", generatedUsername);

      // Check for existing user by USERNAME
      console.log("\n🔍 Checking for existing user with username:", generatedUsername);
      const existingUserByUsername = await userRepo.findOne({ 
        where: { username: generatedUsername } 
      });
      
      if (existingUserByUsername) {
        console.log("❌ Username already exists:", existingUserByUsername.id);
        console.log("  - Existing user email:", existingUserByUsername.email);
        console.log("  - Existing user account_type:", existingUserByUsername.account_type);
        
        // Generate a unique username with timestamp
        const uniqueUsername = `${generatedUsername}_${Date.now()}`;
        console.log("  - Generating unique username:", uniqueUsername);
        
        return res.status(409).json({ 
          success: false, 
          message: `Username '${generatedUsername}' is already taken. Please provide a different username or leave it empty.`,
          suggestion: uniqueUsername
        });
      }
      console.log("✅ Username is available");

      // Hash password
      console.log("\n🔐 Hashing password...");
      const password_hash = await bcrypt.hash(password, 12);
      console.log("✅ Password hashed successfully");

      // Create user object
      console.log("\n👤 Creating user object...");
      const userData = {
        email,
        password_hash,
        first_name: first_name || 'N/A',
        last_name: last_name || '',
        phone_number,
        account_type,
        username: generatedUsername,
        is_verified: false
      };
      console.log("User data to save:", JSON.stringify(userData, null, 2));

      const user = userRepo.create(userData);

      console.log("\n💾 Saving user to database...");
      try {
        await userRepo.save(user);
        console.log("✅ User saved successfully with ID:", user.id);
      } catch (saveError: any) {
        console.error("❌ Error saving user:", saveError.message);
        console.error("Error details:", saveError);
        
        if (saveError.message.includes('duplicate key')) {
          console.error("🔍 Duplicate key error detected");
          console.error("  - Constraint:", saveError.constraint);
          console.error("  - Detail:", saveError.detail);
          
          return res.status(409).json({ 
            success: false, 
            message: "A user with this email or username already exists. Please use different credentials.",
            error: saveError.message,
            constraint: saveError.constraint
          });
        }
        
        throw saveError;
      }

      // ✅ Create profile with institution-specific data if applicable
      console.log("\n📝 Creating user profile...");
      const profileRepo = dbConnection.getRepository(UserProfile);
      const profileData: any = { user };

      if (account_type === 'Institution') {
        console.log("  - Creating INSTITUTION profile");
        profileData.institution_name = first_name;
        profileData.institution_address = institution_address;
        profileData.institution_phone = phone_number;
        profileData.institution_type = institution_type;
        profileData.institution_website = institution_website;
        profileData.institution_description = institution_description;
        console.log("  - Institution data:", {
          name: first_name,
          address: institution_address,
          type: institution_type
        });
      } else {
        console.log("  - Creating STANDARD user profile");
      }

      const profile = profileRepo.create(profileData);
      
      console.log("\n💾 Saving profile to database...");
      try {
        await profileRepo.save(profile);
        console.log("✅ Profile saved successfully with ID:", profile.id);
      } catch (profileError: any) {
        console.error("❌ Error saving profile:", profileError.message);
        console.error("Error details:", profileError);
        throw profileError;
      }

      // Generate and send verification OTP
      console.log("\n📧 Generating OTP...");
      const otp = generateOTP();
      console.log("  - OTP generated:", otp);
      
      const otpRepo = dbConnection.getRepository(Otp);
      const otpRecord = otpRepo.create({
        user_id: user.id,
        otp_code: otp,
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
        purpose: 'email_verification',
        used: false
      });
      
      console.log("\n💾 Saving OTP to database...");
      try {
        await otpRepo.save(otpRecord);
        console.log("✅ OTP saved successfully");
      } catch (otpError: any) {
        console.error("❌ Error saving OTP:", otpError.message);
        console.error("Error details:", otpError);
        throw otpError;
      }

      console.log("\n📨 Sending verification email...");
      try {
        await sendVerificationOTP(email, first_name, last_name, otp);
        console.log("✅ Verification email sent successfully");
      } catch (emailError: any) {
        console.error("⚠️ Warning: Email sending failed:", emailError.message);
        console.error("  - User created but email not sent");
        console.error("  - User will need to request new OTP");
      }

      console.log("\n✅ ========== REGISTRATION SUCCESS ==========");
      console.log("User ID:", user.id);
      console.log("Email:", user.email);
      console.log("Username:", user.username);
      console.log("Account Type:", user.account_type);
      console.log("============================================\n");

      res.status(201).json({
        success: true,
        message: "Registration successful. Please check your email to verify your account.",
        data: {
          email: user.email,
          requires_verification: true,
          user_id: user.id
        },
      });
    } catch (error: any) {
      console.error("\n❌ ========== REGISTRATION FAILED ==========");
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
      console.error("Error Code:", error.code);
      console.error("Error Name:", error.name);
      
      if (error.constraint) {
        console.error("Database Constraint:", error.constraint);
      }
      if (error.detail) {
        console.error("Error Detail:", error.detail);
      }
      console.error("============================================\n");
      
      res.status(500).json({ 
        success: false, 
        message: "Registration failed", 
        error: error.message,
        code: error.code,
        constraint: error.constraint,
        detail: error.detail
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

  // ✅ NEW: Check if email or username exists (for debugging)
  static async checkExistingUser(req: Request, res: Response) {
    console.log("\n🔍 ========== CHECK EXISTING USER ==========");
    try {
      const { email, username } = req.query;
      
      console.log("Checking for:");
      console.log("  - Email:", email);
      console.log("  - Username:", username);

      const userRepo = dbConnection.getRepository(User);
      const results: any = {
        email_exists: false,
        username_exists: false,
        users_found: []
      };

      if (email) {
        const userByEmail = await userRepo.findOne({ 
          where: { email: email as string },
          select: ['id', 'email', 'username', 'account_type', 'date_joined', 'is_verified']
        });
        
        if (userByEmail) {
          results.email_exists = true;
          results.users_found.push({
            found_by: 'email',
            user: userByEmail
          });
          console.log("✅ Found user by email:", userByEmail.id);
        } else {
          console.log("❌ No user found with email:", email);
        }
      }

      if (username) {
        const userByUsername = await userRepo.findOne({ 
          where: { username: username as string },
          select: ['id', 'email', 'username', 'account_type', 'date_joined', 'is_verified']
        });
        
        if (userByUsername) {
          results.username_exists = true;
          results.users_found.push({
            found_by: 'username',
            user: userByUsername
          });
          console.log("✅ Found user by username:", userByUsername.id);
        } else {
          console.log("❌ No user found with username:", username);
        }
      }

      // Also search for similar usernames
      if (username) {
        const similarUsers = await userRepo
          .createQueryBuilder('user')
          .where('user.username ILIKE :pattern', { pattern: `${username}%` })
          .select(['user.id', 'user.email', 'user.username', 'user.account_type'])
          .take(5)
          .getMany();

        if (similarUsers.length > 0) {
          results.similar_usernames = similarUsers;
          console.log(`✅ Found ${similarUsers.length} similar usernames`);
        }
      }

      console.log("============================================\n");

      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      console.error("❌ Check existing user error:", error.message);
      console.error("============================================\n");
      
      res.status(500).json({
        success: false,
        message: "Failed to check existing user",
        error: error.message
      });
    }
  }

  // ✅ NEW: Get database statistics (for debugging)
  static async getDatabaseStats(req: Request, res: Response) {
    console.log("\n📊 ========== DATABASE STATS ==========");
    try {
      const userRepo = dbConnection.getRepository(User);
      
      const totalUsers = await userRepo.count();
      const verifiedUsers = await userRepo.count({ where: { is_verified: true } });
      const activeUsers = await userRepo.count({ where: { is_active: true } });
      
      const usersByType = await userRepo
        .createQueryBuilder('user')
        .select('user.account_type', 'account_type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.account_type')
        .getRawMany();

      const recentUsers = await userRepo.find({
        order: { date_joined: 'DESC' },
        take: 10,
        select: ['id', 'email', 'username', 'account_type', 'date_joined', 'is_verified']
      });

      console.log("Total Users:", totalUsers);
      console.log("Verified Users:", verifiedUsers);
      console.log("Active Users:", activeUsers);
      console.log("Users by Type:", usersByType);
      console.log("============================================\n");

      res.json({
        success: true,
        data: {
          total_users: totalUsers,
          verified_users: verifiedUsers,
          active_users: activeUsers,
          users_by_type: usersByType,
          recent_users: recentUsers
        }
      });
    } catch (error: any) {
      console.error("❌ Database stats error:", error.message);
      console.error("============================================\n");
      
      res.status(500).json({
        success: false,
        message: "Failed to get database stats",
        error: error.message
      });
    }
  }

static async login(req: Request, res: Response) {
  console.log("\n🔐 ========== LOGIN START (WITH SSO) ==========");
  
  try {
    const { email, password } = req.body;

    // [KEEP ALL EXISTING VALIDATION]
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    const userRepo = dbConnection.getRepository(User);
    
    // [KEEP EXISTING USER QUERY WITH ALL RELATIONS]
    const user = await userRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.profile", "profile")
      .leftJoinAndSelect("user.assignedStudents", "assignedStudents")
      .leftJoinAndSelect("assignedStudents.student", "student")
      .leftJoinAndSelect("user.assignedInstructor", "assignedInstructor")
      .leftJoinAndSelect("assignedInstructor.instructor", "instructor")
      .select([
        "user.id", "user.email", "user.password_hash", 
        "user.first_name", "user.last_name", "user.username",
        "user.phone_number", "user.profile_picture_url", "user.bio",
        "user.account_type", "user.is_verified", "user.is_active",
        "user.date_joined", "user.last_login", "user.country", "user.city",
        "user.social_auth_provider", "user.social_auth_id",
        "profile", "assignedStudents", "student", "assignedInstructor", "instructor"
      ])
      .where("user.email = :email", { email })
      .getOne();

    // [KEEP ALL EXISTING CHECKS: user exists, is_active, password, is_verified]
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Account is deactivated" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.is_verified) {
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

    // ==================== ✅ NEW: SSO SESSION CREATION ====================
    console.log("\n🔐 [SSO] Creating cross-system sessions...");
    
    const sessionRepo = dbConnection.getRepository(UserSession);
    
    // Create session token generators
    const generateSessionToken = () => crypto.randomBytes(32).toString('hex');
    
    // Create Ongera session
    const ongeraSessionToken = generateSessionToken();
    const ongeraSession = sessionRepo.create({
      user_id: user.id,
      system: SystemType.ONGERA,
      session_token: ongeraSessionToken,
      device_info: req.headers['user-agent'] || '',
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      is_active: true
    });
    await sessionRepo.save(ongeraSession);
    console.log("✅ [SSO] Ongera session created");

    // Create BwengePlus session
    const bwengeSessionToken = generateSessionToken();
    const bwengeSession = sessionRepo.create({
      user_id: user.id,
      system: SystemType.BWENGE_PLUS,
      session_token: bwengeSessionToken,
      device_info: req.headers['user-agent'] || '',
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      is_active: true
    });
    await sessionRepo.save(bwengeSession);
    console.log("✅ [SSO] BwengePlus session created");

    // Set user as logged in
    user.isUserLogin = true;
    user.last_login = new Date();
    await userRepo.save(user);
    console.log("✅ [SSO] User isUserLogin set to true");

    // ==================== GENERATE JWT WITH SSO TOKENS ====================
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        account_type: user.account_type,
        is_instructor: user.assignedStudents?.length > 0,
        // ✅ NEW: Include session tokens in JWT
        session_tokens: {
          ongera: ongeraSessionToken,
          bwenge: bwengeSessionToken
        }
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );


    const ssoTokenRepo = dbConnection.getRepository(SSOToken);
    const ssoRedirectToken = crypto.randomBytes(32).toString('hex');
    const ssoTokenRecord = ssoTokenRepo.create({
      user_id: user.id,
      token: ssoRedirectToken,
      target_system: "BWENGE_PLUS",
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      consumed: false
    });
    await ssoTokenRepo.save(ssoTokenRecord);
    console.log("✅ [SSO] SSO redirect token generated");

    // ==================== PREPARE RESPONSE (KEEP ALL EXISTING FIELDS) ====================
    const responseData: any = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      phone_number: user.phone_number,
      profile_picture_url: user.profile_picture_url,
      bio: user.bio,
      account_type: user.account_type,
      is_verified: user.is_verified,
      country: user.country,
      city: user.city,
      
      // Instructor fields
      is_instructor: user.assignedStudents?.length > 0,
      student_count: user.assignedStudents?.length || 0,
      has_assigned_instructor: user.assignedInstructor?.length > 0,
      
      assigned_students: user.assignedStudents?.map(link => ({
        student_id: link.student.id,
        student_name: `${link.student.first_name} ${link.student.last_name}`,
        student_email: link.student.email,
        assigned_at: link.assigned_at
      })) || [],
      
      assigned_instructor: user.assignedInstructor?.length > 0 ? {
        instructor_id: user.assignedInstructor[0].instructor.id,
        instructor_name: `${user.assignedInstructor[0].instructor.first_name} ${user.assignedInstructor[0].instructor.last_name}`,
        instructor_email: user.assignedInstructor[0].instructor.email,
        assigned_at: user.assignedInstructor[0].assigned_at
      } : null,

      // ✅ NEW: SSO fields
      sso_redirect_token: ssoRedirectToken,
      has_multi_system_access: true
    };

    // Add profile data if exists
    if (user.profile) {
      responseData.profile = { ...user.profile };
    }

    console.log("\n✅ ========== LOGIN SUCCESS (WITH SSO) ==========");

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: responseData,
        token,
      },
    });
  } catch (error: any) {
    console.error("\n❌ ========== LOGIN FAILED ==========");
    console.error("Error:", error.message);
    
    res.status(500).json({ 
      success: false, 
      message: "Login failed", 
      error: error.message
    });
  }
}


static async logout(req: Request, res: Response) {
  try {
    console.log("\n👋 [LOGOUT] Starting logout with SSO cleanup...");
    
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const userRepo = dbConnection.getRepository(User);
    const sessionRepo = dbConnection.getRepository(UserSession);

    // ==================== ✅ NEW: FIND ALL USER SESSIONS ====================
    const allSessions = await sessionRepo.find({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    console.log(`📋 [LOGOUT] Found ${allSessions.length} active sessions`);

    const systemsWithSessions = allSessions.map(s => s.system);

    // ==================== ✅ NEW: DEACTIVATE ALL SESSIONS ====================
    await sessionRepo.update(
      { user_id: userId },
      { is_active: false }
    );
    console.log("✅ [LOGOUT] All sessions deactivated");

    // ==================== ✅ NEW: UPDATE USER LOGIN STATUS ====================
    await userRepo.update(
      { id: userId },
      { isUserLogin: false }
    );
    console.log("✅ [LOGOUT] User isUserLogin set to false");

    // [KEEP EXISTING COOKIE CLEARING IF ANY]
    // res.clearCookie('token');

    console.log("✅ [LOGOUT] Logout complete");

    res.json({
      success: true,
      message: "Logged out successfully from all systems",
      data: {
        systems_logged_out: systemsWithSessions
      }
    });
  } catch (error: any) {
    console.error("❌ [LOGOUT] Error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message
    });
  }
}
static async verifyEmail(req: Request, res: Response) {
  console.log("\n✉️ ========== EMAIL VERIFICATION START ==========");
  console.log("📥 Request Body:", JSON.stringify({ email: req.body.email, otp: req.body.otp }, null, 2));
  
  try {
    const { email, otp } = req.body;

    console.log("\n🔍 Step 1: Validating input...");
    if (!email || !otp) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }
    console.log("✅ Input validated");

    const userRepo = dbConnection.getRepository(User);
    const otpRepo = dbConnection.getRepository(Otp);

    console.log("\n🔍 Step 2: Finding user by email:", email);
    const user = await userRepo.findOne({ 
      where: { email },
      relations: ["profile"]
    });

    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    console.log("✅ User found:", { id: user.id, email: user.email, is_verified: user.is_verified });

    // Check if already verified
    if (user.is_verified) {
      console.log("⚠️ Email already verified");
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    console.log("\n🔍 Step 3: Validating OTP...");
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
      console.log("❌ Invalid or expired OTP");
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please request a new verification code."
      });
    }
    console.log("✅ OTP validated successfully");

    console.log("\n🔍 Step 4: Marking OTP as used...");
    // Mark OTP as used
    otpRecord.used = true;
    await otpRepo.save(otpRecord);
    console.log("✅ OTP marked as used");

    console.log("\n🔍 Step 5: Verifying user email...");
    // Verify user email
    user.is_verified = true;
    await userRepo.save(user);
    console.log("✅ User email verified");

    console.log("\n🔍 Step 6: Sending success notification...");
    // Send success notification
    try {
      await sendEmailVerifiedNotification(email, user.first_name, user.last_name);
      console.log("✅ Notification email sent");
    } catch (emailError: any) {
      console.warn("⚠️ Failed to send notification email:", emailError.message);
      // Don't fail verification if email sending fails
    }

    console.log("\n🔍 Step 7: Generating JWT token...");
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, account_type: user.account_type },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    console.log("✅ Token generated successfully");

    console.log("\n✅ ========== EMAIL VERIFICATION SUCCESS ==========");
    console.log("User ID:", user.id);
    console.log("Email:", user.email);
    console.log("Account Type:", user.account_type);
    console.log("Is Verified:", user.is_verified);
    console.log("====================================================\n");

    res.json({
      success: true,
      message: "Email verified successfully! You can now login.",
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
    console.error("\n❌ ========== EMAIL VERIFICATION FAILED ==========");
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    console.error("====================================================\n");
    
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