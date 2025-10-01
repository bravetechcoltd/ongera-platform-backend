"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardSummaryController = void 0;
const db_1 = __importDefault(require("../database/db"));
const ResearchProject_1 = require("../database/models/ResearchProject");
const Community_1 = require("../database/models/Community");
const Event_1 = require("../database/models/Event");
const BlogPost_1 = require("../database/models/BlogPost");
const QAThread_1 = require("../database/models/QAThread");
const CommunityPost_1 = require("../database/models/CommunityPost");
const EventAttendee_1 = require("../database/models/EventAttendee");
const typeorm_1 = require("typeorm");
const User_1 = require("../database/models/User");
const Comment_1 = require("../database/models/Comment");
const Like_1 = require("../database/models/Like");
class DashboardSummaryController {
    static async getAllActivities(req, res) {
        try {
            const { page = 1, limit = 20, type = 'all' } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;
            console.log("\n📊 ========== FETCHING ALL ACTIVITIES ==========");
            console.log("📅 Request Time:", new Date().toISOString());
            console.log("Parameters:", { page: pageNum, limit: limitNum, type });
            const userRepo = db_1.default.getRepository(User_1.User);
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const qaRepo = db_1.default.getRepository(QAThread_1.QAThread);
            const postRepo = db_1.default.getRepository(CommunityPost_1.CommunityPost);
            const commentRepo = db_1.default.getRepository(Comment_1.Comment);
            const likeRepo = db_1.default.getRepository(Like_1.Like);
            let activities = [];
            // Fetch activities based on type filter
            if (type === 'all' || type === 'project') {
                const projects = await projectRepo.find({
                    relations: ['author'],
                    order: { created_at: 'DESC' },
                    take: limitNum,
                    skip: type === 'project' ? skip : 0
                });
                activities.push(...projects.map(p => ({
                    id: `project-${p.id}`,
                    type: 'project',
                    title: 'Uploaded new research project',
                    description: p.title,
                    timestamp: p.created_at.toISOString(),
                    user: p.author ? {
                        id: p.author.id,
                        name: `${p.author.first_name} ${p.author.last_name}`,
                        avatar: p.author.profile_picture_url || `/api/placeholder/40/40`
                    } : null,
                    metadata: {
                        projectId: p.id,
                        likesCount: p.like_count,
                        commentsCount: p.comment_count,
                        viewsCount: p.view_count
                    },
                    link: `/dashboard/user/research/${p.id}`
                })));
            }
            if (type === 'all' || type === 'post') {
                const posts = await postRepo.find({
                    relations: ['author', 'community'],
                    order: { created_at: 'DESC' },
                    take: limitNum,
                    skip: type === 'post' ? skip : 0
                });
                activities.push(...posts.map(p => {
                    var _a, _b;
                    return ({
                        id: `post-${p.id}`,
                        type: 'post',
                        title: 'Posted in community',
                        description: p.community ? `Posted in ${p.community.name}` : 'New community post',
                        timestamp: p.created_at.toISOString(),
                        user: p.author ? {
                            id: p.author.id,
                            name: `${p.author.first_name} ${p.author.last_name}`,
                            avatar: p.author.profile_picture_url || `/api/placeholder/40/40`
                        } : null,
                        metadata: {
                            postId: p.id,
                            communityId: (_a = p.community) === null || _a === void 0 ? void 0 : _a.id,
                            viewsCount: p.view_count
                        },
                        link: `/dashboard/user/communities/${(_b = p.community) === null || _b === void 0 ? void 0 : _b.id}`
                    });
                }));
            }
            if (type === 'all' || type === 'event') {
                const events = await eventRepo.find({
                    relations: ['organizer'],
                    order: { created_at: 'DESC' },
                    take: limitNum,
                    skip: type === 'event' ? skip : 0
                });
                activities.push(...events.map(e => ({
                    id: `event-${e.id}`,
                    type: 'event',
                    title: 'Created new event',
                    description: e.title,
                    timestamp: e.created_at.toISOString(),
                    user: e.organizer ? {
                        id: e.organizer.id,
                        name: `${e.organizer.first_name} ${e.organizer.last_name}`,
                        avatar: e.organizer.profile_picture_url || `/api/placeholder/40/40`
                    } : null,
                    metadata: {
                        eventId: e.id,
                        eventType: e.event_type,
                        startDate: e.start_datetime
                    },
                    link: `/dashboard/user/event/${e.id}`
                })));
            }
            if (type === 'all' || type === 'comment') {
                const comments = await commentRepo.find({
                    relations: ['author'],
                    order: { created_at: 'DESC' },
                    take: limitNum,
                    skip: type === 'comment' ? skip : 0
                });
                activities.push(...comments.map(c => ({
                    id: `comment-${c.id}`,
                    type: 'comment',
                    title: 'Added a comment',
                    description: c.comment_text.substring(0, 100) + (c.comment_text.length > 100 ? '...' : ''),
                    timestamp: c.created_at.toISOString(),
                    user: c.author ? {
                        id: c.author.id,
                        name: `${c.author.first_name} ${c.author.last_name}`,
                        avatar: c.author.profile_picture_url || `/api/placeholder/40/40`
                    } : null,
                    metadata: {
                        commentId: c.id,
                    },
                    link: `/dashboard/user/research/${c.content_id}`
                })));
            }
            if (type === 'all' || type === 'like') {
                const likes = await likeRepo.find({
                    relations: ['user'],
                    order: { created_at: 'DESC' },
                    take: limitNum,
                    skip: type === 'like' ? skip : 0
                });
                activities.push(...likes.map(l => ({
                    id: `like-${l.id}`,
                    type: 'like',
                    title: 'Liked content',
                    description: `Liked a ${l.content_type}`,
                    timestamp: l.created_at.toISOString(),
                    user: l.user ? {
                        id: l.user.id,
                        name: `${l.user.first_name} ${l.user.last_name}`,
                        avatar: l.user.profile_picture_url || `/api/placeholder/40/40`
                    } : null,
                    metadata: {
                        contentId: l.content_id,
                        contentType: l.content_type
                    },
                    link: `/dashboard/user`
                })));
            }
            // Sort all activities by timestamp
            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            // Apply pagination to combined results
            const totalActivities = activities.length;
            const paginatedActivities = type === 'all'
                ? activities.slice(skip, skip + limitNum)
                : activities;
            const hasMore = skip + limitNum < totalActivities;
            console.log("✅ Activities fetched successfully");
            console.log("   Total:", totalActivities);
            console.log("   Returned:", paginatedActivities.length);
            console.log("   Has More:", hasMore);
            console.log("========================================================\n");
            res.json({
                success: true,
                data: {
                    activities: paginatedActivities,
                    total: totalActivities,
                    page: pageNum,
                    limit: limitNum,
                    hasMore: hasMore
                }
            });
        }
        catch (error) {
            console.error("\n❌ ========== FETCH ACTIVITIES ERROR ==========");
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
            console.error("====================================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to fetch activities",
                error: error.message
            });
        }
    }
    static async getDashboardSummary(req, res) {
        try {
            const userId = req.user.userId;
            console.log("🔍 ========== DASHBOARD SUMMARY DEBUG START ==========");
            console.log("📥 User ID:", userId);
            // Get today's date range for recent items
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            console.log("📅 Date range:", { today, tomorrow });
            // Initialize repositories
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const communityRepo = db_1.default.getRepository(Community_1.Community);
            const eventRepo = db_1.default.getRepository(Event_1.Event);
            const blogRepo = db_1.default.getRepository(BlogPost_1.BlogPost);
            const qaRepo = db_1.default.getRepository(QAThread_1.QAThread);
            const postRepo = db_1.default.getRepository(CommunityPost_1.CommunityPost);
            const attendeeRepo = db_1.default.getRepository(EventAttendee_1.EventAttendee);
            // 1. Fetch User's Research Projects Stats
            console.log("📍 STEP 1: Fetching research projects...");
            const [totalProjects, publishedProjects, draftProjects] = await Promise.all([
                projectRepo.count({ where: { author: { id: userId } } }),
                projectRepo.count({
                    where: {
                        author: { id: userId },
                        status: ResearchProject_1.ProjectStatus.PUBLISHED
                    }
                }),
                projectRepo.count({
                    where: {
                        author: { id: userId },
                        status: ResearchProject_1.ProjectStatus.DRAFT
                    }
                })
            ]);
            // Get total views, downloads, and likes for user's projects
            const projectStats = await projectRepo
                .createQueryBuilder("project")
                .select("COALESCE(SUM(project.view_count), 0)", "totalViews")
                .addSelect("COALESCE(SUM(project.download_count), 0)", "totalDownloads")
                .addSelect("COALESCE(SUM(project.like_count), 0)", "totalLikes")
                .where("project.author_id = :userId", { userId })
                .getRawOne();
            console.log("✅ Project stats:", {
                totalProjects,
                publishedProjects,
                draftProjects,
                views: projectStats.totalViews || 0,
                downloads: projectStats.totalDownloads || 0,
                likes: projectStats.totalLikes || 0
            });
            // 2. Fetch User's Communities Stats
            console.log("📍 STEP 2: Fetching communities...");
            // Communities where user is creator
            const createdCommunitiesCount = await communityRepo.count({
                where: {
                    creator: { id: userId },
                    is_active: true
                }
            });
            // Communities where user is member (using query builder for many-to-many)
            const memberCommunities = await communityRepo
                .createQueryBuilder("community")
                .leftJoin("community.members", "member")
                .where("member.id = :userId", { userId })
                .andWhere("community.is_active = :isActive", { isActive: true })
                .getCount();
            const totalCommunities = createdCommunitiesCount + memberCommunities;
            console.log("✅ Community stats:", {
                created: createdCommunitiesCount,
                joined: memberCommunities,
                total: totalCommunities
            });
            // 3. Fetch User's Events Stats
            console.log("📍 STEP 3: Fetching events...");
            // Events user is organizing (not cancelled or deleted)
            const organizingEvents = await eventRepo.count({
                where: {
                    organizer: { id: userId },
                    status: Event_1.EventStatus.UPCOMING
                }
            });
            // Events user is attending (check EventAttendee table)
            const attendingEventsCount = await attendeeRepo
                .createQueryBuilder("attendee")
                .leftJoin("attendee.event", "event")
                .where("attendee.user_id = :userId", { userId })
                .andWhere("event.status IN (:...statuses)", {
                statuses: [Event_1.EventStatus.UPCOMING, Event_1.EventStatus.ONGOING]
            })
                .andWhere("attendee.registration_status IN (:...regStatuses)", {
                regStatuses: ["Registered", "Approved", "Attended"]
            })
                .getCount();
            // Upcoming events (either organizing or attending)
            const upcomingEvents = await eventRepo
                .createQueryBuilder("event")
                .leftJoin("event.attendees", "attendee")
                .where("event.start_datetime > :now", { now: new Date() })
                .andWhere("event.status IN (:...statuses)", {
                statuses: [Event_1.EventStatus.UPCOMING, Event_1.EventStatus.ONGOING]
            })
                .andWhere("(event.organizer_id = :userId OR attendee.user_id = :userId)", { userId })
                .groupBy("event.id")
                .getCount();
            const totalEvents = organizingEvents + attendingEventsCount;
            console.log("✅ Event stats:", {
                organizing: organizingEvents,
                attending: attendingEventsCount,
                upcoming: upcomingEvents,
                total: totalEvents
            });
            // 4. Fetch User's Blog Posts Stats
            console.log("📍 STEP 4: Fetching blog posts...");
            const [totalBlogs, publishedBlogs] = await Promise.all([
                blogRepo.count({ where: { author: { id: userId } } }),
                blogRepo.count({
                    where: {
                        author: { id: userId },
                        status: ResearchProject_1.ProjectStatus.PUBLISHED
                    }
                })
            ]);
            console.log("✅ Blog stats:", { total: totalBlogs, published: publishedBlogs });
            // 5. Fetch User's Q&A Stats
            console.log("📍 STEP 5: Fetching Q&A threads...");
            const [totalQuestions, answeredQuestions] = await Promise.all([
                qaRepo.count({
                    where: {
                        asker: { id: userId },
                        is_active: true
                    }
                }),
                qaRepo.count({
                    where: {
                        asker: { id: userId },
                        is_answered: true,
                        is_active: true
                    }
                })
            ]);
            console.log("✅ Q&A stats:", {
                total: totalQuestions,
                answered: answeredQuestions
            });
            // 6. Fetch Recent Activity (Created Today)
            console.log("📍 STEP 6: Fetching today's activity...");
            const [recentProjects, recentPosts, recentEvents] = await Promise.all([
                projectRepo.find({
                    where: {
                        author: { id: userId },
                        created_at: (0, typeorm_1.Between)(today, tomorrow)
                    },
                    relations: ["author", "author.profile", "tags"],
                    order: { created_at: "DESC" },
                    take: 10
                }),
                postRepo.find({
                    where: {
                        author: { id: userId },
                        created_at: (0, typeorm_1.Between)(today, tomorrow)
                    },
                    relations: ["author", "author.profile", "community"],
                    order: { created_at: "DESC" },
                    take: 10
                }),
                eventRepo.find({
                    where: {
                        organizer: { id: userId },
                        created_at: (0, typeorm_1.Between)(today, tomorrow)
                    },
                    relations: ["organizer", "community"],
                    order: { created_at: "DESC" },
                    take: 10
                })
            ]);
            console.log("✅ Recent activity:", {
                projects: recentProjects.length,
                posts: recentPosts.length,
                events: recentEvents.length
            });
            // 7. Build Summary Response
            const summary = {
                projects: {
                    total: totalProjects,
                    published: publishedProjects,
                    draft: draftProjects,
                    totalViews: parseInt(projectStats.totalViews) || 0,
                    totalDownloads: parseInt(projectStats.totalDownloads) || 0,
                    totalLikes: parseInt(projectStats.totalLikes) || 0
                },
                communities: {
                    total: totalCommunities,
                    created: createdCommunitiesCount,
                    joined: memberCommunities
                },
                events: {
                    organizing: organizingEvents,
                    attending: attendingEventsCount,
                    upcoming: upcomingEvents,
                    total: totalEvents
                },
                blogs: {
                    total: totalBlogs,
                    published: publishedBlogs,
                    draft: totalBlogs - publishedBlogs
                },
                qa: {
                    totalQuestions: totalQuestions,
                    answeredQuestions: answeredQuestions,
                    unansweredQuestions: totalQuestions - answeredQuestions
                },
                recentActivity: {
                    projects: recentProjects,
                    posts: recentPosts,
                    events: recentEvents
                }
            };
            console.log("✅ Summary compiled successfully");
            console.log("📊 Final Summary:", {
                projects: summary.projects.total,
                communities: summary.communities.total,
                events: summary.events.total,
                blogs: summary.blogs.total,
                questions: summary.qa.totalQuestions,
                recentItems: recentProjects.length + recentPosts.length + recentEvents.length
            });
            console.log("🔍 ========== DASHBOARD SUMMARY DEBUG END ==========\n");
            res.json({
                success: true,
                data: { summary }
            });
        }
        catch (error) {
            console.error("❌ ========== DASHBOARD SUMMARY ERROR ==========");
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                name: error.name,
                code: error.code
            });
            console.error("===============================================\n");
            res.status(500).json({
                success: false,
                message: "Failed to fetch dashboard summary",
                error: error.message
            });
        }
    }
}
exports.DashboardSummaryController = DashboardSummaryController;
