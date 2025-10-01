"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogController = void 0;
const db_1 = __importDefault(require("../database/db"));
const BlogPost_1 = require("../database/models/BlogPost");
const Community_1 = require("../database/models/Community");
const cloud_1 = require("../helpers/cloud");
const utils_1 = require("../helpers/utils");
const NewsBlogCreatedTemplate_1 = require("../helpers/NewsBlogCreatedTemplate");
class BlogController {
    static async createBlogPost(req, res) {
        try {
            const userId = req.user.userId;
            const { title, content, excerpt, category, linked_project_id } = req.body;
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            const existingBlog = await blogRepo.findOne({ where: { slug } });
            if (existingBlog) {
                return res.status(409).json({
                    success: false,
                    message: "Blog post with this title already exists"
                });
            }
            const blog = blogRepo.create({
                title,
                slug,
                content,
                excerpt,
                category,
                author: { id: userId },
                linked_project: linked_project_id ? { id: linked_project_id } : null,
            });
            if (req.file) {
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                blog.cover_image_url = uploadResult.secure_url;
            }
            await blogRepo.save(blog);
            res.status(201).json({
                success: true,
                message: "Blog post created successfully",
                data: { blog },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to create blog post",
                error: error.message
            });
        }
    }
    static async getAllBlogPosts(req, res) {
        try {
            const { page = 1, limit = 10, search, category } = req.query;
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const queryBuilder = blogRepo.createQueryBuilder("blog")
                .leftJoinAndSelect("blog.author", "author")
                .where("blog.status = :status", { status: "Published" });
            if (search) {
                queryBuilder.andWhere("(blog.title ILIKE :search OR blog.excerpt ILIKE :search)", { search: `%${search}%` });
            }
            if (category) {
                queryBuilder.andWhere("blog.category = :category", { category });
            }
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            queryBuilder.orderBy("blog.published_at", "DESC");
            const [blogs, total] = await queryBuilder.getManyAndCount();
            res.json({
                success: true,
                data: {
                    blogs,
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
            res.status(500).json({
                success: false,
                message: "Failed to fetch blog posts",
                error: error.message
            });
        }
    }
    // ✅ NEW: Get community blogs
    static async getCommunityBlogs(req, res) {
        try {
            const { communityId } = req.params;
            const { page = 1, limit = 10, category } = req.query;
            console.log("🔍 ========== GET COMMUNITY BLOGS DEBUG START ==========");
            console.log("📥 Request Parameters:", { communityId, page, limit, category });
            // Verify community exists
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id: communityId }
            });
            if (!community) {
                console.log("❌ Community not found");
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            console.log("✅ Community found:", community.name);
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const queryBuilder = blogRepo.createQueryBuilder("blog")
                .leftJoinAndSelect("blog.author", "author")
                .leftJoinAndSelect("author.profile", "profile")
                .leftJoinAndSelect("blog.community", "community")
                .where("blog.community_id = :communityId", { communityId })
                .andWhere("blog.status = :status", { status: "Published" });
            if (category) {
                queryBuilder.andWhere("blog.category = :category", { category });
            }
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            queryBuilder.orderBy("blog.published_at", "DESC");
            const [blogs, total] = await queryBuilder.getManyAndCount();
            console.log("✅ Blogs found:", blogs.length, "Total:", total);
            console.log("🔍 ========== GET COMMUNITY BLOGS DEBUG END ==========\n");
            res.json({
                success: true,
                data: {
                    blogs,
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
            console.error("❌ Error fetching community blogs:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch community blogs",
                error: error.message
            });
        }
    }
    // ✅ NEW: Get blog by ID
    static async getBlogById(req, res) {
        try {
            const { id } = req.params;
            console.log("🔍 ========== GET BLOG BY ID DEBUG START ==========");
            console.log("📥 Blog ID:", id);
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const blog = await blogRepo.findOne({
                where: { id },
                relations: ["author", "author.profile", "community", "linked_project"]
            });
            if (!blog) {
                console.log("❌ Blog not found");
                return res.status(404).json({
                    success: false,
                    message: "Blog post not found"
                });
            }
            console.log("✅ Blog found:", blog.title);
            // Increment view count
            blog.view_count += 1;
            await blogRepo.save(blog);
            console.log("✅ View count incremented:", blog.view_count);
            console.log("🔍 ========== GET BLOG BY ID DEBUG END ==========\n");
            res.json({
                success: true,
                data: { blog }
            });
        }
        catch (error) {
            console.error("❌ Error fetching blog:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch blog post",
                error: error.message
            });
        }
    }
    static async createCommunityBlog(req, res) {
        var _a, _b, _c, _d;
        try {
            const { communityId } = req.params;
            const userId = req.user.userId;
            const { title, content, excerpt, category, linked_project_id } = req.body;
            console.log("🔍 ========== CREATE COMMUNITY BLOG DEBUG START ==========");
            console.log("📥 Request Data:", { communityId, userId, title, category });
            // Step 1: Verify community exists and get members
            console.log("📍 STEP 1: Verifying community and membership...");
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id: communityId },
                relations: ["members", "creator", "members.profile"]
            });
            console.log("✅ Community verification:", {
                found: !!community,
                name: community === null || community === void 0 ? void 0 : community.name,
                creatorId: (_a = community === null || community === void 0 ? void 0 : community.creator) === null || _a === void 0 ? void 0 : _a.id,
                memberCount: (_b = community === null || community === void 0 ? void 0 : community.members) === null || _b === void 0 ? void 0 : _b.length
            });
            if (!community) {
                console.log("❌ Community not found");
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            // Step 2: Check membership
            console.log("📍 STEP 2: Checking user membership...");
            const isMember = ((_c = community.members) === null || _c === void 0 ? void 0 : _c.some(m => m.id === userId)) ||
                community.creator.id === userId;
            console.log("✅ Membership check:", {
                userId,
                isMember,
                isCreator: community.creator.id === userId
            });
            if (!isMember) {
                console.log("❌ User is not a community member");
                return res.status(403).json({
                    success: false,
                    message: "Only community members can create blogs"
                });
            }
            console.log("✅ User is a member, proceeding with blog creation");
            // Step 3: Create blog post
            console.log("📍 STEP 3: Creating blog post...");
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            const existingBlog = await blogRepo.findOne({ where: { slug } });
            if (existingBlog) {
                console.log("❌ Blog with this slug already exists");
                return res.status(409).json({
                    success: false,
                    message: "Blog post with this title already exists"
                });
            }
            // Calculate reading time (average reading speed: 200 words/minute)
            const wordCount = content.split(/\s+/).length;
            const readingTimeMinutes = Math.ceil(wordCount / 200);
            const blog = blogRepo.create({
                title,
                slug,
                content,
                excerpt,
                category,
                author: { id: userId },
                community: { id: communityId },
                linked_project: linked_project_id ? { id: linked_project_id } : null,
                status: "Published",
                published_at: new Date(),
                reading_time_minutes: readingTimeMinutes
            });
            console.log("✅ Blog object created:", {
                title: blog.title,
                slug: blog.slug,
                status: blog.status,
                readingTime: blog.reading_time_minutes
            });
            // Step 4: Handle cover image upload
            if (req.file) {
                console.log("📍 STEP 4: Uploading cover image...");
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                blog.cover_image_url = uploadResult.secure_url;
                console.log("✅ Cover image uploaded:", uploadResult.secure_url);
            }
            // Step 5: Save blog to database
            console.log("📍 STEP 5: Saving blog to database...");
            await blogRepo.save(blog);
            console.log("✅ Blog saved with community_id:", communityId);
            // Step 6: Fetch complete blog with relations
            console.log("📍 STEP 6: Fetching complete blog with relations...");
            const completeBlog = await blogRepo.findOne({
                where: { id: blog.id },
                relations: ["author", "author.profile", "community"]
            });
            console.log("✅ Complete blog fetched:", {
                id: completeBlog === null || completeBlog === void 0 ? void 0 : completeBlog.id,
                hasCommunity: !!(completeBlog === null || completeBlog === void 0 ? void 0 : completeBlog.community),
                communityName: (_d = completeBlog === null || completeBlog === void 0 ? void 0 : completeBlog.community) === null || _d === void 0 ? void 0 : _d.name,
                hasAuthor: !!(completeBlog === null || completeBlog === void 0 ? void 0 : completeBlog.author)
            });
            // ========== EMAIL NOTIFICATION SECTION ==========
            console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
            console.log("📍 STEP 7: Sending email notifications to community members...");
            try {
                // Filter members (exclude blog author)
                const membersToNotify = community.members.filter(member => member.id !== userId);
                console.log("📊 Email Distribution Plan:", {
                    totalMembers: community.members.length,
                    membersToNotify: membersToNotify.length,
                    authorExcluded: userId
                });
                if (membersToNotify.length === 0) {
                    console.log("⚠️ No members to notify (community only has creator)");
                }
                else {
                    let emailsSent = 0;
                    let emailsFailed = 0;
                    const failedEmails = [];
                    for (let i = 0; i < membersToNotify.length; i++) {
                        const member = membersToNotify[i];
                        const progress = `[${i + 1}/${membersToNotify.length}]`;
                        try {
                            console.log(`\n${progress} 📧 Preparing email for: ${member.email}`);
                            console.log(`   Name: ${member.first_name} ${member.last_name}`);
                            // Prepare blog data for email template
                            const blogData = {
                                title: completeBlog.title,
                                excerpt: completeBlog.excerpt,
                                content: completeBlog.content,
                                category: completeBlog.category,
                                status: completeBlog.status,
                                created_at: completeBlog.created_at,
                                cover_image_url: completeBlog.cover_image_url,
                                author: {
                                    first_name: completeBlog.author.first_name,
                                    last_name: completeBlog.author.last_name,
                                    profile: completeBlog.author.profile
                                },
                                community: {
                                    name: completeBlog.community.name,
                                    member_count: completeBlog.community.member_count
                                },
                                view_count: completeBlog.view_count,
                                reading_time_minutes: completeBlog.reading_time_minutes,
                                blog_id: completeBlog.id
                            };
                            const memberData = {
                                first_name: member.first_name
                            };
                            // Generate email HTML
                            const emailHtml = NewsBlogCreatedTemplate_1.NewsBlogCreatedTemplate.getBlogCreatedTemplate(blogData, memberData);
                            console.log(`   ✉️ Email HTML generated (${emailHtml.length} chars)`);
                            console.log(`   📬 Sending email via sendEmail function...`);
                            // Send email
                            await (0, utils_1.sendEmail)({
                                to: member.email,
                                subject: `✍️ New Blog Post: ${completeBlog.title}`,
                                html: emailHtml
                            });
                            emailsSent++;
                            console.log(`   ✅ SUCCESS: Email sent to ${member.email}`);
                            // Small delay to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        catch (emailError) {
                            emailsFailed++;
                            const errorMsg = emailError.message || 'Unknown error';
                            console.error(`   ❌ FAILED: ${member.email}`);
                            console.error(`   Error: ${errorMsg}`);
                            failedEmails.push({
                                email: member.email,
                                error: errorMsg
                            });
                        }
                    }
                    // Email distribution summary
                    console.log("\n📊 === EMAIL DISTRIBUTION SUMMARY ===");
                    console.log(`✅ Successfully sent: ${emailsSent}/${membersToNotify.length}`);
                    console.log(`❌ Failed: ${emailsFailed}/${membersToNotify.length}`);
                    console.log(`📧 Success rate: ${((emailsSent / membersToNotify.length) * 100).toFixed(1)}%`);
                    if (failedEmails.length > 0) {
                        console.log("\n❌ Failed emails:");
                        failedEmails.forEach((fail, idx) => {
                            console.log(`  ${idx + 1}. ${fail.email} - ${fail.error}`);
                        });
                    }
                }
            }
            catch (emailSystemError) {
                console.error("❌ Email system error:", emailSystemError.message);
                console.error("⚠️ Blog was created successfully, but email notifications failed");
                // Don't throw error - blog creation succeeded
            }
            console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
            // ========== END EMAIL NOTIFICATION SECTION ==========
            console.log("🔍 ========== CREATE COMMUNITY BLOG DEBUG END ==========\n");
            res.status(201).json({
                success: true,
                message: "Community blog created successfully and notifications sent",
                data: { blog: completeBlog },
            });
        }
        catch (error) {
            console.error("❌ ========== ERROR IN CREATE COMMUNITY BLOG ==========");
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            console.error("========================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to create community blog",
                error: error.message
            });
        }
    }
    static async updateBlogStatus(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { status } = req.body;
            console.log("🔍 Updating blog status:", { id, userId, status });
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const blog = await blogRepo.findOne({
                where: { id },
                relations: ["author"]
            });
            if (!blog) {
                console.log("❌ Blog not found");
                return res.status(404).json({
                    success: false,
                    message: "Blog post not found"
                });
            }
            // Check permissions (author or admin)
            if (blog.author.id !== userId && req.user.account_type !== "admin") {
                console.log("❌ Permission denied");
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to update this blog"
                });
            }
            // Update status
            blog.status = status;
            // If publishing, set published_at
            if (status === "Published" && !blog.published_at) {
                blog.published_at = new Date();
            }
            await blogRepo.save(blog);
            console.log("✅ Blog status updated successfully");
            res.json({
                success: true,
                message: "Blog status updated successfully",
                data: { blog }
            });
        }
        catch (error) {
            console.error("❌ Update blog status error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update blog status",
                error: error.message
            });
        }
    }
    // ✅ Update Blog
    static async updateBlog(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { title, content, excerpt, category, linked_project_id } = req.body;
            console.log("🔍 Updating blog:", { id, userId });
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const blog = await blogRepo.findOne({
                where: { id },
                relations: ["author"]
            });
            if (!blog) {
                console.log("❌ Blog not found");
                return res.status(404).json({
                    success: false,
                    message: "Blog post not found"
                });
            }
            // Check permissions
            if (blog.author.id !== userId && req.user.account_type !== "admin") {
                console.log("❌ Permission denied");
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to update this blog"
                });
            }
            // Update fields
            if (title) {
                blog.title = title;
                blog.slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            }
            if (content) {
                blog.content = content;
                // Recalculate reading time
                const wordCount = content.split(/\s+/).length;
                blog.reading_time_minutes = Math.ceil(wordCount / 200);
            }
            if (excerpt)
                blog.excerpt = excerpt;
            if (category)
                blog.category = category;
            if (linked_project_id)
                blog.linked_project = { id: linked_project_id };
            // Update cover image if provided
            if (req.file) {
                const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
                blog.cover_image_url = uploadResult.secure_url;
            }
            await blogRepo.save(blog);
            console.log("✅ Blog updated successfully");
            // Fetch complete blog
            const completeBlog = await blogRepo.findOne({
                where: { id },
                relations: ["author", "author.profile", "community"]
            });
            res.json({
                success: true,
                message: "Blog updated successfully",
                data: { blog: completeBlog }
            });
        }
        catch (error) {
            console.error("❌ Update blog error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update blog",
                error: error.message
            });
        }
    }
    // ✅ Delete Blog
    static async deleteBlog(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            console.log("🔍 Deleting blog:", { id, userId });
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const blog = await blogRepo.findOne({
                where: { id },
                relations: ["author"]
            });
            if (!blog) {
                console.log("❌ Blog not found");
                return res.status(404).json({
                    success: false,
                    message: "Blog post not found"
                });
            }
            // Check permissions
            if (blog.author.id !== userId && req.user.account_type !== "admin") {
                console.log("❌ Permission denied");
                return res.status(403).json({
                    success: false,
                    message: "You don't have permission to delete this blog"
                });
            }
            await blogRepo.remove(blog);
            console.log("✅ Blog deleted successfully");
            res.json({
                success: true,
                message: "Blog deleted successfully"
            });
        }
        catch (error) {
            console.error("❌ Delete blog error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to delete blog",
                error: error.message
            });
        }
    }
}
exports.BlogController = BlogController;
