"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyStarTrackerController = void 0;
const db_1 = __importDefault(require("../database/db"));
const MonthlyStarTracker_1 = require("../database/models/MonthlyStarTracker");
const User_1 = require("../database/models/User");
const ResearchProject_1 = require("../database/models/ResearchProject");
const BlogPost_1 = require("../database/models/BlogPost");
const EventAttendee_1 = require("../database/models/EventAttendee");
const Community_1 = require("../database/models/Community");
const cloud_1 = require("../helpers/cloud");
const utils_1 = require("../helpers/utils");
const MonthlyStarCongratulationsTemplate_1 = require("../helpers/MonthlyStarCongratulationsTemplate");
// Score weights
const SCORE_WEIGHTS = {
    PROJECT_UPLOAD: 5,
    BLOG_POST: 3,
    EVENT_ATTENDED: 2,
    NEW_FOLLOWER: 1
};
class MonthlyStarTrackerController {
    /**
     * Helper: Check if date is in current month
     */
    static isInCurrentMonth(date, month, year) {
        const d = new Date(date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
    }
    /**
     * Helper: Calculate user score for a specific month
     */
    static calculateUserScore(projects, blogs, events, followersCount, month, year) {
        const monthlyProjects = projects.filter(p => MonthlyStarTrackerController.isInCurrentMonth(p.created_at, month, year));
        const monthlyBlogs = blogs.filter(b => MonthlyStarTrackerController.isInCurrentMonth(b.created_at, month, year));
        const monthlyEvents = events.filter(e => MonthlyStarTrackerController.isInCurrentMonth(e.registered_at, month, year));
        const score = (monthlyProjects.length * SCORE_WEIGHTS.PROJECT_UPLOAD) +
            (monthlyBlogs.length * SCORE_WEIGHTS.BLOG_POST) +
            (monthlyEvents.length * SCORE_WEIGHTS.EVENT_ATTENDED) +
            (followersCount * SCORE_WEIGHTS.NEW_FOLLOWER);
        return {
            projects_count: monthlyProjects.length,
            blogs_count: monthlyBlogs.length,
            events_attended: monthlyEvents.length,
            followers_count: followersCount,
            total_score: score,
            projects: monthlyProjects,
            blogs: monthlyBlogs,
            events: monthlyEvents
        };
    }
    /**
     * GET /api/tracker/best-performer/all-communities
     */
    static async getBestPerformerAllCommunities(req, res) {
        try {
            console.log("\n🏆 ========== GET BEST PERFORMERS (ALL COMMUNITIES) ==========");
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            console.log(`📅 Current Month: ${month}/${year}`);
            const userRepo = db_1.default.getRepository(User_1.User);
            const users = await userRepo
                .createQueryBuilder("user")
                .leftJoinAndSelect("user.projects", "projects")
                .leftJoinAndSelect("user.blog_posts", "blogs")
                .leftJoinAndSelect("user.eventAttendances", "attendances")
                .leftJoinAndSelect("user.followers", "followers")
                .leftJoinAndSelect("user.profile", "profile")
                .where("user.is_active = :active", { active: true })
                .getMany();
            console.log(`✅ Found ${users.length} active users`);
            const userScores = users.map(user => {
                var _a;
                const score = MonthlyStarTrackerController.calculateUserScore(user.projects || [], user.blog_posts || [], user.eventAttendances || [], ((_a = user.followers) === null || _a === void 0 ? void 0 : _a.length) || 0, month, year);
                return {
                    user: {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        profile_picture_url: user.profile_picture_url,
                        account_type: user.account_type,
                        profile: user.profile
                    },
                    statistics: {
                        projects_count: score.projects_count,
                        blogs_count: score.blogs_count,
                        events_attended: score.events_attended,
                        followers_count: score.followers_count,
                        total_score: score.total_score
                    },
                    details: {
                        projects: score.projects.map(p => ({
                            id: p.id,
                            title: p.title,
                            created_at: p.created_at
                        })),
                        blogs: score.blogs.map(b => ({
                            id: b.id,
                            title: b.title,
                            created_at: b.created_at
                        })),
                        events: score.events.map(e => ({
                            id: e.id,
                            registered_at: e.registered_at
                        }))
                    }
                };
            });
            const topPerformers = userScores
                .sort((a, b) => b.statistics.total_score - a.statistics.total_score)
                .slice(0, 3);
            console.log(`🏆 Top 3 Performers:`);
            topPerformers.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.user.first_name} ${p.user.last_name} - ${p.statistics.total_score} points`);
            });
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            res.json({
                success: true,
                data: {
                    month: monthNames[month - 1],
                    year,
                    topPerformers
                }
            });
        }
        catch (error) {
            console.error("❌ Get best performers error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch best performers",
                error: error.message
            });
        }
    }
    /**
     * GET /api/tracker/best-performer/community/:communityId
     */
    static async getBestPerformerOneCommunity(req, res) {
        var _a;
        try {
            console.log("\n🏆 ========== GET BEST PERFORMERS (ONE COMMUNITY) ==========");
            const { communityId } = req.params;
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();
            console.log(`📅 Current Month: ${month}/${year}`);
            console.log(`🏘️ Community ID: ${communityId}`);
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const community = await communityRepo.findOne({
                where: { id: communityId, is_active: true },
                relations: ["members"]
            });
            if (!community) {
                return res.status(404).json({
                    success: false,
                    message: "Community not found"
                });
            }
            console.log(`✅ Community found: ${community.name} (${community.members.length} members)`);
            const userRepo = db_1.default.getRepository(User_1.User);
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
            const userScores = [];
            for (const member of community.members) {
                const projects = await projectRepo.find({
                    where: {
                        author: { id: member.id },
                        community: { id: communityId },
                        status: ResearchProject_1.ProjectStatus.PUBLISHED
                    }
                });
                const blogs = await blogRepo.find({
                    where: { author: { id: member.id } }
                });
                const events = await attendeeRepo
                    .createQueryBuilder("attendee")
                    .leftJoinAndSelect("attendee.event", "event")
                    .where("attendee.user_id = :userId", { userId: member.id })
                    .andWhere("event.community_id = :communityId", { communityId })
                    .getMany();
                const user = await userRepo.findOne({
                    where: { id: member.id },
                    relations: ["followers", "profile"]
                });
                if (!user)
                    continue;
                const score = MonthlyStarTrackerController.calculateUserScore(projects, blogs, events, ((_a = user.followers) === null || _a === void 0 ? void 0 : _a.length) || 0, month, year);
                userScores.push({
                    user: {
                        id: user.id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        profile_picture_url: user.profile_picture_url,
                        account_type: user.account_type,
                        profile: user.profile
                    },
                    statistics: {
                        projects_count: score.projects_count,
                        blogs_count: score.blogs_count,
                        events_attended: score.events_attended,
                        followers_count: score.followers_count,
                        total_score: score.total_score
                    },
                    details: {
                        projects: score.projects.map(p => ({
                            id: p.id,
                            title: p.title,
                            created_at: p.created_at
                        })),
                        blogs: score.blogs.map(b => ({
                            id: b.id,
                            title: b.title,
                            created_at: b.created_at
                        })),
                        events: score.events.map(e => ({
                            id: e.id,
                            registered_at: e.registered_at
                        }))
                    }
                });
            }
            const topPerformers = userScores
                .sort((a, b) => b.statistics.total_score - a.statistics.total_score)
                .slice(0, 3);
            console.log(`🏆 Top 3 Performers in ${community.name}:`);
            topPerformers.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.user.first_name} ${p.user.last_name} - ${p.statistics.total_score} points`);
            });
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            res.json({
                success: true,
                data: {
                    community: {
                        id: community.id,
                        name: community.name
                    },
                    month: monthNames[month - 1],
                    year,
                    topPerformers
                }
            });
        }
        catch (error) {
            console.error("❌ Get community best performers error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch community best performers",
                error: error.message
            });
        }
    }
    /**
     * GET /api/tracker/approved-stars
     * Get all approved monthly stars
     */
    static async getApprovedStars(req, res) {
        try {
            console.log("\n⭐ ========== GET APPROVED STARS ==========");
            const { month, year, community_id, user_id } = req.query;
            const trackerRepo = db_1.default.getRepository(MonthlyStarTracker_1.MonthlyStarTracker);
            const queryBuilder = trackerRepo
                .createQueryBuilder("tracker")
                .leftJoinAndSelect("tracker.user", "user")
                .leftJoinAndSelect("user.profile", "profile")
                .where("tracker.admin_approved = :approved", { approved: true });
            if (month) {
                queryBuilder.andWhere("tracker.month = :month", { month: parseInt(month) });
            }
            if (year) {
                queryBuilder.andWhere("tracker.year = :year", { year: parseInt(year) });
            }
            if (community_id) {
                queryBuilder.andWhere("tracker.community_id = :communityId", { communityId: community_id });
            }
            if (user_id) {
                queryBuilder.andWhere("tracker.user_id = :userId", { userId: user_id });
            }
            queryBuilder.orderBy("tracker.year", "DESC")
                .addOrderBy("tracker.month", "DESC")
                .addOrderBy("tracker.total_score", "DESC");
            const approvedStars = await queryBuilder.getMany();
            console.log(`✅ Found ${approvedStars.length} approved stars`);
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
            const formattedStars = approvedStars.map(star => ({
                id: star.id,
                user: {
                    id: star.user.id,
                    first_name: star.user.first_name,
                    last_name: star.user.last_name,
                    email: star.user.email,
                    profile_picture_url: star.user.profile_picture_url,
                    account_type: star.user.account_type,
                    profile: star.user.profile
                },
                month: monthNames[star.month - 1],
                month_number: star.month,
                year: star.year,
                community_id: star.community_id,
                statistics: {
                    projects_count: star.projects_count,
                    blogs_count: star.blogs_count,
                    events_count: star.events_count,
                    followers_count: star.followers_count,
                    total_score: star.total_score
                },
                badge_image_url: star.badge_image_url,
                description: star.description,
                rewards: star.rewards,
                approved_at: star.approved_at,
                created_at: star.created_at
            }));
            res.json({
                success: true,
                data: {
                    count: formattedStars.length,
                    approved_stars: formattedStars
                }
            });
        }
        catch (error) {
            console.error("❌ Get approved stars error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch approved stars",
                error: error.message
            });
        }
    }
    /**
     * POST /api/tracker/approve-best-performer
     */
    static async approveBestPerformer(req, res) {
        var _a, _b;
        try {
            console.log("\n✅ ========== APPROVE BEST PERFORMER ==========");
            const { user_id, community_id, month, year, description, rewards } = req.body;
            console.log("Request data:", { user_id, community_id, month, year });
            if (!user_id || !month || !year || !description) {
                return res.status(400).json({
                    success: false,
                    message: "user_id, month, year, and description are required"
                });
            }
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Badge image is required"
                });
            }
            const trackerRepo = db_1.default.getRepository(MonthlyStarTracker_1.MonthlyStarTracker);
            const existingApproval = await trackerRepo.findOne({
                where: {
                    user: { id: user_id },
                    month: parseInt(month),
                    year: parseInt(year),
                    community_id: community_id || null,
                    admin_approved: true
                }
            });
            if (existingApproval) {
                return res.status(400).json({
                    success: false,
                    message: `This user has already been approved as the best performer for ${month}/${year}${community_id ? ' in this community' : ' (all-platform)'}`,
                    data: { existing_approval: existingApproval }
                });
            }
            console.log("📤 Uploading badge image...");
            const uploadResult = await (0, cloud_1.UploadToCloud)(req.file);
            const badge_image_url = uploadResult.secure_url;
            console.log("✅ Badge uploaded:", badge_image_url);
            const userRepo = db_1.default.getRepository(User_1.User);
            const user = await userRepo.findOne({
                where: { id: user_id },
                relations: ["projects", "blog_posts", "eventAttendances", "followers", "profile"]
            });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
            let statistics;
            if (community_id) {
                const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
                const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
                const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
                const projects = await projectRepo.find({
                    where: {
                        author: { id: user_id },
                        community: { id: community_id },
                        status: ResearchProject_1.ProjectStatus.PUBLISHED
                    }
                });
                const blogs = await blogRepo.find({
                    where: { author: { id: user_id } }
                });
                const events = await attendeeRepo
                    .createQueryBuilder("attendee")
                    .leftJoinAndSelect("attendee.event", "event")
                    .where("attendee.user_id = :userId", { userId: user_id })
                    .andWhere("event.community_id = :communityId", { communityId: community_id })
                    .getMany();
                statistics = MonthlyStarTrackerController.calculateUserScore(projects, blogs, events, ((_a = user.followers) === null || _a === void 0 ? void 0 : _a.length) || 0, parseInt(month), parseInt(year));
            }
            else {
                statistics = MonthlyStarTrackerController.calculateUserScore(user.projects || [], user.blog_posts || [], user.eventAttendances || [], ((_b = user.followers) === null || _b === void 0 ? void 0 : _b.length) || 0, parseInt(month), parseInt(year));
            }
            console.log("📊 Calculated Statistics:", statistics);
            const tracker = trackerRepo.create({
                user: { id: user_id },
                month: parseInt(month),
                year: parseInt(year),
                community_id: community_id || null,
                projects_count: statistics.projects_count,
                blogs_count: statistics.blogs_count,
                events_count: statistics.events_attended,
                followers_count: statistics.followers_count,
                total_score: statistics.total_score,
                admin_approved: true,
                badge_image_url,
                description,
                rewards: rewards || null,
                approved_at: new Date()
            });
            await trackerRepo.save(tracker);
            console.log("✅ Tracker record saved with correct statistics");
            console.log("\n📧 ========== SENDING CONGRATULATIONS EMAIL ==========");
            try {
                const monthNames = ["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"];
                let community_name = undefined;
                if (community_id) {
                    const communityRepo = db_1.default.getRepository(Community_1.Community);
                    const community = await communityRepo.findOne({ where: { id: community_id } });
                    community_name = community === null || community === void 0 ? void 0 : community.name;
                }
                const emailHtml = MonthlyStarCongratulationsTemplate_1.MonthlyStarCongratulationsTemplate.getCongratulationsEmail({
                    user: {
                        first_name: user.first_name,
                        email: user.email
                    },
                    badge_image_url,
                    month: monthNames[parseInt(month) - 1],
                    year: parseInt(year),
                    statistics: {
                        projects_count: statistics.projects_count,
                        blogs_count: statistics.blogs_count,
                        events_count: statistics.events_attended,
                        followers_count: statistics.followers_count,
                        total_score: statistics.total_score
                    },
                    description,
                    rewards: rewards || "",
                    community_name
                });
                await (0, utils_1.sendEmail)({
                    to: user.email,
                    subject: `🌟 Congratulations! You're Our Monthly Star for ${monthNames[parseInt(month) - 1]} ${year}`,
                    html: emailHtml
                });
                console.log(`✅ Email sent to ${user.email}`);
            }
            catch (emailError) {
                console.error("❌ Email failed:", emailError.message);
            }
            console.log("📧 ========== EMAIL COMPLETE ==========\n");
            res.json({
                success: true,
                message: "Best performer approved and notified successfully",
                data: {
                    tracker: {
                        ...tracker,
                        statistics: {
                            projects_count: statistics.projects_count,
                            blogs_count: statistics.blogs_count,
                            events_attended: statistics.events_attended,
                            followers_count: statistics.followers_count,
                            total_score: statistics.total_score
                        }
                    }
                }
            });
        }
        catch (error) {
            console.error("❌ Approve best performer error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to approve best performer",
                error: error.message
            });
        }
    }
}
exports.MonthlyStarTrackerController = MonthlyStarTrackerController;
