// @ts-nocheck
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnection from '../database/db';
import { AccountType, User } from "../database/models/User";
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
import { InstructorStudent } from "../database/models/InstructorStudent";
import { Like } from "../database/models/Like";
import { Comment } from "../database/models/Comment";
import { EventAttendee } from "../database/models/EventAttendee";
import { CommunityPost } from "../database/models/CommunityPost";
import { ResearchProject } from "../database/models/ResearchProject";
import { Community } from "../database/models/Community";
import { QAThread } from "../database/models/QAThread";
import { BlogPost } from "../database/models/BlogPost";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthController {
static async register(req: Request, res: Response) {
  
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      phone_number,
      account_type,
      username,
      institution_address,
      institution_type,
      institution_website,
      institution_description,
      IsForWhichSystem = SystemType.ONGERA,
    } = req.body;

    if (!IsForWhichSystem || !Object.values(SystemType).includes(IsForWhichSystem)) {
      return res.status(400).json({
        success: false,
        message: `IsForWhichSystem must be one of: ${Object.values(SystemType).join(', ')}`
      });
    }

    const userRepo = dbConnection.getRepository(User);

    const existingUserByEmail = await userRepo.findOne({ where: { email } });

    if (existingUserByEmail) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    const generatedUsername = username && username.trim() !== ''
      ? username.trim()
      : email.split("@")[0];

    const existingUserByUsername = await userRepo.findOne({
      where: { username: generatedUsername }
    });

    if (existingUserByUsername) {
      const uniqueUsername = `${generatedUsername}_${Date.now()}`;
      return res.status(409).json({
        success: false,
        message: `Username '${generatedUsername}' is already taken.`,
        suggestion: uniqueUsername
      });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const userData = {
      email,
      password_hash,
      first_name: first_name || 'N/A',
      last_name: last_name || '',
      phone_number,
      account_type,
      username: generatedUsername,
      is_verified: false,
      IsForWhichSystem,
      is_institution_member: false,
      institution_ids: [],
    };

    const user = userRepo.create(userData);
    await userRepo.save(user);

    const profileRepo = dbConnection.getRepository(UserProfile);
    const profileData: any = { user };

    if (account_type === 'Institution') {
      profileData.institution_name = first_name;
      profileData.institution_address = institution_address;
      profileData.institution_phone = phone_number;
      profileData.institution_type = institution_type;
      profileData.institution_website = institution_website;
      profileData.institution_description = institution_description;
    }

    const profile = profileRepo.create(profileData);
    await profileRepo.save(profile);

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

    await sendVerificationOTP(email, first_name, last_name, otp);
    res.status(201).json({
      success: true,
      message: "Registration successful.",
      data: {
        email: user.email,
        requires_verification: true,
        user_id: user.id,
        IsForWhichSystem: user.IsForWhichSystem,
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

  static async checkExistingUser(req: Request, res: Response) {
    try {
      const { email, username } = req.query;

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
        }
      }

      if (username) {
        const similarUsers = await userRepo
          .createQueryBuilder('user')
          .where('user.username ILIKE :pattern', { pattern: `${username}%` })
          .select(['user.id', 'user.email', 'user.username', 'user.account_type'])
          .take(5)
          .getMany();

        if (similarUsers.length > 0) {
          results.similar_usernames = similarUsers;
        }
      }

      res.json({
        success: true,
        data: results
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to check existing user",
        error: error.message
      });
    }
  }

  static async getDatabaseStats(req: Request, res: Response) {
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
      res.status(500).json({
        success: false,
        message: "Failed to get database stats",
        error: error.message
      });
    }
  }

static async login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const userRepo = dbConnection.getRepository(User);

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
        "user.IsForWhichSystem", "user.bwenge_role",
        "user.primary_institution_id", "user.is_institution_member", 
        "user.institution_ids", "user.institution_role", 
        "profile", "assignedStudents", "student", "assignedInstructor", "instructor"
      ])
      .where("user.email = :email", { email })
      .getOne();

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

    let needsUpdate = false;
    const updates: any = {};
    
    if (!user.IsForWhichSystem) {
      updates.IsForWhichSystem = SystemType.ONGERA;
      needsUpdate = true;
    }
    
    updates.last_login = new Date();
    updates.isUserLogin = true;
    needsUpdate = true;
    
    if (needsUpdate) {
      await userRepo
        .createQueryBuilder()
        .update(User)
        .set(updates)
        .where("id = :id", { id: user.id })
        .execute();
    }

    const sessionRepo = dbConnection.getRepository(UserSession);

    const ongeraSessionToken = crypto.randomBytes(32).toString('hex');
    const ongeraSession = sessionRepo.create({
      user_id: user.id,
      system: SystemType.ONGERA,
      session_token: ongeraSessionToken,
      device_info: req.headers['user-agent'] || '',
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      is_active: true
    });
    await sessionRepo.save(ongeraSession);

    const bwengeSessionToken = crypto.randomBytes(32).toString('hex');
    const bwengeSession = sessionRepo.create({
      user_id: user.id,
      system: SystemType.BWENGE_PLUS,
      session_token: bwengeSessionToken,
      device_info: req.headers['user-agent'] || '',
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      is_active: true
    });
    await sessionRepo.save(bwengeSession);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        account_type: user.account_type,
        is_instructor: user.assignedStudents?.length > 0,
        system: SystemType.ONGERA,
        session_tokens: {
          ongera: ongeraSessionToken,
          bwenge: bwengeSessionToken
        }
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

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
      IsForWhichSystem: user.IsForWhichSystem || SystemType.ONGERA,
      bwenge_role: user.bwenge_role,
      is_institution_member: user.is_institution_member || false,
      institution_ids: user.institution_ids || [],
      primary_institution_id: user.primary_institution_id,
      institution_role: user.institution_role,
      institution_portal_role: user.institution_portal_role || null,
      is_industrial_supervisor: user.is_industrial_supervisor || false,
      industrial_supervisor_institutions: user.industrial_supervisor_institutions || [],
      has_institution_portal_access: !!(
        user.institution_portal_role ||
        user.is_industrial_supervisor ||
        user.is_institution_member ||
        user.account_type === "Institution"
      ),
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
    };

    if (user.profile) {
      responseData.profile = { ...user.profile };
    }

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: responseData,
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

  static async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const sessionRepo = dbConnection.getRepository(UserSession);

      const allSessions = await sessionRepo.find({
        where: {
          user_id: userId,
          is_active: true
        }
      });

      const systemsWithSessions = allSessions.map(s => s.system);

      await sessionRepo.update(
        { user_id: userId },
        { is_active: false }
      );

      await userRepo.update(
        { id: userId },
        { isUserLogin: false }
      );

      res.json({
        success: true,
        message: "Logged out successfully from all systems",
        data: {
          systems_logged_out: systemsWithSessions
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Logout failed",
        error: error.message
      });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required"
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

      if (user.is_verified) {
        return res.status(400).json({
          success: false,
          message: "Email is already verified"
        });
      }

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
          message: "Invalid or expired OTP. Please request a new verification code."
        });
      }

      otpRecord.used = true;
      await otpRepo.save(otpRecord);

      user.is_verified = true;
      await userRepo.save(user);

      try {
        await sendEmailVerifiedNotification(email, user.first_name, user.last_name);
      } catch (emailError: any) {
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, account_type: user.account_type },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
      );

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
      res.status(500).json({
        success: false,
        message: "Verification failed",
        error: error.message
      });
    }
  }

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
        return res.json({
          success: true,
          message: "If the email exists, a verification code has been sent"
        });
      }

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

      otpRecord.used = true;
      await otpRepo.save(otpRecord);

      user.password_hash = await bcrypt.hash(new_password, 12);

      if (!user.is_verified) {
        user.is_verified = true;
        try {
          await sendEmailVerifiedNotification(
            email,
            user.first_name,
            user.last_name
          );
        } catch (notifyErr: any) {
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
      const updates: any = {
        social_auth_provider: "google",
        social_auth_id: googleId,
        last_login: new Date(),
      };
      
      if (!user.profile_picture_url) {
        updates.profile_picture_url = profilePicture;
      }
      
      if (!user.IsForWhichSystem) {
        updates.IsForWhichSystem = SystemType.ONGERA;
      }
      
      if (!user.is_verified) {
        updates.is_verified = true;
      }
      
      await userRepo
        .createQueryBuilder()
        .update(User)
        .set(updates)
        .where("id = :id", { id: user.id })
        .execute();
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
        is_verified: true,
        account_type: "Student",
        IsForWhichSystem: SystemType.ONGERA,
        institution_ids: [],
        is_institution_member: false,
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
      { 
        userId: user.id, 
        email: user.email, 
        account_type: user.account_type,
        system: SystemType.ONGERA
      },
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
          IsForWhichSystem: user.IsForWhichSystem || SystemType.ONGERA,
          profile: user.profile,
        },
        token: jwtToken,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Google login failed",
      error: error.message
    });
  }
}

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
      const { id } = req.params;
      const { is_active, reason } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "is_active must be a boolean value"
        });
      }

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
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      if (user.is_active === is_active) {
        const statusText = is_active ? 'active' : 'inactive';
        return res.status(400).json({
          success: false,
          message: `User account is already ${statusText}`
        });
      }

      user.is_active = is_active;
      await userRepo.save(user);

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
      } catch (emailError: any) {
      }

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
      res.status(500).json({
        success: false,
        message: "Failed to update user status",
        error: error.message
      });
    }
  }

static async deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    await dbConnection.transaction(async (transactionalEntityManager) => {
      const userRepo = transactionalEntityManager.getRepository(User);
      const profileRepo = transactionalEntityManager.getRepository(UserProfile);
      const sessionRepo = transactionalEntityManager.getRepository(UserSession);
      const otpRepo = transactionalEntityManager.getRepository(Otp);
      const instructorStudentRepo = transactionalEntityManager.getRepository(InstructorStudent);
      const likeRepo = transactionalEntityManager.getRepository(Like);
      const commentRepo = transactionalEntityManager.getRepository(Comment);
      const eventAttendeeRepo = transactionalEntityManager.getRepository(EventAttendee);
      const communityPostRepo = transactionalEntityManager.getRepository(CommunityPost);
      const projectRepo = transactionalEntityManager.getRepository(ResearchProject);
      const communityRepo = transactionalEntityManager.getRepository(Community);
      const eventRepo = transactionalEntityManager.getRepository(Event);
      const qaThreadRepo = transactionalEntityManager.getRepository(QAThread);
      const blogPostRepo = transactionalEntityManager.getRepository(BlogPost);

      const user = await userRepo.findOne({
        where: { id },
        relations: ["profile", "projects", "created_communities", "organized_events", "community_posts", "comments", "likes", "eventAttendances", "qa_threads", "blog_posts"]
      });

      if (!user) {
        throw new Error("User not found");
      }

      const userData = {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        account_type: user.account_type,
        profile: user.profile
      };

      if (user.likes && user.likes.length > 0) {
        await likeRepo.remove(user.likes);
      } else {
        await likeRepo.delete({ user: { id } });
      }

      if (user.comments && user.comments.length > 0) {
        await commentRepo.remove(user.comments);
      } else {
        await commentRepo.delete({ author: { id } });
      }

      if (user.eventAttendances && user.eventAttendances.length > 0) {
        await eventAttendeeRepo.remove(user.eventAttendances);
      } else {
        await eventAttendeeRepo.delete({ user: { id } });
      }

      if (user.community_posts && user.community_posts.length > 0) {
        await communityPostRepo.remove(user.community_posts);
      } else {
        await communityPostRepo.delete({ author: { id } });
      }

      if (user.qa_threads && user.qa_threads.length > 0) {
        await qaThreadRepo.remove(user.qa_threads);
      } else {
        await qaThreadRepo.delete({ asker: { id } });
      }

      if (user.blog_posts && user.blog_posts.length > 0) {
        await blogPostRepo.remove(user.blog_posts);
      } else {
        await blogPostRepo.delete({ author: { id } });
      }

      const instructorResult = await instructorStudentRepo.delete({ instructor: { id } });
      const studentResult = await instructorStudentRepo.delete({ student: { id } });

      await transactionalEntityManager.query(
        `DELETE FROM follows WHERE follower_id = $1 OR following_id = $1`,
        [id]
      );

      if (user.created_communities && user.created_communities.length > 0) {
        const adminUser = await userRepo.findOne({
          where: { account_type: AccountType.ADMIN, is_active: true }
        });

        if (adminUser) {
          for (const community of user.created_communities) {
            community.creator = adminUser;
            await communityRepo.save(community);
          }
        } else {
          await communityRepo.remove(user.created_communities);
        }
      }

      if (user.organized_events && user.organized_events.length > 0) {
        const adminUser = await userRepo.findOne({
          where: { account_type: AccountType.ADMIN, is_active: true }
        });

        if (adminUser) {
          for (const event of user.organized_events) {
            event.organizer = adminUser;
            await eventRepo.save(event);
          }
        } else {
          await eventRepo.remove(user.organized_events);
        }
      }

      if (user.projects && user.projects.length > 0) {
        const adminUser = await userRepo.findOne({
          where: { account_type: AccountType.ADMIN, is_active: true }
        });

        if (adminUser) {
          for (const project of user.projects) {
            project.author = adminUser;
            await projectRepo.save(project);
          }
        } else {
          await projectRepo.remove(user.projects);
        }
      }

      const sessionsResult = await sessionRepo.delete({ user_id: id });

      const otpResult = await otpRepo.delete({ user_id: id });

      if (user.profile) {
        await profileRepo.remove(user.profile);
      } else {
        await profileRepo.delete({ user: { id } });
      }

      await userRepo.remove(user);

      try {
        const emailHtml = ActivateDeactivateDeleteUserTemplate.getDeletionTemplate(userData);

        await sendEmail({
          to: userData.email,
          subject: `🚨 Your Account Has Been Permanently Deleted`,
          html: emailHtml
        });
      } catch (emailError: any) {
      }

      res.json({
        success: true,
        message: "User permanently deleted successfully and notification sent",
        data: {
          deletedUser: {
            email: userData.email,
            name: `${userData.first_name} ${userData.last_name}`
          }
        }
      });

    });

  } catch (error: any) {
    if (error.message === "User not found") {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
        error: error.message
      });
    }
  }
}

  static async getAllUsers(req: Request, res: Response) {
    try {
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

      const total = await queryBuilder.getCount();

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      queryBuilder.orderBy("user.date_joined", "DESC");

      const users = await queryBuilder.getMany();

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
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message
      });
    }
  }
}