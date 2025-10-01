"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../database/db"));
const User_1 = require("../database/models/User");
const UserProfile_1 = require("../database/models/UserProfile");
const Otp_1 = require("../database/models/Otp");
const cloud_1 = require("../helpers/cloud");
const google_auth_library_1 = require("google-auth-library");
const typeorm_1 = require("typeorm");
const emailTemplates_1 = require("../services/emailTemplates");
const utils_1 = require("../helpers/utils");
const crypto_1 = __importDefault(require("crypto"));
const UserSession_1 = require("../database/models/UserSession");
const ActivateDeactivateDeleteUserTemplate_1 = require("../helpers/ActivateDeactivateDeleteUserTemplate");
const InstructorStudent_1 = require("../database/models/InstructorStudent");
const Like_1 = require("../database/models/Like");
const Comment_1 = require("../database/models/Comment");
const EventAttendee_1 = require("../database/models/EventAttendee");
const CommunityPost_1 = require("../database/models/CommunityPost");
const ResearchProject_1 = require("../database/models/ResearchProject");
const Community_1 = require("../database/models/Community");
const QAThread_1 = require("../database/models/QAThread");
const BlogPost_1 = require("../database/models/BlogPost");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
class AuthController {
    static async register(req, res) {
        console.log("\n🚀 ========== REGISTRATION START ==========");
        try {
            const { email, password, first_name, last_name, phone_number, account_type, username, institution_address, institution_type, institution_website, institution_description, IsForWhichSystem = UserSession_1.SystemType.ONGERA, } = req.body;
            console.log("\n📋 Registration Data:");
            console.log("  - System:", IsForWhichSystem);
            if (!IsForWhichSystem || !Object.values(UserSession_1.SystemType).includes(IsForWhichSystem)) {
                return res.status(400).json({
                    success: false,
                    message: `IsForWhichSystem must be one of: ${Object.values(UserSession_1.SystemType).join(', ')}`
                });
            }
            const userRepo = db_1.default.getRepository(User_1.User);
            const existingUserByEmail = await userRepo.findOne({ where: { email } });
            if (existingUserByEmail) {
                console.log("❌ User with this email already exists");
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
            const password_hash = await bcryptjs_1.default.hash(password, 12);
            // ✅ Now enums are already lowercase, use directly
            const userData = {
                email,
                password_hash,
                first_name: first_name || 'N/A',
                last_name: last_name || '',
                phone_number,
                account_type,
                username: generatedUsername,
                is_verified: false,
                IsForWhichSystem, // Direct assignment - enum already lowercase
                is_institution_member: false,
                institution_ids: [],
            };
            const user = userRepo.create(userData);
            await userRepo.save(user);
            console.log(`✅ User created with system: ${IsForWhichSystem}`);
            // Create profile
            const profileRepo = db_1.default.getRepository(UserProfile_1.UserProfile);
            const profileData = { user };
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
            // Generate and send verification OTP
            const otp = (0, emailTemplates_1.generateOTP)();
            const otpRepo = db_1.default.getRepository(Otp_1.Otp);
            const otpRecord = otpRepo.create({
                user_id: user.id,
                otp_code: otp,
                expires_at: new Date(Date.now() + 10 * 60 * 1000),
                purpose: 'email_verification',
                used: false
            });
            await otpRepo.save(otpRecord);
            await (0, emailTemplates_1.sendVerificationOTP)(email, first_name, last_name, otp);
            console.log("\n✅ ========== REGISTRATION SUCCESS ==========");
            console.log("System:", IsForWhichSystem);
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
        }
        catch (error) {
            console.error("\n❌ ========== REGISTRATION FAILED ==========");
            console.error("Error:", error.message);
            res.status(500).json({
                success: false,
                message: "Registration failed",
                error: error.message
            });
        }
    }
    static async updateProfile(req, res) {
        try {
            const userId = req.user.userId;
            const updates = req.body;
            const userRepo = db_1.default.getRepository(User_1.User);
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
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                user.profile_picture_url = uploadResult.secure_url;
            }
            if (updates.first_name)
                user.first_name = updates.first_name;
            if (updates.last_name)
                user.last_name = updates.last_name;
            if (updates.phone_number)
                user.phone_number = updates.phone_number;
            if (updates.bio)
                user.bio = updates.bio;
            if (updates.city)
                user.city = updates.city;
            if (updates.country)
                user.country = updates.country;
            await userRepo.save(user);
            if (updates.profile) {
                const profileData = typeof updates.profile === 'string'
                    ? JSON.parse(updates.profile)
                    : updates.profile;
                const profileRepo = db_1.default.getRepository(UserProfile_1.UserProfile);
                let profile = user.profile;
                if (!profile) {
                    profile = profileRepo.create({
                        user,
                        ...profileData
                    });
                }
                else {
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update profile",
                error: error.message
            });
        }
    }
    static async checkExistingUser(req, res) {
        console.log("\n🔍 ========== CHECK EXISTING USER ==========");
        try {
            const { email, username } = req.query;
            console.log("Checking for:");
            console.log("  - Email:", email);
            console.log("  - Username:", username);
            const userRepo = db_1.default.getRepository(User_1.User);
            const results = {
                email_exists: false,
                username_exists: false,
                users_found: []
            };
            if (email) {
                const userByEmail = await userRepo.findOne({
                    where: { email: email },
                    select: ['id', 'email', 'username', 'account_type', 'date_joined', 'is_verified']
                });
                if (userByEmail) {
                    results.email_exists = true;
                    results.users_found.push({
                        found_by: 'email',
                        user: userByEmail
                    });
                    console.log("✅ Found user by email:", userByEmail.id);
                }
                else {
                    console.log("❌ No user found with email:", email);
                }
            }
            if (username) {
                const userByUsername = await userRepo.findOne({
                    where: { username: username },
                    select: ['id', 'email', 'username', 'account_type', 'date_joined', 'is_verified']
                });
                if (userByUsername) {
                    results.username_exists = true;
                    results.users_found.push({
                        found_by: 'username',
                        user: userByUsername
                    });
                    console.log("✅ Found user by username:", userByUsername.id);
                }
                else {
                    console.log("❌ No user found with username:", username);
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
                    console.log(`✅ Found ${similarUsers.length} similar usernames`);
                }
            }
            console.log("============================================\n");
            res.json({
                success: true,
                data: results
            });
        }
        catch (error) {
            console.error("❌ Check existing user error:", error.message);
            console.error("============================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to check existing user",
                error: error.message
            });
        }
    }
    static async getDatabaseStats(req, res) {
        console.log("\n📊 ========== DATABASE STATS ==========");
        try {
            const userRepo = db_1.default.getRepository(User_1.User);
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
        }
        catch (error) {
            console.error("❌ Database stats error:", error.message);
            console.error("============================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to get database stats",
                error: error.message
            });
        }
    }
    static async login(req, res) {
        var _a, _b, _c, _d, _e, _f, _g;
        console.log("\n🔐 ========== ONGERA: LOGIN START (WITH SSO) ==========");
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required"
                });
            }
            const userRepo = db_1.default.getRepository(User_1.User);
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
            if (user) {
                console.log("📋 [LOGIN PROTECTION - ONGERA] Checking existing user values:");
                console.log(`  - IsForWhichSystem: ${user.IsForWhichSystem}`);
                console.log(`  - BwengeRole: ${user.bwenge_role}`);
                console.log(`  - Institution IDs: ${((_a = user.institution_ids) === null || _a === void 0 ? void 0 : _a.length) || 0}`);
                console.log(`  - Primary Institution: ${user.primary_institution_id}`);
                console.log(`  - Institution Role: ${user.institution_role}`);
            }
            if (!user) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            if (!user.is_active) {
                return res.status(403).json({ success: false, message: "Account is deactivated" });
            }
            const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            if (!user.is_verified) {
                const otp = (0, emailTemplates_1.generateOTP)();
                const otpRepo = db_1.default.getRepository(Otp_1.Otp);
                const otpRecord = otpRepo.create({
                    user_id: user.id,
                    otp_code: otp,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000),
                    purpose: 'email_verification',
                    used: false
                });
                await otpRepo.save(otpRecord);
                await (0, emailTemplates_1.sendVerificationOTP)(email, user.first_name, user.last_name, otp);
                return res.status(403).json({
                    success: false,
                    message: "Email not verified. We've sent a new verification code to your email.",
                    requires_verification: true,
                    email: user.email
                });
            }
            // ==================== ✅ PROTECT CROSS-SYSTEM FIELDS ====================
            let needsUpdate = false;
            const updates = {};
            if (!user.IsForWhichSystem) {
                updates.IsForWhichSystem = UserSession_1.SystemType.ONGERA; // Direct assignment - already lowercase
                needsUpdate = true;
                console.log("✅ Setting IsForWhichSystem to ongera for user");
            }
            // Update last login
            updates.last_login = new Date();
            updates.isUserLogin = true;
            needsUpdate = true;
            if (needsUpdate) {
                await userRepo
                    .createQueryBuilder()
                    .update(User_1.User)
                    .set(updates)
                    .where("id = :id", { id: user.id })
                    .execute();
                console.log("✅ Updated user login info");
            }
            // ==================== SSO SESSION CREATION ====================
            console.log("\n🔐 [SSO] Creating cross-system sessions...");
            const sessionRepo = db_1.default.getRepository(UserSession_1.UserSession);
            // Create Ongera session
            const ongeraSessionToken = crypto_1.default.randomBytes(32).toString('hex');
            const ongeraSession = sessionRepo.create({
                user_id: user.id,
                system: UserSession_1.SystemType.ONGERA, // Direct assignment - already lowercase
                session_token: ongeraSessionToken,
                device_info: req.headers['user-agent'] || '',
                ip_address: req.ip,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                is_active: true
            });
            await sessionRepo.save(ongeraSession);
            console.log("✅ [SSO] Ongera session created");
            // Create BwengePlus session (for SSO)
            const bwengeSessionToken = crypto_1.default.randomBytes(32).toString('hex');
            const bwengeSession = sessionRepo.create({
                user_id: user.id,
                system: UserSession_1.SystemType.BWENGE_PLUS, // Direct assignment - already lowercase
                session_token: bwengeSessionToken,
                device_info: req.headers['user-agent'] || '',
                ip_address: req.ip,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                is_active: true
            });
            await sessionRepo.save(bwengeSession);
            console.log("✅ [SSO] BwengePlus session created");
            // ==================== GENERATE JWT WITH SYSTEM CONTEXT ====================
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                account_type: user.account_type,
                is_instructor: ((_b = user.assignedStudents) === null || _b === void 0 ? void 0 : _b.length) > 0,
                system: UserSession_1.SystemType.ONGERA,
                session_tokens: {
                    ongera: ongeraSessionToken,
                    bwenge: bwengeSessionToken
                }
            }, process.env.JWT_SECRET, { expiresIn: "7d" });
            // ==================== PREPARE RESPONSE ====================
            const responseData = {
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
                // System identification
                IsForWhichSystem: user.IsForWhichSystem || UserSession_1.SystemType.ONGERA,
                // Cross-system fields (preserved)
                bwenge_role: user.bwenge_role,
                is_institution_member: user.is_institution_member || false,
                institution_ids: user.institution_ids || [],
                primary_institution_id: user.primary_institution_id,
                institution_role: user.institution_role,
                // Instructor fields
                is_instructor: ((_c = user.assignedStudents) === null || _c === void 0 ? void 0 : _c.length) > 0,
                student_count: ((_d = user.assignedStudents) === null || _d === void 0 ? void 0 : _d.length) || 0,
                has_assigned_instructor: ((_e = user.assignedInstructor) === null || _e === void 0 ? void 0 : _e.length) > 0,
                assigned_students: ((_f = user.assignedStudents) === null || _f === void 0 ? void 0 : _f.map(link => ({
                    student_id: link.student.id,
                    student_name: `${link.student.first_name} ${link.student.last_name}`,
                    student_email: link.student.email,
                    assigned_at: link.assigned_at
                }))) || [],
                assigned_instructor: ((_g = user.assignedInstructor) === null || _g === void 0 ? void 0 : _g.length) > 0 ? {
                    instructor_id: user.assignedInstructor[0].instructor.id,
                    instructor_name: `${user.assignedInstructor[0].instructor.first_name} ${user.assignedInstructor[0].instructor.last_name}`,
                    instructor_email: user.assignedInstructor[0].instructor.email,
                    assigned_at: user.assignedInstructor[0].assigned_at
                } : null,
            };
            if (user.profile) {
                responseData.profile = { ...user.profile };
            }
            console.log("\n✅ ========== ONGERA: LOGIN SUCCESS ==========");
            console.log(`📋 System: ${responseData.IsForWhichSystem}`);
            console.log(`📋 Cross-system fields preserved: ${!!responseData.bwenge_role}`);
            res.json({
                success: true,
                message: "Login successful",
                data: {
                    user: responseData,
                    token,
                },
            });
        }
        catch (error) {
            console.error("\n❌ ========== ONGERA LOGIN FAILED ==========");
            console.error("Error:", error.message);
            res.status(500).json({
                success: false,
                message: "Login failed",
                error: error.message
            });
        }
    }
    static async logout(req, res) {
        var _a, _b;
        try {
            console.log("\n👋 [LOGOUT] Starting logout with SSO cleanup...");
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || ((_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
            }
            const userRepo = db_1.default.getRepository(User_1.User);
            const sessionRepo = db_1.default.getRepository(UserSession_1.UserSession);
            const allSessions = await sessionRepo.find({
                where: {
                    user_id: userId,
                    is_active: true
                }
            });
            console.log(`📋 [LOGOUT] Found ${allSessions.length} active sessions`);
            const systemsWithSessions = allSessions.map(s => s.system);
            await sessionRepo.update({ user_id: userId }, { is_active: false });
            console.log("✅ [LOGOUT] All sessions deactivated");
            await userRepo.update({ id: userId }, { isUserLogin: false });
            console.log("✅ [LOGOUT] User isUserLogin set to false");
            console.log("✅ [LOGOUT] Logout complete");
            res.json({
                success: true,
                message: "Logged out successfully from all systems",
                data: {
                    systems_logged_out: systemsWithSessions
                }
            });
        }
        catch (error) {
            console.error("❌ [LOGOUT] Error:", error);
            res.status(500).json({
                success: false,
                message: "Logout failed",
                error: error.message
            });
        }
    }
    static async verifyEmail(req, res) {
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
            const userRepo = db_1.default.getRepository(User_1.User);
            const otpRepo = db_1.default.getRepository(Otp_1.Otp);
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
            if (user.is_verified) {
                console.log("⚠️ Email already verified");
                return res.status(400).json({
                    success: false,
                    message: "Email is already verified"
                });
            }
            console.log("\n🔍 Step 3: Validating OTP...");
            const otpRecord = await otpRepo.findOne({
                where: {
                    user_id: user.id,
                    otp_code: otp,
                    purpose: 'email_verification',
                    used: false,
                    expires_at: (0, typeorm_1.MoreThan)(new Date())
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
            otpRecord.used = true;
            await otpRepo.save(otpRecord);
            console.log("✅ OTP marked as used");
            console.log("\n🔍 Step 5: Verifying user email...");
            user.is_verified = true;
            await userRepo.save(user);
            console.log("✅ User email verified");
            console.log("\n🔍 Step 6: Sending success notification...");
            try {
                await (0, emailTemplates_1.sendEmailVerifiedNotification)(email, user.first_name, user.last_name);
                console.log("✅ Notification email sent");
            }
            catch (emailError) {
                console.warn("⚠️ Failed to send notification email:", emailError.message);
            }
            console.log("\n🔍 Step 7: Generating JWT token...");
            const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, account_type: user.account_type }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
        }
        catch (error) {
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
    static async resendVerificationOTP(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });
            }
            const userRepo = db_1.default.getRepository(User_1.User);
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
            const otp = (0, emailTemplates_1.generateOTP)();
            const otpRepo = db_1.default.getRepository(Otp_1.Otp);
            const otpRecord = otpRepo.create({
                user_id: user.id,
                otp_code: otp,
                expires_at: new Date(Date.now() + 10 * 60 * 1000),
                purpose: 'email_verification',
                used: false
            });
            await otpRepo.save(otpRecord);
            await (0, emailTemplates_1.sendVerificationOTP)(email, user.first_name, user.last_name, otp);
            res.json({
                success: true,
                message: "Verification code resent successfully"
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to resend verification code",
                error: error.message
            });
        }
    }
    static async requestPasswordChange(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: "Email is required"
                });
            }
            const userRepo = db_1.default.getRepository(User_1.User);
            const user = await userRepo.findOne({ where: { email } });
            if (!user) {
                return res.json({
                    success: true,
                    message: "If the email exists, a verification code has been sent"
                });
            }
            const otp = (0, emailTemplates_1.generateOTP)();
            const otpRepo = db_1.default.getRepository(Otp_1.Otp);
            const otpRecord = otpRepo.create({
                user_id: user.id,
                otp_code: otp,
                expires_at: new Date(Date.now() + 10 * 60 * 1000),
                purpose: 'password_reset',
                used: false
            });
            await otpRepo.save(otpRecord);
            await (0, emailTemplates_1.sendPasswordChangeOTP)(email, user.first_name, user.last_name, otp);
            res.json({
                success: true,
                message: "Verification code sent to your email"
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to send verification code",
                error: error.message
            });
        }
    }
    static async changePasswordWithOTP(req, res) {
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
            const userRepo = db_1.default.getRepository(User_1.User);
            const otpRepo = db_1.default.getRepository(Otp_1.Otp);
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
                    expires_at: (0, typeorm_1.MoreThan)(new Date())
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
            user.password_hash = await bcryptjs_1.default.hash(new_password, 12);
            if (!user.is_verified) {
                user.is_verified = true;
                try {
                    await (0, emailTemplates_1.sendEmailVerifiedNotification)(email, user.first_name, user.last_name);
                }
                catch (notifyErr) {
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to change password",
                error: error.message
            });
        }
    }
    static async googleLogin(req, res) {
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
            const userRepo = db_1.default.getRepository(User_1.User);
            let user = await userRepo.findOne({
                where: { email },
                relations: ["profile"]
            });
            if (user && !user.social_auth_provider) {
                const updates = {
                    social_auth_provider: "google",
                    social_auth_id: googleId,
                    last_login: new Date(),
                };
                if (!user.profile_picture_url) {
                    updates.profile_picture_url = profilePicture;
                }
                if (!user.IsForWhichSystem) {
                    updates.IsForWhichSystem = UserSession_1.SystemType.ONGERA; // Direct assignment - already lowercase
                }
                if (!user.is_verified) {
                    updates.is_verified = true;
                }
                await userRepo
                    .createQueryBuilder()
                    .update(User_1.User)
                    .set(updates)
                    .where("id = :id", { id: user.id })
                    .execute();
            }
            else if (!user) {
                console.log("📝 Creating new Ongera user from Google login");
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
                    IsForWhichSystem: UserSession_1.SystemType.ONGERA, // Direct assignment - already lowercase
                    institution_ids: [],
                    is_institution_member: false,
                });
                await userRepo.save(user);
                const profileRepo = db_1.default.getRepository(UserProfile_1.UserProfile);
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
            const jwtToken = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                account_type: user.account_type,
                system: UserSession_1.SystemType.ONGERA
            }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
                        IsForWhichSystem: user.IsForWhichSystem || UserSession_1.SystemType.ONGERA,
                        profile: user.profile,
                    },
                    token: jwtToken,
                },
            });
        }
        catch (error) {
            console.error("Google login error:", error);
            res.status(500).json({
                success: false,
                message: "Google login failed",
                error: error.message
            });
        }
    }
    static async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            const userRepo = db_1.default.getRepository(User_1.User);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch profile",
                error: error.message
            });
        }
    }
    static async activateDeactivateUser(req, res) {
        try {
            console.log("\n🔄 ========== ACTIVATE/DEACTIVATE USER START ==========");
            const { id } = req.params;
            const { is_active, reason } = req.body;
            console.log("📥 Request Data:", { userId: id, is_active, reason });
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
            const userRepo = db_1.default.getRepository(User_1.User);
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
            if (user.is_active === is_active) {
                const statusText = is_active ? 'active' : 'inactive';
                return res.status(400).json({
                    success: false,
                    message: `User account is already ${statusText}`
                });
            }
            user.is_active = is_active;
            await userRepo.save(user);
            console.log(`✅ User status updated to: ${is_active ? 'ACTIVE' : 'INACTIVE'}`);
            console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
            try {
                const userData = {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    account_type: user.account_type,
                    profile: user.profile
                };
                const emailHtml = ActivateDeactivateDeleteUserTemplate_1.ActivateDeactivateDeleteUserTemplate.getStatusChangeTemplate(userData, is_active, reason);
                const emailSubject = is_active
                    ? `✅ Your Account Has Been Activated`
                    : `⚠️ Your Account Has Been Deactivated`;
                await (0, utils_1.sendEmail)({
                    to: user.email,
                    subject: emailSubject,
                    html: emailHtml
                });
                console.log(`✅ Email sent successfully to: ${user.email}`);
            }
            catch (emailError) {
                console.error("❌ Email sending failed:", emailError.message);
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
        }
        catch (error) {
            console.error("❌ Activate/Deactivate user error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update user status",
                error: error.message
            });
        }
    }
    static async deleteUser(req, res) {
        try {
            console.log("\n🗑️ ========== DELETE USER (COMPLETE) START ==========");
            const { id } = req.params;
            const adminId = req.user.userId;
            console.log("📥 Request Data:", { userId: id, adminId });
            // Start a transaction to ensure all-or-nothing deletion
            await db_1.default.transaction(async (transactionalEntityManager) => {
                var _a, _b, _c;
                const userRepo = transactionalEntityManager.getRepository(User_1.User);
                const profileRepo = transactionalEntityManager.getRepository(UserProfile_1.UserProfile);
                const sessionRepo = transactionalEntityManager.getRepository(UserSession_1.UserSession);
                const otpRepo = transactionalEntityManager.getRepository(Otp_1.Otp);
                const instructorStudentRepo = transactionalEntityManager.getRepository(InstructorStudent_1.InstructorStudent);
                const likeRepo = transactionalEntityManager.getRepository(Like_1.Like);
                const commentRepo = transactionalEntityManager.getRepository(Comment_1.Comment);
                const eventAttendeeRepo = transactionalEntityManager.getRepository(EventAttendee_1.EventAttendee);
                const communityPostRepo = transactionalEntityManager.getRepository(CommunityPost_1.CommunityPost);
                const projectRepo = transactionalEntityManager.getRepository(ResearchProject_1.ResearchProject);
                const communityRepo = transactionalEntityManager.getRepository(Community_1.Community);
                const eventRepo = transactionalEntityManager.getRepository(Event);
                const qaThreadRepo = transactionalEntityManager.getRepository(QAThread_1.QAThread);
                const blogPostRepo = transactionalEntityManager.getRepository(BlogPost_1.BlogPost);
                // Step 1: Find user with all relations
                console.log("📍 STEP 1: Fetching user with relations...");
                const user = await userRepo.findOne({
                    where: { id },
                    relations: ["profile", "projects", "created_communities", "organized_events", "community_posts", "comments", "likes", "eventAttendances", "qa_threads", "blog_posts"]
                });
                if (!user) {
                    console.log("❌ User not found");
                    throw new Error("User not found");
                }
                console.log("✅ User found:", {
                    name: `${user.first_name} ${user.last_name}`,
                    email: user.email,
                    projectsCount: ((_a = user.projects) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    communitiesCount: ((_b = user.created_communities) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    eventsCount: ((_c = user.organized_events) === null || _c === void 0 ? void 0 : _c.length) || 0
                });
                const userData = {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    account_type: user.account_type,
                    profile: user.profile
                };
                // ==================== DELETE ALL RELATED DATA IN CORRECT ORDER ====================
                console.log("\n📍 STEP 2: Deleting related data...");
                // 1. Delete user's likes
                if (user.likes && user.likes.length > 0) {
                    console.log(`   📋 Deleting ${user.likes.length} likes...`);
                    await likeRepo.remove(user.likes);
                }
                else {
                    await likeRepo.delete({ user: { id } });
                }
                // 2. Delete user's comments
                if (user.comments && user.comments.length > 0) {
                    console.log(`   📋 Deleting ${user.comments.length} comments...`);
                    await commentRepo.remove(user.comments);
                }
                else {
                    await commentRepo.delete({ author: { id } });
                }
                // 3. Delete user's event attendances
                if (user.eventAttendances && user.eventAttendances.length > 0) {
                    console.log(`   📋 Deleting ${user.eventAttendances.length} event attendances...`);
                    await eventAttendeeRepo.remove(user.eventAttendances);
                }
                else {
                    await eventAttendeeRepo.delete({ user: { id } });
                }
                // 4. Delete user's community posts
                if (user.community_posts && user.community_posts.length > 0) {
                    console.log(`   📋 Deleting ${user.community_posts.length} community posts...`);
                    await communityPostRepo.remove(user.community_posts);
                }
                else {
                    await communityPostRepo.delete({ author: { id } });
                }
                // 5. Delete user's QA threads
                if (user.qa_threads && user.qa_threads.length > 0) {
                    console.log(`   📋 Deleting ${user.qa_threads.length} QA threads...`);
                    await qaThreadRepo.remove(user.qa_threads);
                }
                else {
                    await qaThreadRepo.delete({ asker: { id } });
                }
                // 6. Delete user's blog posts
                if (user.blog_posts && user.blog_posts.length > 0) {
                    console.log(`   📋 Deleting ${user.blog_posts.length} blog posts...`);
                    await blogPostRepo.remove(user.blog_posts);
                }
                else {
                    await blogPostRepo.delete({ author: { id } });
                }
                // 7. Delete instructor-student relationships
                console.log("   📋 Deleting instructor-student relationships...");
                const instructorResult = await instructorStudentRepo.delete({ instructor: { id } });
                const studentResult = await instructorStudentRepo.delete({ student: { id } });
                console.log(`   ✅ Deleted ${instructorResult.affected || 0} instructor relationships`);
                console.log(`   ✅ Deleted ${studentResult.affected || 0} student relationships`);
                // 8. Delete follower/following relationships
                console.log("   📋 Deleting follower relationships...");
                await transactionalEntityManager.query(`DELETE FROM follows WHERE follower_id = $1 OR following_id = $1`, [id]);
                // 9. Transfer ownership or delete user's communities
                if (user.created_communities && user.created_communities.length > 0) {
                    console.log(`   📋 Handling ${user.created_communities.length} created communities...`);
                    // Find an admin to transfer ownership to
                    const adminUser = await userRepo.findOne({
                        where: { account_type: User_1.AccountType.ADMIN, is_active: true }
                    });
                    if (adminUser) {
                        // Transfer ownership to admin
                        for (const community of user.created_communities) {
                            community.creator = adminUser;
                            await communityRepo.save(community);
                        }
                        console.log(`   ✅ Transferred ${user.created_communities.length} communities to admin`);
                    }
                    else {
                        // No admin found, delete communities
                        await communityRepo.remove(user.created_communities);
                        console.log(`   ✅ Deleted ${user.created_communities.length} communities`);
                    }
                }
                // 10. Transfer ownership or delete user's events
                if (user.organized_events && user.organized_events.length > 0) {
                    console.log(`   📋 Handling ${user.organized_events.length} organized events...`);
                    const adminUser = await userRepo.findOne({
                        where: { account_type: User_1.AccountType.ADMIN, is_active: true }
                    });
                    if (adminUser) {
                        for (const event of user.organized_events) {
                            event.organizer = adminUser;
                            await eventRepo.save(event);
                        }
                        console.log(`   ✅ Transferred ${user.organized_events.length} events to admin`);
                    }
                    else {
                        await eventRepo.remove(user.organized_events);
                        console.log(`   ✅ Deleted ${user.organized_events.length} events`);
                    }
                }
                // 11. Transfer ownership or delete user's projects
                if (user.projects && user.projects.length > 0) {
                    console.log(`   📋 Handling ${user.projects.length} research projects...`);
                    const adminUser = await userRepo.findOne({
                        where: { account_type: User_1.AccountType.ADMIN, is_active: true }
                    });
                    if (adminUser) {
                        for (const project of user.projects) {
                            project.author = adminUser;
                            await projectRepo.save(project);
                        }
                        console.log(`   ✅ Transferred ${user.projects.length} projects to admin`);
                    }
                    else {
                        await projectRepo.remove(user.projects);
                        console.log(`   ✅ Deleted ${user.projects.length} projects`);
                    }
                }
                // 12. Delete user's sessions
                console.log("   📋 Deleting user sessions...");
                const sessionsResult = await sessionRepo.delete({ user_id: id });
                console.log(`   ✅ Deleted ${sessionsResult.affected || 0} sessions`);
                // 13. Delete OTP records
                console.log("   📋 Deleting OTP records...");
                const otpResult = await otpRepo.delete({ user_id: id });
                console.log(`   ✅ Deleted ${otpResult.affected || 0} OTP records`);
                // 14. Delete user profile
                if (user.profile) {
                    console.log("   📋 Deleting user profile...");
                    await profileRepo.remove(user.profile);
                }
                else {
                    await profileRepo.delete({ user: { id } });
                }
                // 15. Finally delete the user
                console.log("📍 STEP 3: Permanently deleting user...");
                await userRepo.remove(user);
                console.log("✅ User permanently deleted:", user.id);
                // ==================== SEND EMAIL NOTIFICATION ====================
                console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
                try {
                    const emailHtml = ActivateDeactivateDeleteUserTemplate_1.ActivateDeactivateDeleteUserTemplate.getDeletionTemplate(userData);
                    await (0, utils_1.sendEmail)({
                        to: userData.email,
                        subject: `🚨 Your Account Has Been Permanently Deleted`,
                        html: emailHtml
                    });
                    console.log(`✅ Deletion notification email sent to: ${userData.email}`);
                }
                catch (emailError) {
                    console.error("❌ Email sending failed:", emailError.message);
                }
                console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
                // Send response from within the transaction
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
            }); // End of transaction
            console.log("🗑️ ========== DELETE USER END ==========\n");
        }
        catch (error) {
            console.error("❌ ========== DELETE USER ERROR ==========");
            if (error.message === "User not found") {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                detail: error.detail
            });
            console.error("=========================================\n");
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Failed to delete user",
                    error: error.message
                });
            }
        }
    }
    static async getAllUsers(req, res) {
        try {
            console.log("\n🔍 [GET ALL USERS] Starting...");
            const { page = 1, limit = 20, search, account_type, is_active } = req.query;
            const userRepo = db_1.default.getRepository(User_1.User);
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
                queryBuilder.andWhere("(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search OR user.username ILIKE :search)", { search: `%${search}%` });
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
        }
        catch (error) {
            console.error("❌ Get all users error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch users",
                error: error.message
            });
        }
    }
}
exports.AuthController = AuthController;
