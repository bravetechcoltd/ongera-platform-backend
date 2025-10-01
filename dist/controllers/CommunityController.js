"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityController = void 0;
const Community_1 = require("../database/models/Community");
const db_1 = __importDefault(require("../database/db"));
const cloud_1 = require("../helpers/cloud");
const ResearchProject_1 = require("../database/models/ResearchProject");
const CommunityPost_1 = require("../database/models/CommunityPost");
const utils_1 = require("../helpers/utils");
const ActivateDeactiveCommunityTemplate_1 = require("../helpers/ActivateDeactiveCommunityTemplate");
const User_1 = require("../database/models/User");
const SendEmailToAdminTemplate_1 = require("../helpers/SendEmailToAdminTemplate");
const ApproveRejectCommunityToCreatorTemplate_1 = require("../helpers/ApproveRejectCommunityToCreatorTemplate");
const JoinRequestEmailTemplate_1 = require("../helpers/JoinRequestEmailTemplate");
const SubscribeController_1 = require("./SubscribeController");
const CommunityJoinRequest_1 = require("../database/models/CommunityJoinRequest");
const ApproveUserRequestToJoinCommunityTemplate_1 = require("../helpers/ApproveUserRequestToJoinCommunityTemplate");
class CommunityController {
    // ✅ Add route debugging middleware
    static logRoute(routeName, req) {
        var _a;
        console.log(`\n🔍 [${new Date().toISOString()}] Route Hit: ${routeName}`);
        console.log(`   Method: ${req.method}`);
        console.log(`   Path: ${req.path}`);
        console.log(`   Params:`, req.params);
        console.log(`   Query:`, req.query);
        console.log(`   User:`, ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || 'Not authenticated');
    }
    static async createCommunityPost(req, res) {
        try {
            CommunityController.logRoute('createCommunityPost', req);
            const userId = req.user.userId;
            const { community_id } = req.params;
            const { content, title, post_type = "DISCUSSION", linked_project_id } = req.body;
            console.log(`📝 Creating post in community: ${community_id}`, {
                title,
                post_type,
                hasFile: !!req.file
            });
            // Validate required fields
            if (!content) {
                return res.status(400).json({
                    success: false,
                    message: "Post content is required"
                });
            }
            if (!community_id) {
                return res.status(400).json({
                    success: false,
                    message: "Community ID is required"
                });
            }
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const postRepo = db_1.default.getRepository(CommunityPost_1.CommunityPost);
            // Check if community exists and user is a member
            const community = await communityRepo.findOne({
                where: { id: community_id },
                relations: ["members", "creator"]
            });
            if (!community) {
                console.log(`   ❌ Community not found: ${community_id}`);
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            if (!community.is_active) {
                return res.status(403).json({
                    success: false,
                    message: "This community is not active"
                });
            }
            // Check if user is a member of the community
            const isMember = community.members.some(member => member.id === userId) ||
                community.creator.id === userId;
            if (!isMember) {
                console.log(`   ❌ User ${userId} is not a member of community ${community_id}`);
                return res.status(403).json({
                    success: false,
                    message: "You must be a member of this community to post"
                });
            }
            // Validate linked project if provided
            let linkedProject = null;
            if (linked_project_id) {
                const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
                const project = await projectRepo.findOne({
                    where: { id: linked_project_id },
                    relations: ["author"]
                });
                if (!project || project.author.id !== userId) {
                    return res.status(403).json({
                        success: false,
                        message: "You can only link your own projects"
                    });
                }
                linkedProject = project;
            }
            // Create the post
            const post = postRepo.create({
                community: { id: community_id },
                author: { id: userId },
                post_type: post_type,
                title: title || `Post by User ${userId.substring(0, 8)}...`,
                content,
                linked_project: linked_project_id ? { id: linked_project_id } : null,
                media_urls: []
            });
            // Handle image upload if provided
            if (req.file) {
                console.log("🖼️ Uploading post image:", req.file.originalname);
                try {
                    const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                    post.media_urls = [uploadResult.secure_url];
                    console.log("✅ Post image uploaded:", uploadResult.secure_url);
                }
                catch (uploadError) {
                    console.error("❌ Image upload failed:", uploadError.message);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload post image",
                        error: uploadError.message
                    });
                }
            }
            // Save the post
            await postRepo.save(post);
            // Update community post count
            community.post_count += 1;
            await communityRepo.save(community);
            console.log(`✅ Post created successfully in community ${community_id}:`, post.id);
            // Fetch the complete post with relations
            const completePost = await postRepo.findOne({
                where: { id: post.id },
                relations: ["author", "author.profile", "linked_project", "community"]
            });
            res.status(201).json({
                success: true,
                message: "Post created successfully",
                data: { post: completePost },
            });
        }
        catch (error) {
            console.error("❌ Create community post error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create post",
                error: error.message
            });
        }
    }
    // ✅ NEW: Get posts from a specific community
    static async getCommunityPosts(req, res) {
        try {
            CommunityController.logRoute('getCommunityPosts', req);
            const { community_id } = req.params;
            const { page = 1, limit = 20, post_type, author_id } = req.query;
            console.log(`📖 Fetching posts for community: ${community_id}`, {
                page,
                limit,
                post_type,
                author_id
            });
            // Validate community_id
            if (!community_id) {
                return res.status(400).json({
                    success: false,
                    message: "Community ID is required"
                });
            }
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const postRepo = db_1.default.getRepository(CommunityPost_1.CommunityPost);
            // Check if community exists
            const community = await communityRepo.findOne({
                where: { id: community_id }
            });
            if (!community) {
                console.log(`   ❌ Community not found: ${community_id}`);
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            // Build query for posts
            const queryBuilder = postRepo.createQueryBuilder("post")
                .leftJoinAndSelect("post.author", "author")
                .leftJoinAndSelect("author.profile", "profile")
                .leftJoinAndSelect("post.linked_project", "linked_project")
                .leftJoinAndSelect("post.community", "community")
                .where("post.community_id = :community_id", { community_id })
                .andWhere("community.is_active = :isActive", { isActive: true });
            // Apply filters
            if (post_type) {
                queryBuilder.andWhere("post.post_type = :post_type", { post_type });
            }
            if (author_id) {
                queryBuilder.andWhere("post.author_id = :author_id", { author_id });
            }
            // Pagination
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            // Order by creation date (newest first) and pinned posts first
            queryBuilder.orderBy("post.is_pinned", "DESC")
                .addOrderBy("post.created_at", "DESC");
            const [posts, total] = await queryBuilder.getManyAndCount();
            console.log(`   ✅ Found ${posts.length} posts in community (${total} total)`);
            res.json({
                success: true,
                data: {
                    posts,
                    community: {
                        id: community.id,
                        name: community.name,
                        description: community.description
                    },
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit)),
                    },
                },
            });
        }
        catch (error) {
            console.error("❌ Get community posts error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch community posts",
                error: error.message
            });
        }
    }
    static async createCommunity(req, res) {
        try {
            CommunityController.logRoute('createCommunity', req);
            const userId = req.user.userId;
            const { name, description, category, community_type, join_approval_required, rules } = req.body;
            console.log("📝 Creating community:", { name, category, community_type });
            if (!name || !description || !category) {
                return res.status(400).json({
                    success: false,
                    message: "Name, description, and category are required"
                });
            }
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const userRepo = db_1.default.getRepository(User_1.User);
            const slug = name.toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]/g, '')
                .substring(0, 100);
            const existingCommunity = await communityRepo.findOne({ where: { slug } });
            if (existingCommunity) {
                return res.status(409).json({
                    success: false,
                    message: "A community with this name already exists"
                });
            }
            // Get creator details
            const creator = await userRepo.findOne({
                where: { id: userId },
                relations: ["profile"]
            });
            if (!creator) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            const community = communityRepo.create({
                name,
                slug,
                description,
                category,
                community_type: community_type || 'Public',
                join_approval_required: join_approval_required === 'true' || join_approval_required === true,
                is_active: false,
                creator: { id: userId },
                rules: rules || null
            });
            if (req.file) {
                console.log("🖼️ Uploading cover image:", req.file.originalname);
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                community.cover_image_url = uploadResult.secure_url;
                console.log("✅ Cover image uploaded:", uploadResult.secure_url);
            }
            await communityRepo.save(community);
            community.members = [{ id: userId }];
            community.member_count = 1;
            await communityRepo.save(community);
            console.log("✅ Community created successfully:", community.id);
            // ==================== SEND EMAIL TO ADMIN ====================
            console.log("\n📧 ========== SENDING EMAIL TO ADMIN ==========");
            try {
                const admins = await userRepo.find({
                    where: { account_type: User_1.AccountType.ADMIN, is_active: true }
                });
                console.log(`📊 Found ${admins.length} admin user(s)`);
                if (admins.length === 0) {
                    console.log("⚠️ No admin users found to notify");
                }
                else {
                    const communityData = {
                        name: community.name,
                        description: community.description,
                        category: community.category,
                        community_type: community.community_type,
                        cover_image_url: community.cover_image_url,
                        creator: {
                            first_name: creator.first_name,
                            last_name: creator.last_name,
                            email: creator.email,
                            profile: creator.profile
                        },
                        community_id: community.id,
                        created_at: community.created_at
                    };
                    let emailsSent = 0;
                    let emailsFailed = 0;
                    for (const admin of admins) {
                        try {
                            console.log(`\n📧 Sending notification to admin: ${admin.email}`);
                            const adminData = {
                                first_name: admin.first_name || 'Admin',
                                email: admin.email
                            };
                            const emailHtml = SendEmailToAdminTemplate_1.SendEmailToAdminTemplate.getNewCommunityNotification(communityData, adminData);
                            await (0, utils_1.sendEmail)({
                                to: admin.email,
                                subject: `⏳ New Community Awaiting Approval: ${community.name}`,
                                html: emailHtml
                            });
                            emailsSent++;
                            console.log(`✅ Email sent successfully to: ${admin.email}`);
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        catch (emailError) {
                            emailsFailed++;
                            console.error(`❌ Failed to send email to ${admin.email}:`, emailError.message);
                        }
                    }
                    console.log("\n📊 === EMAIL NOTIFICATION SUMMARY ===");
                    console.log(`✅ Successfully sent: ${emailsSent}/${admins.length}`);
                    console.log(`❌ Failed: ${emailsFailed}/${admins.length}`);
                }
            }
            catch (emailSystemError) {
                console.error("❌ Email system error:", emailSystemError.message);
                console.error("⚠️ Community was created, but admin notification failed");
            }
            console.log("📧 ========== EMAIL TO ADMIN COMPLETE ==========\n");
            // ==================== NOTIFY SUBSCRIBERS ====================
            // ✅ NEW SECTION - Send notifications to platform subscribers
            try {
                console.log("📧 ========== NOTIFYING SUBSCRIBERS ==========");
                const subscriberNotificationData = {
                    name: community.name,
                    description: community.description,
                    category: community.category,
                    community_type: community.community_type,
                    cover_image_url: community.cover_image_url,
                    creator: {
                        first_name: creator.first_name,
                        last_name: creator.last_name
                    },
                    community_id: community.id,
                    created_at: community.created_at
                };
                // Call the subscriber notification method (non-blocking)
                SubscribeController_1.SubscribeController.notifyNewCommunity(subscriberNotificationData)
                    .catch(err => {
                    console.error("❌ Subscriber notification failed:", err.message);
                });
                console.log("✅ Subscriber notification process initiated");
                console.log("📧 ========== SUBSCRIBER NOTIFICATION INITIATED ==========\n");
            }
            catch (subscriberError) {
                console.error("❌ Subscriber notification error:", subscriberError.message);
                // Don't fail the request if subscriber notification fails
            }
            // ==================== END SUBSCRIBER NOTIFICATION ====================
            res.status(201).json({
                success: true,
                message: "Community submitted for approval. You'll be notified once it's reviewed.",
                data: { community },
            });
        }
        catch (error) {
            console.error("❌ Community creation error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create community",
                error: error.message
            });
        }
    }
    // Updated approveCommunity method with creator email notification
    static async approveCommunity(req, res) {
        try {
            CommunityController.logRoute('approveCommunity', req);
            const { id } = req.params;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["creator", "creator.profile"],
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            if (community.is_active) {
                return res.status(400).json({
                    success: false,
                    message: "Community is already approved"
                });
            }
            community.is_active = true;
            await communityRepo.save(community);
            console.log("✅ Community approved:", community.id);
            // ==================== SEND EMAIL TO CREATOR ====================
            console.log("\n📧 ========== SENDING APPROVAL EMAIL TO CREATOR ==========");
            try {
                const creatorEmail = community.creator.email;
                console.log(`📧 Sending approval notification to: ${creatorEmail}`);
                const communityData = {
                    name: community.name,
                    description: community.description,
                    category: community.category,
                    community_type: community.community_type,
                    cover_image_url: community.cover_image_url,
                    community_id: community.id
                };
                const creatorData = {
                    first_name: community.creator.first_name,
                    email: creatorEmail
                };
                const emailHtml = ApproveRejectCommunityToCreatorTemplate_1.ApproveRejectCommunityToCreatorTemplate.getApprovalTemplate(communityData, creatorData);
                await (0, utils_1.sendEmail)({
                    to: creatorEmail,
                    subject: `🎉 Your Community "${community.name}" Has Been Approved!`,
                    html: emailHtml
                });
                console.log(`✅ Approval email sent successfully to: ${creatorEmail}`);
            }
            catch (emailError) {
                console.error("❌ Failed to send approval email:", emailError.message);
                console.error("⚠️ Community was approved, but creator notification failed");
                // Don't throw error - approval succeeded
            }
            console.log("📧 ========== APPROVAL EMAIL COMPLETE ==========\n");
            res.json({
                success: true,
                message: "Community approved successfully and creator notified",
                data: { community },
            });
        }
        catch (error) {
            console.error("❌ Approve community error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to approve community",
                error: error.message
            });
        }
    }
    // Updated rejectCommunity method with creator email notification
    static async rejectCommunity(req, res) {
        try {
            CommunityController.logRoute('rejectCommunity', req);
            const { id } = req.params;
            const { reason } = req.body;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["creator", "creator.profile"],
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            if (community.is_active) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot reject an approved community"
                });
            }
            // Store community data before deletion
            const communityData = {
                name: community.name,
                description: community.description,
                category: community.category,
                community_type: community.community_type,
                cover_image_url: community.cover_image_url,
                community_id: community.id
            };
            const creatorData = {
                first_name: community.creator.first_name,
                email: community.creator.email
            };
            // ==================== SEND EMAIL TO CREATOR ====================
            console.log("\n📧 ========== SENDING REJECTION EMAIL TO CREATOR ==========");
            try {
                console.log(`📧 Sending rejection notification to: ${creatorData.email}`);
                const emailHtml = ApproveRejectCommunityToCreatorTemplate_1.ApproveRejectCommunityToCreatorTemplate.getRejectionTemplate(communityData, creatorData, reason);
                await (0, utils_1.sendEmail)({
                    to: creatorData.email,
                    subject: `❌ Community Application Update: ${communityData.name}`,
                    html: emailHtml
                });
                console.log(`✅ Rejection email sent successfully to: ${creatorData.email}`);
            }
            catch (emailError) {
                console.error("❌ Failed to send rejection email:", emailError.message);
                // Continue with deletion even if email fails
            }
            console.log("📧 ========== REJECTION EMAIL COMPLETE ==========\n");
            // Delete the community
            await communityRepo.remove(community);
            console.log("✅ Community rejected and deleted:", id);
            res.json({
                success: true,
                message: "Community rejected successfully and creator notified",
            });
        }
        catch (error) {
            console.error("❌ Reject community error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to reject community",
                error: error.message
            });
        }
    }
    static async getAllCommunitiesForAdmin(req, res) {
        try {
            CommunityController.logRoute('getAllCommunitiesForAdmin', req);
            const { page = 1, limit = 20, search, category, status } = req.query;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const queryBuilder = communityRepo.createQueryBuilder("community")
                .leftJoinAndSelect("community.creator", "creator")
                .leftJoinAndSelect("creator.profile", "profile");
            // Filter by status - allow viewing both active and inactive
            if (status === 'pending') {
                queryBuilder.where("community.is_active = :isActive", { isActive: false });
            }
            else if (status === 'approved') {
                queryBuilder.where("community.is_active = :isActive", { isActive: true });
            }
            // If status is 'all', don't filter by is_active
            if (search) {
                queryBuilder.andWhere("(community.name ILIKE :search OR community.description ILIKE :search)", { search: `%${search}%` });
            }
            if (category) {
                queryBuilder.andWhere("community.category = :category", { category });
            }
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            queryBuilder.orderBy("community.created_at", "DESC");
            const [communities, total] = await queryBuilder.getManyAndCount();
            console.log(`   ✅ Found ${communities.length} communities for admin (${total} total)`);
            res.json({
                success: true,
                data: {
                    communities,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit)),
                    },
                },
            });
        }
        catch (error) {
            console.error("❌ Admin fetch communities error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch communities",
                error: error.message
            });
        }
    }
    static async getCommunityById(req, res) {
        try {
            CommunityController.logRoute('getCommunityById', req);
            const { id } = req.params;
            console.log(`   Attempting to find community with ID: ${id}`);
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                console.log(`   ❌ Invalid UUID format: ${id}`);
                return res.status(400).json({
                    success: false,
                    message: "Invalid community ID format"
                });
            }
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["creator", "creator.profile", "members"],
            });
            if (!community) {
                console.log(`   ❌ Community not found`);
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            console.log(`   ✅ Community found: ${community.name} (Active: ${community.is_active})`);
            res.json({
                success: true,
                data: { community },
            });
        }
        catch (error) {
            console.error(`   ❌ Error in getCommunityById:`, error.message);
            res.status(500).json({
                success: false,
                message: "Failed to fetch community",
                error: error.message
            });
        }
    }
    static async getPendingCommunities(req, res) {
        try {
            CommunityController.logRoute('getPendingCommunities', req);
            const { page = 1, limit = 20 } = req.query;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const queryBuilder = communityRepo.createQueryBuilder("community")
                .leftJoinAndSelect("community.creator", "creator")
                .leftJoinAndSelect("creator.profile", "profile")
                .where("community.is_active = :isActive", { isActive: false });
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            queryBuilder.orderBy("community.created_at", "DESC");
            const [communities, total] = await queryBuilder.getManyAndCount();
            console.log(`   ✅ Found ${communities.length} pending communities`);
            res.json({
                success: true,
                data: {
                    communities,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / Number(limit)),
                    },
                },
            });
        }
        catch (error) {
            console.error("❌ Fetch pending communities error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch pending communities",
                error: error.message
            });
        }
    }
    static async deleteCommunity(req, res) {
        try {
            CommunityController.logRoute('deleteCommunity', req);
            const { id } = req.params;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["creator"],
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            await communityRepo.remove(community);
            console.log("✅ Community deleted:", community.id);
            res.json({
                success: true,
                message: "Community deleted successfully",
            });
        }
        catch (error) {
            console.error("❌ Delete community error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to delete community",
                error: error.message
            });
        }
    }
    static async leaveCommunity(req, res) {
        try {
            CommunityController.logRoute('leaveCommunity', req);
            const { id } = req.params;
            const userId = req.user.userId;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["members", "creator"],
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            if (community.creator.id === userId) {
                return res.status(400).json({
                    success: false,
                    message: "Creator cannot leave the community"
                });
            }
            community.members = community.members.filter(member => member.id !== userId);
            community.member_count = Math.max(0, community.member_count - 1);
            await communityRepo.save(community);
            console.log("✅ User left community");
            res.json({
                success: true,
                message: "Left community successfully",
            });
        }
        catch (error) {
            console.error("❌ Leave community error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to leave community",
                error: error.message
            });
        }
    }
    static async createPost(req, res) {
        try {
            CommunityController.logRoute('createPost', req);
            const userId = req.user.userId;
            const { community_ids, content, linked_project_id, post_type = "LinkedProject" } = req.body;
            if (!community_ids || !Array.isArray(community_ids) || community_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one community ID is required"
                });
            }
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const project = await projectRepo.findOne({
                where: { id: linked_project_id },
                relations: ["author"]
            });
            if (!project || project.author.id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "You can only link your own projects"
                });
            }
            const postRepo = db_1.default.getRepository(CommunityPost_1.CommunityPost);
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const createdPosts = [];
            for (const communityId of community_ids) {
                const community = await communityRepo.findOne({
                    where: { id: communityId },
                    relations: ["members"]
                });
                if (!community)
                    continue;
                const isMember = community.members.some(member => member.id === userId);
                if (!isMember)
                    continue;
                const post = postRepo.create({
                    community: { id: communityId },
                    author: { id: userId },
                    post_type: post_type,
                    title: `New Research: ${project.title}`,
                    content,
                    linked_project: { id: linked_project_id }
                });
                await postRepo.save(post);
                community.post_count += 1;
                await communityRepo.save(community);
                createdPosts.push(post);
            }
            console.log(`✅ Created ${createdPosts.length} posts`);
            res.status(201).json({
                success: true,
                message: `Posted to ${createdPosts.length} ${createdPosts.length === 1 ? 'community' : 'communities'}`,
                data: { posts: createdPosts }
            });
        }
        catch (error) {
            console.error("❌ Create post error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create posts",
                error: error.message
            });
        }
    }
    static async getSuggestedCommunities(req, res) {
        try {
            CommunityController.logRoute('getSuggestedCommunities', req);
            const { projectId } = req.params;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const project = await projectRepo.findOne({
                where: { id: projectId },
                relations: ["tags"]
            });
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found"
                });
            }
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const queryBuilder = communityRepo.createQueryBuilder("community")
                .leftJoinAndSelect("community.creator", "creator")
                .where("community.is_active = :isActive", { isActive: true });
            if (project.field_of_study) {
                queryBuilder.andWhere("community.category ILIKE :field", {
                    field: `%${project.field_of_study}%`
                });
            }
            queryBuilder
                .orderBy("community.member_count", "DESC")
                .take(6);
            const communities = await queryBuilder.getMany();
            console.log(`✅ Found ${communities.length} suggested communities`);
            res.json({
                success: true,
                data: { communities }
            });
        }
        catch (error) {
            console.error("❌ Get suggested communities error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch suggested communities",
                error: error.message
            });
        }
    }
    static async getCommunityMembers(req, res) {
        try {
            CommunityController.logRoute('getCommunityMembers', req);
            const { community_id } = req.params;
            if (!community_id) {
                return res.status(400).json({
                    success: false,
                    message: "Community ID is required"
                });
            }
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id: community_id },
                relations: ["members", "members.profile", "creator", "creator.profile"]
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            if (!community.is_active) {
                return res.status(403).json({
                    success: false,
                    message: "This community is not active"
                });
            }
            res.json({
                success: true,
                data: { members: community.members, creator: community.creator }
            });
        }
        catch (error) {
            console.error("❌ Get community members error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch community members",
                error: error.message
            });
        }
    }
    static async activateDeactivateCommunity(req, res) {
        try {
            CommunityController.logRoute('activateDeactivateCommunity', req);
            const { id } = req.params;
            const { is_active, reason } = req.body;
            console.log("🔄 ========== ACTIVATE/DEACTIVATE COMMUNITY START ==========");
            console.log("📥 Request Data:", { communityId: id, is_active, reason });
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
                    message: "Reason is required when deactivating a community"
                });
            }
            // Step 1: Find community with all necessary relations
            console.log("📍 STEP 1: Fetching community with relations...");
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["creator", "creator.profile", "members", "members.profile"]
            });
            if (!community) {
                console.log("❌ Community not found");
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            console.log("✅ Community found:", {
                name: community.name,
                currentStatus: community.is_active,
                newStatus: is_active,
                memberCount: community.members.length
            });
            // Check if status is already the same
            if (community.is_active === is_active) {
                const statusText = is_active ? 'active' : 'inactive';
                return res.status(400).json({
                    success: false,
                    message: `Community is already ${statusText}`
                });
            }
            // Step 2: Update community status
            console.log("📍 STEP 2: Updating community status...");
            community.is_active = is_active;
            await communityRepo.save(community);
            console.log(`✅ Community status updated to: ${is_active ? 'ACTIVE' : 'INACTIVE'}`);
            // Step 3: Send email notifications
            console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
            console.log("📍 STEP 3: Preparing to send email notifications...");
            const actionText = is_active ? 'activation' : 'deactivation';
            try {
                // Prepare list of recipients (all members + creator)
                const allRecipients = [...community.members];
                // Ensure creator is included if not already in members
                const creatorInMembers = allRecipients.some(m => m.id === community.creator.id);
                if (!creatorInMembers) {
                    allRecipients.push(community.creator);
                }
                console.log("📊 Email Distribution Plan:", {
                    totalRecipients: allRecipients.length,
                    includesCreator: true,
                    action: actionText
                });
                let emailsSent = 0;
                let emailsFailed = 0;
                const failedEmails = [];
                // Prepare community data for email template
                const communityData = {
                    name: community.name,
                    description: community.description,
                    category: community.category,
                    member_count: community.member_count,
                    cover_image_url: community.cover_image_url,
                    creator: {
                        first_name: community.creator.first_name,
                        last_name: community.creator.last_name,
                        profile: community.creator.profile
                    },
                    community_id: community.id,
                    is_active: is_active,
                    reason: reason || undefined
                };
                // Send emails to all recipients
                for (let i = 0; i < allRecipients.length; i++) {
                    const recipient = allRecipients[i];
                    const progress = `[${i + 1}/${allRecipients.length}]`;
                    try {
                        console.log(`\n${progress} 📧 Preparing email for: ${recipient.email}`);
                        console.log(`   Name: ${recipient.first_name} ${recipient.last_name}`);
                        console.log(`   Role: ${recipient.id === community.creator.id ? 'Creator' : 'Member'}`);
                        const userData = {
                            first_name: recipient.first_name,
                            email: recipient.email
                        };
                        // Generate email HTML using the template
                        const emailHtml = ActivateDeactiveCommunityTemplate_1.ActivateDeactiveCommunityTemplate.getStatusChangeTemplate(communityData, userData, is_active);
                        console.log(`   ✉️ Email HTML generated (${emailHtml.length} chars)`);
                        console.log(`   📬 Sending email via sendEmail function...`);
                        // Determine email subject based on action
                        const emailSubject = is_active
                            ? `✅ Community Activated: ${community.name}`
                            : `⚠️ Community Deactivated: ${community.name}`;
                        // Send email
                        await (0, utils_1.sendEmail)({
                            to: recipient.email,
                            subject: emailSubject,
                            html: emailHtml
                        });
                        emailsSent++;
                        console.log(`   ✅ SUCCESS: Email sent to ${recipient.email}`);
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    catch (emailError) {
                        emailsFailed++;
                        const errorMsg = emailError.message || 'Unknown error';
                        console.error(`   ❌ FAILED: ${recipient.email}`);
                        console.error(`   Error: ${errorMsg}`);
                        failedEmails.push({
                            email: recipient.email,
                            error: errorMsg
                        });
                    }
                }
                // Email distribution summary
                console.log("\n📊 === EMAIL DISTRIBUTION SUMMARY ===");
                console.log(`✅ Successfully sent: ${emailsSent}/${allRecipients.length}`);
                console.log(`❌ Failed: ${emailsFailed}/${allRecipients.length}`);
                console.log(`📧 Success rate: ${((emailsSent / allRecipients.length) * 100).toFixed(1)}%`);
                if (failedEmails.length > 0) {
                    console.log("\n❌ Failed emails:");
                    failedEmails.forEach((fail, idx) => {
                        console.log(`  ${idx + 1}. ${fail.email} - ${fail.error}`);
                    });
                }
            }
            catch (emailSystemError) {
                console.error("❌ Email system error:", emailSystemError.message);
                console.error("⚠️ Community status was updated, but email notifications failed");
                // Don't throw error - status update succeeded
            }
            console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
            console.log("🔄 ========== ACTIVATE/DEACTIVATE COMMUNITY END ==========\n");
            // Step 4: Return success response
            const statusText = is_active ? 'activated' : 'deactivated';
            res.json({
                success: true,
                message: `Community ${statusText} successfully and notifications sent to all members`,
                data: {
                    community: {
                        id: community.id,
                        name: community.name,
                        is_active: community.is_active,
                        member_count: community.member_count
                    }
                }
            });
        }
        catch (error) {
            console.error("❌ ========== ERROR IN ACTIVATE/DEACTIVATE COMMUNITY ==========");
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            console.error("================================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to update community status",
                error: error.message
            });
        }
    }
    // NEW: Request to join community (replaces instant join for approval-required communities)
    static async requestToJoinCommunity(req, res) {
        try {
            CommunityController.logRoute('requestToJoinCommunity', req);
            const { id } = req.params;
            const userId = req.user.userId;
            const { message } = req.body;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            const userRepo = db_1.default.getRepository(User_1.User);
            // Get community with creator and members
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["creator", "creator.profile", "members"],
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            if (!community.is_active) {
                return res.status(403).json({
                    success: false,
                    message: "This community is not active"
                });
            }
            // Check if user is already a member
            const isMember = community.members.some(member => member.id === userId);
            if (isMember) {
                return res.status(400).json({
                    success: false,
                    message: "You are already a member of this community"
                });
            }
            // Check if there's already a pending request
            const existingRequest = await joinRequestRepo.findOne({
                where: {
                    community: { id },
                    user: { id: userId },
                    status: CommunityJoinRequest_1.JoinRequestStatus.PENDING
                }
            });
            if (existingRequest) {
                return res.status(400).json({
                    success: false,
                    message: "You already have a pending request for this community"
                });
            }
            // Create join request
            const joinRequest = joinRequestRepo.create({
                community: { id },
                user: { id: userId },
                status: CommunityJoinRequest_1.JoinRequestStatus.PENDING,
                message: message || null
            });
            await joinRequestRepo.save(joinRequest);
            console.log("✅ Join request created:", joinRequest.id);
            // ==================== SEND EMAIL TO CREATOR ====================
            console.log("\n📧 ========== SENDING JOIN REQUEST EMAIL TO CREATOR ==========");
            try {
                // Get requester details
                const requester = await userRepo.findOne({
                    where: { id: userId },
                    relations: ["profile"]
                });
                if (requester) {
                    const requestData = {
                        community_name: community.name,
                        community_description: community.description,
                        community_id: community.id,
                        cover_image_url: community.cover_image_url,
                        requester: {
                            first_name: requester.first_name,
                            last_name: requester.last_name,
                            email: requester.email,
                            profile_picture_url: requester.profile_picture_url,
                            account_type: requester.account_type,
                            profile: requester.profile
                        },
                        request_id: joinRequest.id,
                        requested_at: joinRequest.requested_at
                    };
                    const creatorData = {
                        first_name: community.creator.first_name,
                        email: community.creator.email
                    };
                    const emailHtml = ApproveUserRequestToJoinCommunityTemplate_1.ApproveUserRequestToJoinCommunityTemplate.getJoinRequestNotification(requestData, creatorData);
                    await (0, utils_1.sendEmail)({
                        to: community.creator.email,
                        subject: `👋 New Join Request for "${community.name}"`,
                        html: emailHtml
                    });
                    console.log(`✅ Join request email sent to creator: ${community.creator.email}`);
                }
            }
            catch (emailError) {
                console.error("❌ Failed to send join request email:", emailError.message);
            }
            console.log("📧 ========== JOIN REQUEST EMAIL COMPLETE ==========\n");
            res.status(201).json({
                success: true,
                message: "Join request submitted successfully. You'll be notified when it's reviewed.",
                data: { joinRequest }
            });
        }
        catch (error) {
            console.error("❌ Request to join community error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to submit join request",
                error: error.message
            });
        }
    }
    // NEW: Get pending join requests for a community (for creator/admin)
    static async getCommunityJoinRequests(req, res) {
        try {
            CommunityController.logRoute('getCommunityJoinRequests', req);
            const { community_id } = req.params;
            const userId = req.user.userId;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            // Verify user is the creator of the community
            const community = await communityRepo.findOne({
                where: { id: community_id },
                relations: ["creator"]
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            if (community.creator.id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Only the community creator can view join requests"
                });
            }
            // Get pending join requests
            const joinRequests = await joinRequestRepo.find({
                where: {
                    community: { id: community_id },
                    status: CommunityJoinRequest_1.JoinRequestStatus.PENDING
                },
                relations: ["user", "user.profile"],
                order: { requested_at: "DESC" }
            });
            res.json({
                success: true,
                data: { joinRequests }
            });
        }
        catch (error) {
            console.error("❌ Get join requests error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch join requests",
                error: error.message
            });
        }
    }
    static async getUserPendingRequests(req, res) {
        try {
            CommunityController.logRoute('getUserPendingRequests', req);
            const userId = req.user.userId;
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            const pendingRequests = await joinRequestRepo.find({
                where: {
                    user: { id: userId },
                    status: CommunityJoinRequest_1.JoinRequestStatus.PENDING
                },
                relations: ["community", "community.creator"],
                order: { requested_at: "DESC" }
            });
            res.json({
                success: true,
                data: { pendingRequests }
            });
        }
        catch (error) {
            console.error("❌ Get user pending requests error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch pending requests",
                error: error.message
            });
        }
    }
    // Key changes in joinCommunity endpoint:
    // 1. When creating join request, immediately set status in response
    // 2. Return proper status information to client
    static async joinCommunity(req, res) {
        try {
            CommunityController.logRoute('joinCommunity', req);
            const { id } = req.params;
            const userId = req.user.userId;
            const { message } = req.body;
            console.log("\n🔄 ========== JOIN COMMUNITY REQUEST START ==========");
            console.log("📥 Request Data:", { communityId: id, userId, hasMessage: !!message });
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            const userRepo = db_1.default.getRepository(User_1.User);
            // Step 1: Get community with all necessary relations
            console.log("📍 STEP 1: Fetching community...");
            const community = await communityRepo.findOne({
                where: { id },
                relations: ["members", "creator", "creator.profile"],
            });
            if (!community) {
                console.log("❌ Community not found");
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            console.log("✅ Community found:", community.name);
            if (!community.is_active) {
                console.log("❌ Community is inactive");
                return res.status(403).json({
                    success: false,
                    message: "This community is pending approval"
                });
            }
            // Check if already a member
            const isMember = community.members.some(member => member.id === userId);
            if (isMember) {
                console.log("❌ User is already a member");
                return res.status(400).json({
                    success: false,
                    message: "Already a member of this community"
                });
            }
            // Step 2: Handle join based on approval requirement
            console.log("📍 STEP 2: Checking approval requirement...");
            console.log(`   Approval Required: ${community.join_approval_required}`);
            if (community.join_approval_required) {
                // Check for existing pending request
                const existingRequest = await joinRequestRepo.findOne({
                    where: {
                        community: { id },
                        user: { id: userId },
                        status: CommunityJoinRequest_1.JoinRequestStatus.PENDING
                    }
                });
                if (existingRequest) {
                    console.log("❌ Pending request already exists");
                    return res.status(400).json({
                        success: false,
                        message: "You already have a pending request for this community",
                        data: {
                            joinRequest: existingRequest,
                            // ✅ CRITICAL: Return proper status so client knows the state
                            user_join_request_status: 'pending',
                            user_join_request_id: existingRequest.id
                        }
                    });
                }
                // Create join request
                console.log("📍 STEP 3: Creating join request...");
                const joinRequest = joinRequestRepo.create({
                    community: { id },
                    user: { id: userId },
                    status: CommunityJoinRequest_1.JoinRequestStatus.PENDING,
                    message: message || null
                });
                await joinRequestRepo.save(joinRequest);
                console.log("✅ Join request created:", joinRequest.id);
                // Step 4: Get requester details for emails
                console.log("📍 STEP 4: Fetching requester details...");
                const requester = await userRepo.findOne({
                    where: { id: userId },
                    relations: ["profile"]
                });
                if (!requester) {
                    console.log("❌ Requester not found");
                    return res.status(404).json({
                        success: false,
                        message: "User not found"
                    });
                }
                console.log("✅ Requester found:", requester.email);
                // Step 5: Send emails (keeping your existing email logic)
                console.log("\n📧 ========== SENDING EMAIL NOTIFICATIONS ==========");
                const communityData = {
                    name: community.name,
                    description: community.description,
                    community_id: community.id,
                    cover_image_url: community.cover_image_url,
                    category: community.category,
                    community_type: community.community_type
                };
                const requesterData = {
                    first_name: requester.first_name,
                    last_name: requester.last_name,
                    email: requester.email,
                    profile_picture_url: requester.profile_picture_url,
                    account_type: requester.account_type
                };
                let emailsSent = 0;
                let emailsFailed = 0;
                // EMAIL 1: To Community Creator
                try {
                    console.log("\n📧 [1/3] Sending email to Community Creator...");
                    console.log(`   Recipient: ${community.creator.email}`);
                    const creatorData = {
                        first_name: community.creator.first_name,
                        email: community.creator.email
                    };
                    const creatorEmailHtml = JoinRequestEmailTemplate_1.JoinRequestEmailTemplate.getCreatorNotification(communityData, requesterData, creatorData, joinRequest.id);
                    await (0, utils_1.sendEmail)({
                        to: community.creator.email,
                        subject: `👋 New Join Request for "${community.name}"`,
                        html: creatorEmailHtml
                    });
                    emailsSent++;
                    console.log("   ✅ Email sent to creator successfully");
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (emailError) {
                    emailsFailed++;
                    console.error("   ❌ Failed to send email to creator:", emailError.message);
                }
                // EMAIL 2: To All Admins
                try {
                    console.log("\n📧 [2/3] Sending email to Admins...");
                    const admins = await userRepo.find({
                        where: { account_type: User_1.AccountType.ADMIN, is_active: true }
                    });
                    console.log(`   Found ${admins.length} admin(s)`);
                    for (const admin of admins) {
                        try {
                            console.log(`   Sending to admin: ${admin.email}`);
                            const adminData = {
                                first_name: admin.first_name || 'Admin',
                                email: admin.email
                            };
                            const creatorInfo = {
                                first_name: community.creator.first_name,
                                last_name: community.creator.last_name,
                                email: community.creator.email
                            };
                            const adminEmailHtml = JoinRequestEmailTemplate_1.JoinRequestEmailTemplate.getAdminNotification(communityData, requesterData, creatorInfo, adminData, joinRequest.id);
                            await (0, utils_1.sendEmail)({
                                to: admin.email,
                                subject: `🔔 New Join Request in "${community.name}"`,
                                html: adminEmailHtml
                            });
                            emailsSent++;
                            console.log(`   ✅ Email sent to ${admin.email}`);
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        catch (adminEmailError) {
                            emailsFailed++;
                            console.error(`   ❌ Failed to send email to ${admin.email}:`, adminEmailError.message);
                        }
                    }
                }
                catch (adminError) {
                    emailsFailed++;
                    console.error("   ❌ Admin email system error:", adminError.message);
                }
                // EMAIL 3: To Requester (Confirmation)
                try {
                    console.log("\n📧 [3/3] Sending confirmation email to Requester...");
                    console.log(`   Recipient: ${requester.email}`);
                    const requesterEmailHtml = JoinRequestEmailTemplate_1.JoinRequestEmailTemplate.getRequesterConfirmation(communityData, requesterData);
                    await (0, utils_1.sendEmail)({
                        to: requester.email,
                        subject: `✅ Thank You for Your Request to Join "${community.name}"`,
                        html: requesterEmailHtml
                    });
                    emailsSent++;
                    console.log("   ✅ Confirmation email sent to requester");
                }
                catch (emailError) {
                    emailsFailed++;
                    console.error("   ❌ Failed to send confirmation email:", emailError.message);
                }
                // Email Summary
                console.log("\n📊 === EMAIL NOTIFICATION SUMMARY ===");
                console.log(`✅ Successfully sent: ${emailsSent}`);
                console.log(`❌ Failed: ${emailsFailed}`);
                console.log("📧 ========== EMAIL NOTIFICATIONS COMPLETE ==========\n");
                console.log("🔄 ========== JOIN COMMUNITY REQUEST END ==========\n");
                // ✅ CRITICAL: Return proper status information
                return res.status(201).json({
                    success: true,
                    message: "Join request submitted successfully. You'll receive notifications via email.",
                    requiresApproval: true,
                    data: {
                        joinRequest,
                        // ✅ Add these fields so client knows the current state
                        user_join_request_status: 'pending',
                        user_join_request_id: joinRequest.id,
                        can_user_join: false,
                        can_user_visit: false
                    }
                });
            }
            // No approval required - join immediately
            console.log("📍 STEP 3: Adding user to community (no approval required)...");
            community.members.push({ id: userId });
            community.member_count += 1;
            await communityRepo.save(community);
            console.log("✅ User joined community instantly");
            console.log("🔄 ========== JOIN COMMUNITY REQUEST END ==========\n");
            res.json({
                success: true,
                message: "Joined community successfully",
                requiresApproval: false,
                data: {
                    user_join_request_status: 'approved',
                    can_user_join: false,
                    can_user_visit: true,
                    is_user_member: true
                }
            });
        }
        catch (error) {
            console.error("❌ ========== ERROR IN JOIN COMMUNITY ==========");
            console.error("Error details:", error.message);
            console.error("=================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to join community",
                error: error.message
            });
        }
    }
    static async approveJoinRequest(req, res) {
        try {
            CommunityController.logRoute('approveJoinRequest', req);
            const { request_id } = req.params;
            const userId = req.user.userId;
            console.log("\n✅ ========== APPROVE JOIN REQUEST START ==========");
            console.log("📥 Request Data:", { requestId: request_id, approverId: userId });
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            // Step 1: Get join request with all relations
            console.log("📍 STEP 1: Fetching join request...");
            const joinRequest = await joinRequestRepo.findOne({
                where: { id: request_id },
                relations: ["community", "community.creator", "community.members", "user", "user.profile"]
            });
            if (!joinRequest) {
                console.log("❌ Join request not found");
                return res.status(404).json({
                    success: false,
                    message: "Join request not found"
                });
            }
            console.log("✅ Join request found");
            console.log(`   Community: ${joinRequest.community.name}`);
            console.log(`   Requester: ${joinRequest.user.email}`);
            // Verify user is the creator
            if (joinRequest.community.creator.id !== userId) {
                console.log("❌ User is not the community creator");
                return res.status(403).json({
                    success: false,
                    message: "Only the community creator can approve join requests"
                });
            }
            if (joinRequest.status !== CommunityJoinRequest_1.JoinRequestStatus.PENDING) {
                console.log("❌ Request already processed");
                return res.status(400).json({
                    success: false,
                    message: "This request has already been processed"
                });
            }
            // Step 2: Update request status
            console.log("📍 STEP 2: Updating request status to APPROVED...");
            joinRequest.status = CommunityJoinRequest_1.JoinRequestStatus.APPROVED;
            joinRequest.responded_at = new Date();
            joinRequest.responded_by = { id: userId };
            await joinRequestRepo.save(joinRequest);
            console.log("✅ Request status updated");
            // Step 3: Add user to community
            console.log("📍 STEP 3: Adding user to community members...");
            joinRequest.community.members.push(joinRequest.user);
            joinRequest.community.member_count += 1;
            await communityRepo.save(joinRequest.community);
            console.log("✅ User added to community");
            // Step 4: Send approval email to requester
            console.log("\n📧 ========== SENDING APPROVAL EMAIL ==========");
            try {
                console.log(`📧 Sending approval notification to: ${joinRequest.user.email}`);
                const communityData = {
                    name: joinRequest.community.name,
                    description: joinRequest.community.description,
                    community_id: joinRequest.community.id,
                    cover_image_url: joinRequest.community.cover_image_url,
                    category: joinRequest.community.category,
                    community_type: joinRequest.community.community_type
                };
                const requesterData = {
                    first_name: joinRequest.user.first_name,
                    last_name: joinRequest.user.last_name,
                    email: joinRequest.user.email,
                    profile_picture_url: joinRequest.user.profile_picture_url,
                    account_type: joinRequest.user.account_type
                };
                const approvalEmailHtml = JoinRequestEmailTemplate_1.JoinRequestEmailTemplate.getApprovalNotification(communityData, requesterData);
                await (0, utils_1.sendEmail)({
                    to: joinRequest.user.email,
                    subject: `🎉 Welcome to "${joinRequest.community.name}"!`,
                    html: approvalEmailHtml
                });
                console.log("✅ Approval email sent successfully");
            }
            catch (emailError) {
                console.error("❌ Failed to send approval email:", emailError.message);
                console.error("⚠️ Request was approved, but email notification failed");
            }
            console.log("📧 ========== APPROVAL EMAIL COMPLETE ==========\n");
            console.log("✅ ========== APPROVE JOIN REQUEST END ==========\n");
            res.json({
                success: true,
                message: "Join request approved successfully and user notified"
            });
        }
        catch (error) {
            console.error("❌ ========== ERROR IN APPROVE JOIN REQUEST ==========");
            console.error("Error details:", error.message);
            console.error("======================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to approve join request",
                error: error.message
            });
        }
    }
    static async rejectJoinRequest(req, res) {
        try {
            CommunityController.logRoute('rejectJoinRequest', req);
            const { request_id } = req.params;
            const userId = req.user.userId;
            const { reason } = req.body;
            console.log("\n❌ ========== REJECT JOIN REQUEST START ==========");
            console.log("📥 Request Data:", { requestId: request_id, rejecterId: userId, hasReason: !!reason });
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            // Step 1: Get join request with relations
            console.log("📍 STEP 1: Fetching join request...");
            const joinRequest = await joinRequestRepo.findOne({
                where: { id: request_id },
                relations: ["community", "community.creator", "user"]
            });
            if (!joinRequest) {
                console.log("❌ Join request not found");
                return res.status(404).json({
                    success: false,
                    message: "Join request not found"
                });
            }
            console.log("✅ Join request found");
            console.log(`   Community: ${joinRequest.community.name}`);
            console.log(`   Requester: ${joinRequest.user.email}`);
            // Verify user is the creator
            if (joinRequest.community.creator.id !== userId) {
                console.log("❌ User is not the community creator");
                return res.status(403).json({
                    success: false,
                    message: "Only the community creator can reject join requests"
                });
            }
            if (joinRequest.status !== CommunityJoinRequest_1.JoinRequestStatus.PENDING) {
                console.log("❌ Request already processed");
                return res.status(400).json({
                    success: false,
                    message: "This request has already been processed"
                });
            }
            // Step 2: Update request status
            console.log("📍 STEP 2: Updating request status to REJECTED...");
            joinRequest.status = CommunityJoinRequest_1.JoinRequestStatus.REJECTED;
            joinRequest.responded_at = new Date();
            joinRequest.responded_by = { id: userId };
            await joinRequestRepo.save(joinRequest);
            console.log("✅ Request status updated");
            // Step 3: Send rejection email to requester
            console.log("\n📧 ========== SENDING REJECTION EMAIL ==========");
            try {
                console.log(`📧 Sending rejection notification to: ${joinRequest.user.email}`);
                const communityData = {
                    name: joinRequest.community.name,
                    description: joinRequest.community.description,
                    community_id: joinRequest.community.id,
                    cover_image_url: joinRequest.community.cover_image_url,
                    category: joinRequest.community.category,
                    community_type: joinRequest.community.community_type
                };
                const requesterData = {
                    first_name: joinRequest.user.first_name,
                    last_name: joinRequest.user.last_name,
                    email: joinRequest.user.email,
                    profile_picture_url: joinRequest.user.profile_picture_url,
                    account_type: joinRequest.user.account_type
                };
                const rejectionEmailHtml = JoinRequestEmailTemplate_1.JoinRequestEmailTemplate.getRejectionNotification(communityData, requesterData, reason);
                await (0, utils_1.sendEmail)({
                    to: joinRequest.user.email,
                    subject: `Update on Your Request to Join "${joinRequest.community.name}"`,
                    html: rejectionEmailHtml
                });
                console.log("✅ Rejection email sent successfully");
            }
            catch (emailError) {
                console.error("❌ Failed to send rejection email:", emailError.message);
                console.error("⚠️ Request was rejected, but email notification failed");
            }
            console.log("📧 ========== REJECTION EMAIL COMPLETE ==========\n");
            console.log("❌ ========== REJECT JOIN REQUEST END ==========\n");
            res.json({
                success: true,
                message: "Join request rejected successfully and user notified"
            });
        }
        catch (error) {
            console.error("❌ ========== ERROR IN REJECT JOIN REQUEST ==========");
            console.error("Error details:", error.message);
            console.error("======================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to reject join request",
                error: error.message
            });
        }
    }
    // ========== FIXED getAllCommunities ==========
    static async getAllCommunities(req, res) {
        var _a;
        try {
            CommunityController.logRoute('getAllCommunities', req);
            const { page = 1, limit = 12, search, category } = req.query;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            const queryBuilder = communityRepo.createQueryBuilder("community")
                .leftJoinAndSelect("community.creator", "creator")
                .leftJoinAndSelect("creator.profile", "profile")
                .leftJoinAndSelect("community.members", "members")
                .leftJoinAndSelect("members.profile", "memberProfile")
                .where("community.is_active = :isActive", { isActive: true });
            if (search) {
                queryBuilder.andWhere("(community.name ILIKE :search OR community.description ILIKE :search)", { search: `%${search}%` });
            }
            if (category) {
                queryBuilder.andWhere("community.category = :category", { category });
            }
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            queryBuilder.orderBy("community.created_at", "DESC");
            const [communities, total] = await queryBuilder.getManyAndCount();
            // Get user's join requests if authenticated
            let userJoinRequestsMap = new Map();
            if (userId) {
                const userJoinRequests = await joinRequestRepo
                    .createQueryBuilder("request")
                    .leftJoinAndSelect("request.community", "community")
                    .where("request.user_id = :userId", { userId })
                    .getMany();
                console.log(`✅ Found ${userJoinRequests.length} join requests for user ${userId.substring(0, 8)}...`);
                userJoinRequests.forEach(request => {
                    // ✅ FIX: Check if community relation exists before accessing id
                    if (request.community && request.community.id) {
                        userJoinRequestsMap.set(request.community.id, {
                            status: request.status,
                            id: request.id
                        });
                    }
                });
            }
            // ✅ Get ALL pending join requests for each community
            const communityIds = communities.map(c => c.id);
            let pendingRequestsMap = new Map();
            if (communityIds.length > 0) {
                const allPendingRequests = await joinRequestRepo
                    .createQueryBuilder("request")
                    .leftJoinAndSelect("request.user", "user")
                    .leftJoinAndSelect("user.profile", "userProfile")
                    .leftJoinAndSelect("request.community", "community")
                    .where("request.community_id IN (:...communityIds)", { communityIds })
                    .andWhere("request.status = :status", { status: CommunityJoinRequest_1.JoinRequestStatus.PENDING })
                    .orderBy("request.requested_at", "DESC")
                    .getMany();
                console.log(`✅ Found ${allPendingRequests.length} total pending requests across communities`);
                // Group by community
                allPendingRequests.forEach(request => {
                    // ✅ FIX: Check if community relation exists before accessing id
                    if (request.community && request.community.id) {
                        const communityId = request.community.id;
                        if (!pendingRequestsMap.has(communityId)) {
                            pendingRequestsMap.set(communityId, []);
                        }
                        // Format the request data
                        pendingRequestsMap.get(communityId).push({
                            id: request.id,
                            status: request.status,
                            message: request.message,
                            requested_at: request.requested_at,
                            user: {
                                id: request.user.id,
                                first_name: request.user.first_name,
                                last_name: request.user.last_name,
                                email: request.user.email,
                                profile_picture_url: request.user.profile_picture_url,
                                account_type: request.user.account_type,
                                profile: request.user.profile ? {
                                    id: request.user.profile.id,
                                    institution_name: request.user.profile.institution_name,
                                    department: request.user.profile.department,
                                    academic_level: request.user.profile.academic_level,
                                    current_position: request.user.profile.current_position,
                                    research_interests: request.user.profile.research_interests
                                } : null
                            }
                        });
                    }
                });
                console.log(`✅ Grouped pending requests by community`);
            }
            // Filter out REJECTED communities for current user
            const filteredCommunities = communities.filter(community => {
                if (!userId)
                    return true;
                const joinRequest = userJoinRequestsMap.get(community.id);
                if (joinRequest && joinRequest.status === CommunityJoinRequest_1.JoinRequestStatus.REJECTED) {
                    console.log(`   🚫 Filtering out rejected community: ${community.name}`);
                    return false;
                }
                return true;
            });
            // Map communities with all data
            const enhancedCommunities = filteredCommunities.map(community => {
                const isUserMember = userId
                    ? community.members.some(member => member.id === userId) || community.creator.id === userId
                    : false;
                // Get join request for this community
                const joinRequest = userJoinRequestsMap.get(community.id);
                let userJoinRequestStatus = null;
                let canJoin = true;
                let canVisit = isUserMember;
                if (userId) {
                    if (isUserMember) {
                        userJoinRequestStatus = 'approved';
                        canJoin = false;
                        canVisit = true;
                    }
                    else if (joinRequest) {
                        if (joinRequest.status === CommunityJoinRequest_1.JoinRequestStatus.PENDING) {
                            userJoinRequestStatus = 'pending';
                            canJoin = false;
                            canVisit = false;
                        }
                        else if (joinRequest.status === CommunityJoinRequest_1.JoinRequestStatus.APPROVED) {
                            userJoinRequestStatus = 'approved';
                            canJoin = false;
                            canVisit = true;
                        }
                    }
                    else {
                        userJoinRequestStatus = 'not_requested';
                        canJoin = true;
                        canVisit = false;
                    }
                }
                // Get pending requests for this community
                const pendingJoinRequests = pendingRequestsMap.get(community.id) || [];
                // Format members
                const membersData = community.members.map(member => ({
                    id: member.id,
                    first_name: member.first_name,
                    last_name: member.last_name,
                    email: member.email,
                    profile_picture_url: member.profile_picture_url,
                    account_type: member.account_type,
                    bio: member.bio,
                    profile: member.profile ? {
                        id: member.profile.id,
                        institution_name: member.profile.institution_name,
                        department: member.profile.department,
                        academic_level: member.profile.academic_level,
                        current_position: member.profile.current_position,
                        research_interests: member.profile.research_interests
                    } : null
                }));
                return {
                    ...community,
                    creator: {
                        id: community.creator.id,
                        first_name: community.creator.first_name,
                        last_name: community.creator.last_name,
                        email: community.creator.email,
                        profile_picture_url: community.creator.profile_picture_url,
                        account_type: community.creator.account_type,
                        bio: community.creator.bio,
                        profile: community.creator.profile ? {
                            id: community.creator.profile.id,
                            institution_name: community.creator.profile.institution_name,
                            department: community.creator.profile.department,
                            academic_level: community.creator.profile.academic_level,
                            current_position: community.creator.profile.current_position,
                            research_interests: community.creator.profile.research_interests
                        } : null
                    },
                    members: membersData,
                    is_user_member: isUserMember,
                    user_membership_status: isUserMember ? 'member' : 'not_member',
                    user_join_request_status: userJoinRequestStatus,
                    user_join_request_id: (joinRequest === null || joinRequest === void 0 ? void 0 : joinRequest.id) || null,
                    can_user_join: canJoin,
                    can_user_visit: canVisit,
                    pending_join_requests: pendingJoinRequests,
                    pending_requests_count: pendingJoinRequests.length
                };
            });
            console.log(`\n✅ Response prepared with ${enhancedCommunities.length} communities`);
            res.json({
                success: true,
                data: {
                    communities: enhancedCommunities,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: filteredCommunities.length,
                        totalPages: Math.ceil(filteredCommunities.length / Number(limit)),
                    },
                },
            });
        }
        catch (error) {
            console.error("❌ Fetch communities error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch communities",
                error: error.message
            });
        }
    }
    // ========== FIXED getUserCommunities ==========
    static async getUserCommunities(req, res) {
        var _a;
        try {
            CommunityController.logRoute('getUserCommunities', req);
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            // ✅ FIX: Guard clause to handle undefined userId
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
            }
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const joinRequestRepo = db_1.default.getRepository(CommunityJoinRequest_1.CommunityJoinRequest);
            // Get created communities
            const createdCommunities = await communityRepo.find({
                where: { creator: { id: userId } },
                relations: ["creator", "creator.profile", "members", "members.profile"],
                order: { created_at: "DESC" }
            });
            // Get member communities
            const memberCommunities = await communityRepo
                .createQueryBuilder("community")
                .leftJoinAndSelect("community.creator", "creator")
                .leftJoinAndSelect("creator.profile", "creatorProfile")
                .leftJoinAndSelect("community.members", "members")
                .leftJoinAndSelect("members.profile", "memberProfile")
                .where("members.id = :userId", { userId })
                .getMany();
            // Get all join requests
            const allJoinRequests = await joinRequestRepo
                .createQueryBuilder("request")
                .leftJoinAndSelect("request.community", "community")
                .where("request.user_id = :userId", { userId })
                .getMany();
            console.log(`✅ Found ${allJoinRequests.length} join requests`);
            const joinRequestMap = new Map();
            allJoinRequests.forEach(request => {
                // ✅ FIX: Check if community relation exists before accessing id
                if (request.community && request.community.id) {
                    joinRequestMap.set(request.community.id, {
                        status: request.status,
                        id: request.id
                    });
                }
            });
            // Combine communities
            const allCommunities = [...createdCommunities];
            memberCommunities.forEach(mc => {
                if (!allCommunities.find(c => c.id === mc.id)) {
                    allCommunities.push(mc);
                }
            });
            // Get ALL pending join requests for user's communities
            const communityIds = allCommunities.map(c => c.id);
            let pendingRequestsMap = new Map();
            if (communityIds.length > 0) {
                const allPendingRequests = await joinRequestRepo
                    .createQueryBuilder("request")
                    .leftJoinAndSelect("request.user", "user")
                    .leftJoinAndSelect("user.profile", "userProfile")
                    .leftJoinAndSelect("request.community", "community")
                    .where("request.community_id IN (:...communityIds)", { communityIds })
                    .andWhere("request.status = :status", { status: CommunityJoinRequest_1.JoinRequestStatus.PENDING })
                    .orderBy("request.requested_at", "DESC")
                    .getMany();
                console.log(`✅ Found ${allPendingRequests.length} total pending requests for user's communities`);
                // Group by community
                allPendingRequests.forEach(request => {
                    // ✅ FIX: Check if community relation exists before accessing id
                    if (request.community && request.community.id) {
                        const communityId = request.community.id;
                        if (!pendingRequestsMap.has(communityId)) {
                            pendingRequestsMap.set(communityId, []);
                        }
                        pendingRequestsMap.get(communityId).push({
                            id: request.id,
                            status: request.status,
                            message: request.message,
                            requested_at: request.requested_at,
                            user: {
                                id: request.user.id,
                                first_name: request.user.first_name,
                                last_name: request.user.last_name,
                                email: request.user.email,
                                profile_picture_url: request.user.profile_picture_url,
                                account_type: request.user.account_type,
                                profile: request.user.profile ? {
                                    id: request.user.profile.id,
                                    institution_name: request.user.profile.institution_name,
                                    department: request.user.profile.department,
                                    academic_level: request.user.profile.academic_level,
                                    current_position: request.user.profile.current_position,
                                    research_interests: request.user.profile.research_interests
                                } : null
                            }
                        });
                    }
                });
            }
            // Filter out rejected (unless creator)
            const filteredCommunities = allCommunities.filter(community => {
                if (community.creator.id === userId)
                    return true;
                const joinRequest = joinRequestMap.get(community.id);
                return !joinRequest || joinRequest.status !== CommunityJoinRequest_1.JoinRequestStatus.REJECTED;
            });
            // Map with status
            const enhancedCommunities = filteredCommunities.map(community => {
                const isCreator = community.creator.id === userId;
                const isMember = community.members.some(member => member.id === userId);
                const joinRequest = joinRequestMap.get(community.id);
                let membershipStatus = 'not_member';
                let userJoinRequestStatus = null;
                let canVisit = false;
                let canJoin = false;
                if (isCreator) {
                    membershipStatus = 'creator';
                    userJoinRequestStatus = 'approved';
                    canVisit = true;
                    canJoin = false;
                }
                else if (isMember) {
                    membershipStatus = 'member';
                    userJoinRequestStatus = 'approved';
                    canVisit = true;
                    canJoin = false;
                }
                else if (joinRequest) {
                    if (joinRequest.status === CommunityJoinRequest_1.JoinRequestStatus.PENDING) {
                        membershipStatus = 'pending_approval';
                        userJoinRequestStatus = 'pending';
                        canVisit = false;
                        canJoin = false;
                    }
                    else if (joinRequest.status === CommunityJoinRequest_1.JoinRequestStatus.APPROVED) {
                        membershipStatus = 'member';
                        userJoinRequestStatus = 'approved';
                        canVisit = true;
                        canJoin = false;
                    }
                }
                else {
                    membershipStatus = 'not_member';
                    userJoinRequestStatus = 'not_requested';
                    canVisit = false;
                    canJoin = true;
                }
                // Get pending requests for this community
                const pendingJoinRequests = pendingRequestsMap.get(community.id) || [];
                const membersData = community.members.map(member => ({
                    id: member.id,
                    first_name: member.first_name,
                    last_name: member.last_name,
                    email: member.email,
                    profile_picture_url: member.profile_picture_url,
                    account_type: member.account_type,
                    bio: member.bio,
                    profile: member.profile ? {
                        id: member.profile.id,
                        institution_name: member.profile.institution_name,
                        department: member.profile.department,
                        academic_level: member.profile.academic_level,
                        current_position: member.profile.current_position,
                        research_interests: member.profile.research_interests
                    } : null
                }));
                return {
                    ...community,
                    creator: {
                        id: community.creator.id,
                        first_name: community.creator.first_name,
                        last_name: community.creator.last_name,
                        email: community.creator.email,
                        profile_picture_url: community.creator.profile_picture_url,
                        account_type: community.creator.account_type,
                        bio: community.creator.bio,
                        profile: community.creator.profile ? {
                            id: community.creator.profile.id,
                            institution_name: community.creator.profile.institution_name,
                            department: community.creator.profile.department,
                            academic_level: community.creator.profile.academic_level,
                            current_position: community.creator.profile.current_position,
                            research_interests: community.creator.profile.research_interests
                        } : null
                    },
                    members: membersData,
                    is_user_member: isMember || isCreator,
                    is_creator: isCreator,
                    user_membership_status: membershipStatus,
                    user_join_request_status: userJoinRequestStatus,
                    user_join_request_id: (joinRequest === null || joinRequest === void 0 ? void 0 : joinRequest.id) || null,
                    requires_approval: community.join_approval_required,
                    can_user_join: canJoin,
                    can_user_visit: canVisit,
                    pending_join_requests: pendingJoinRequests,
                    pending_requests_count: pendingJoinRequests.length
                };
            });
            res.json({
                success: true,
                data: {
                    communities: enhancedCommunities,
                    summary: {
                        total_communities: enhancedCommunities.length,
                        created_communities: createdCommunities.length,
                        joined_communities: memberCommunities.length,
                        pending_requests: allJoinRequests.filter(r => r.status === CommunityJoinRequest_1.JoinRequestStatus.PENDING).length,
                        rejected_requests: allJoinRequests.filter(r => r.status === CommunityJoinRequest_1.JoinRequestStatus.REJECTED).length,
                        total_pending_join_requests: Array.from(pendingRequestsMap.values()).reduce((sum, arr) => sum + arr.length, 0)
                    }
                }
            });
        }
        catch (error) {
            console.error(`❌ Error in getUserCommunities:`, error.message);
            res.status(500).json({
                success: false,
                message: "Failed to fetch your communities",
                error: error.message
            });
        }
    }
}
exports.CommunityController = CommunityController;
