
import { Request, Response } from "express";
import dbConnection from '../database/db';
import { User, AccountType } from "../database/models/User";
import { ResearchProject, ProjectStatus } from "../database/models/ResearchProject";
import { Community } from "../database/models/Community";
import { Event, EventStatus } from "../database/models/Event";
import { BlogPost } from "../database/models/BlogPost";
import { QAThread } from "../database/models/QAThread";
import { CommunityPost } from "../database/models/CommunityPost";
import { EventAttendee, RegistrationStatus } from "../database/models/EventAttendee";
import { CommunityJoinRequest, JoinRequestStatus } from "../database/models/CommunityJoinRequest";
import { Between, LessThan } from "typeorm";
import { Comment } from "../database/models/Comment";
import { Like } from "../database/models/Like";

export class AdminDashboardController {
  /**
   * Get comprehensive admin dashboard summary
   * Returns overview statistics across all platform activities
   */
  static async getAdminDashboardSummary(req: Request, res: Response) {
    try {
      console.log("\n📊 ========== ADMIN DASHBOARD SUMMARY START ==========");
      console.log("📅 Request Time:", new Date().toISOString());

      // Get date ranges for analytics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      console.log("📆 Date Ranges:", {
        today: today.toISOString(),
        thisWeekStart: thisWeekStart.toISOString(),
        thisMonthStart: thisMonthStart.toISOString()
      });

      // Initialize repositories
      const userRepo = dbConnection.getRepository(User);
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const communityRepo = dbConnection.getRepository(Community);
      const eventRepo = dbConnection.getRepository(Event);
      const blogRepo = dbConnection.getRepository(BlogPost);
      const qaRepo = dbConnection.getRepository(QAThread);
      const postRepo = dbConnection.getRepository(CommunityPost);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);
      const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);

      // ==================== USER STATISTICS ====================
      console.log("\n📍 STEP 1: Fetching user statistics...");
      
      const [
        totalUsers,
        verifiedUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        newUsersLastMonth
      ] = await Promise.all([
        userRepo.count(),
        userRepo.count({ where: { is_verified: true } }),
        userRepo.count({ where: { is_active: true } }),
        userRepo.count({ 
          where: { date_joined: Between(today, now) } 
        }),
        userRepo.count({ 
          where: { date_joined: Between(thisWeekStart, now) } 
        }),
        userRepo.count({ 
          where: { date_joined: Between(thisMonthStart, now) } 
        }),
        userRepo.count({ 
          where: { date_joined: Between(lastMonthStart, lastMonthEnd) } 
        })
      ]);

      // User distribution by account type
      const usersByType = await userRepo
        .createQueryBuilder('user')
        .select('user.account_type', 'account_type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.account_type')
        .getRawMany();

      const userStats = {
        total: totalUsers,
        verified: verifiedUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        growthRate: newUsersLastMonth > 0 
          ? Math.round(((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100) 
          : 0,
        byAccountType: usersByType.reduce((acc: any, item: any) => {
          acc[item.account_type] = parseInt(item.count);
          return acc;
        }, {})
      };

      console.log("✅ User Stats:", {
        total: userStats.total,
        verified: userStats.verified,
        newToday: userStats.newToday
      });

      // ==================== RESEARCH PROJECT STATISTICS ====================
      console.log("\n📍 STEP 2: Fetching research project statistics...");
      
      const [
        totalProjects,
        publishedProjects,
        draftProjects,
        archivedProjects,
        newProjectsToday,
        newProjectsThisWeek,
        newProjectsThisMonth
      ] = await Promise.all([
        projectRepo.count(),
        projectRepo.count({ where: { status: ProjectStatus.PUBLISHED } }),
        projectRepo.count({ where: { status: ProjectStatus.DRAFT } }),
        projectRepo.count({ where: { status: ProjectStatus.ARCHIVED } }),
        projectRepo.count({ 
          where: { created_at: Between(today, now) } 
        }),
        projectRepo.count({ 
          where: { created_at: Between(thisWeekStart, now) } 
        }),
        projectRepo.count({ 
          where: { created_at: Between(thisMonthStart, now) } 
        })
      ]);

      // Project engagement stats
      const projectEngagement = await projectRepo
        .createQueryBuilder("project")
        .select("COALESCE(SUM(project.view_count), 0)", "totalViews")
        .addSelect("COALESCE(SUM(project.download_count), 0)", "totalDownloads")
        .addSelect("COALESCE(SUM(project.like_count), 0)", "totalLikes")
        .addSelect("COALESCE(SUM(project.comment_count), 0)", "totalComments")
        .getRawOne();

      // Top projects by views
      const topProjects = await projectRepo.find({
        where: { status: ProjectStatus.PUBLISHED },
        relations: ["author"],
        order: { view_count: "DESC" },
        take: 5,
        select: ["id", "title", "view_count", "download_count", "like_count"]
      });

      const projectStats = {
        total: totalProjects,
        published: publishedProjects,
        draft: draftProjects,
        archived: archivedProjects,
        newToday: newProjectsToday,
        newThisWeek: newProjectsThisWeek,
        newThisMonth: newProjectsThisMonth,
        publishRate: totalProjects > 0 ? Math.round((publishedProjects / totalProjects) * 100) : 0,
        engagement: {
          totalViews: parseInt(projectEngagement.totalViews) || 0,
          totalDownloads: parseInt(projectEngagement.totalDownloads) || 0,
          totalLikes: parseInt(projectEngagement.totalLikes) || 0,
          totalComments: parseInt(projectEngagement.totalComments) || 0,
          avgViewsPerProject: totalProjects > 0 
            ? Math.round(parseInt(projectEngagement.totalViews) / totalProjects) 
            : 0
        },
        topProjects: topProjects.map(p => ({
          id: p.id,
          title: p.title,
          views: p.view_count,
          downloads: p.download_count,
          likes: p.like_count,
          author: p.author ? `${p.author.first_name} ${p.author.last_name}` : 'Unknown'
        }))
      };

      console.log("✅ Project Stats:", {
        total: projectStats.total,
        published: projectStats.published,
        totalViews: projectStats.engagement.totalViews
      });

      // ==================== COMMUNITY STATISTICS ====================
      console.log("\n📍 STEP 3: Fetching community statistics...");
      
      const [
        totalCommunities,
        activeCommunities,
        pendingCommunities,
        newCommunitiesToday,
        newCommunitiesThisWeek,
        newCommunitiesThisMonth
      ] = await Promise.all([
        communityRepo.count(),
        communityRepo.count({ where: { is_active: true } }),
        communityRepo.count({ where: { is_active: false } }),
        communityRepo.count({ 
          where: { created_at: Between(today, now) } 
        }),
        communityRepo.count({ 
          where: { created_at: Between(thisWeekStart, now) } 
        }),
        communityRepo.count({ 
          where: { created_at: Between(thisMonthStart, now) } 
        })
      ]);

      // Community engagement stats
      const communityEngagement = await communityRepo
        .createQueryBuilder("community")
        .select("COALESCE(SUM(community.member_count), 0)", "totalMembers")
        .addSelect("COALESCE(SUM(community.post_count), 0)", "totalPosts")
        .addSelect("COALESCE(AVG(community.member_count), 0)", "avgMembersPerCommunity")
        .where("community.is_active = :isActive", { isActive: true })
        .getRawOne();

      // Pending join requests
      const pendingJoinRequests = await joinRequestRepo.count({
        where: { status: JoinRequestStatus.PENDING }
      });

      // Top communities by members
      const topCommunities = await communityRepo.find({
        where: { is_active: true },
        relations: ["creator"],
        order: { member_count: "DESC" },
        take: 5,
        select: ["id", "name", "member_count", "post_count", "category"]
      });

      const communityStats = {
        total: totalCommunities,
        active: activeCommunities,
        pending: pendingCommunities,
        approvalRate: totalCommunities > 0 ? Math.round((activeCommunities / totalCommunities) * 100) : 0,
        newToday: newCommunitiesToday,
        newThisWeek: newCommunitiesThisWeek,
        newThisMonth: newCommunitiesThisMonth,
        engagement: {
          totalMembers: parseInt(communityEngagement.totalMembers) || 0,
          totalPosts: parseInt(communityEngagement.totalPosts) || 0,
          avgMembersPerCommunity: Math.round(parseFloat(communityEngagement.avgMembersPerCommunity) || 0),
          pendingJoinRequests: pendingJoinRequests
        },
        topCommunities: topCommunities.map(c => ({
          id: c.id,
          name: c.name,
          members: c.member_count,
          posts: c.post_count,
          category: c.category,
          creator: c.creator ? `${c.creator.first_name} ${c.creator.last_name}` : 'Unknown'
        }))
      };

      console.log("✅ Community Stats:", {
        total: communityStats.total,
        active: communityStats.active,
        totalMembers: communityStats.engagement.totalMembers
      });

      // ==================== EVENT STATISTICS ====================
      console.log("\n📍 STEP 4: Fetching event statistics...");
      
      const [
        totalEvents,
        upcomingEvents,
        ongoingEvents,
        completedEvents,
        cancelledEvents,
        newEventsToday,
        newEventsThisWeek,
        newEventsThisMonth
      ] = await Promise.all([
        eventRepo.count({ 
          where: { status: EventStatus.UPCOMING } 
        }),
        eventRepo.count({ 
          where: { 
            status: EventStatus.UPCOMING,
            start_datetime: Between(now, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000))
          } 
        }),
        eventRepo.count({ where: { status: EventStatus.ONGOING } }),
        eventRepo.count({ where: { status: EventStatus.COMPLETED } }),
        eventRepo.count({ where: { status: EventStatus.CANCELLED } }),
        eventRepo.count({ 
          where: { created_at: Between(today, now) } 
        }),
        eventRepo.count({ 
          where: { created_at: Between(thisWeekStart, now) } 
        }),
        eventRepo.count({ 
          where: { created_at: Between(thisMonthStart, now) } 
        })
      ]);

      // Event registration stats
      const [totalRegistrations, approvedRegistrations, attendedRegistrations] = await Promise.all([
        attendeeRepo.count(),
        attendeeRepo.count({ where: { registration_status: RegistrationStatus.APPROVED } }),
        attendeeRepo.count({ where: { registration_status: RegistrationStatus.ATTENDED } })
      ]);

      // Upcoming events (next 7 days)
      const upcomingEventsList = await eventRepo.find({
        where: { 
          status: EventStatus.UPCOMING,
          start_datetime: Between(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
        },
        relations: ["organizer"],
        order: { start_datetime: "ASC" },
        take: 5,
        select: ["id", "title", "start_datetime", "event_type", "event_mode"]
      });

      const eventStats = {
        total: totalEvents,
        upcoming: upcomingEvents,
        ongoing: ongoingEvents,
        completed: completedEvents,
        cancelled: cancelledEvents,
        newToday: newEventsToday,
        newThisWeek: newEventsThisWeek,
        newThisMonth: newEventsThisMonth,
        registration: {
          total: totalRegistrations,
          approved: approvedRegistrations,
          attended: attendedRegistrations,
          attendanceRate: approvedRegistrations > 0 
            ? Math.round((attendedRegistrations / approvedRegistrations) * 100) 
            : 0
        },
        upcomingEvents: upcomingEventsList.map(e => ({
          id: e.id,
          title: e.title,
          startDate: e.start_datetime,
          type: e.event_type,
          mode: e.event_mode,
          organizer: e.organizer ? `${e.organizer.first_name} ${e.organizer.last_name}` : 'Unknown'
        }))
      };

      console.log("✅ Event Stats:", {
        total: eventStats.total,
        upcoming: eventStats.upcoming,
        totalRegistrations: eventStats.registration.total
      });

      // ==================== CONTENT STATISTICS ====================
      console.log("\n📍 STEP 5: Fetching content statistics...");
      
      const [
        totalBlogs,
        publishedBlogs,
        totalQAThreads,
        answeredQAThreads,
        totalCommunityPosts
      ] = await Promise.all([
        blogRepo.count(),
        blogRepo.count({ where: { status: ProjectStatus.PUBLISHED } }),
        qaRepo.count({ where: { is_active: true } }),
        qaRepo.count({ where: { is_answered: true, is_active: true } }),
        postRepo.count()
      ]);

      const contentStats = {
        blogs: {
          total: totalBlogs,
          published: publishedBlogs,
          publishRate: totalBlogs > 0 ? Math.round((publishedBlogs / totalBlogs) * 100) : 0
        },
        qa: {
          total: totalQAThreads,
          answered: answeredQAThreads,
          answerRate: totalQAThreads > 0 ? Math.round((answeredQAThreads / totalQAThreads) * 100) : 0,
          unanswered: totalQAThreads - answeredQAThreads
        },
        communityPosts: {
          total: totalCommunityPosts
        }
      };

      console.log("✅ Content Stats:", {
        blogs: contentStats.blogs.total,
        qaThreads: contentStats.qa.total,
        communityPosts: contentStats.communityPosts.total
      });

      // ==================== PLATFORM ACTIVITY TIMELINE ====================
      console.log("\n📍 STEP 6: Generating activity timeline...");
      
      // Get activity for last 7 days
      const activityTimeline = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const [usersCount, projectsCount, communitiesCount, eventsCount] = await Promise.all([
          userRepo.count({ where: { date_joined: Between(date, nextDate) } }),
          projectRepo.count({ where: { created_at: Between(date, nextDate) } }),
          communityRepo.count({ where: { created_at: Between(date, nextDate) } }),
          eventRepo.count({ where: { created_at: Between(date, nextDate) } })
        ]);

        activityTimeline.push({
          date: date.toISOString().split('T')[0],
          newUsers: usersCount,
          newProjects: projectsCount,
          newCommunities: communitiesCount,
          newEvents: eventsCount,
          totalActivity: usersCount + projectsCount + communitiesCount + eventsCount
        });
      }

      console.log("✅ Activity Timeline Generated:", activityTimeline.length, "days");

      // ==================== SYSTEM HEALTH & ALERTS ====================
      console.log("\n📍 STEP 7: Checking system health...");
      
      const alerts = [];

      // Check for pending approvals
      if (pendingCommunities > 0) {
        alerts.push({
          type: 'warning',
          category: 'communities',
          message: `${pendingCommunities} communities pending approval`,
          count: pendingCommunities,
          priority: 'medium'
        });
      }

      if (pendingJoinRequests > 5) {
        alerts.push({
          type: 'info',
          category: 'join_requests',
          message: `${pendingJoinRequests} pending community join requests`,
          count: pendingJoinRequests,
          priority: 'low'
        });
      }

      // Check for unanswered Q&A threads
      if (contentStats.qa.unanswered > 10) {
        alerts.push({
          type: 'info',
          category: 'qa',
          message: `${contentStats.qa.unanswered} unanswered Q&A threads`,
          count: contentStats.qa.unanswered,
          priority: 'medium'
        });
      }

      // Check for inactive users (more than 50%)
      if (userStats.inactive > userStats.active) {
        alerts.push({
          type: 'warning',
          category: 'users',
          message: `${userStats.inactive} inactive users (${Math.round((userStats.inactive / totalUsers) * 100)}% of total)`,
          count: userStats.inactive,
          priority: 'high'
        });
      }

      const systemHealth = {
        status: alerts.filter(a => a.type === 'error').length > 0 ? 'critical' 
              : alerts.filter(a => a.type === 'warning').length > 0 ? 'warning' 
              : 'healthy',
        alerts: alerts,
        alertCount: {
          total: alerts.length,
          critical: alerts.filter(a => a.priority === 'high').length,
          warning: alerts.filter(a => a.priority === 'medium').length,
          info: alerts.filter(a => a.priority === 'low').length
        }
      };

      console.log("✅ System Health:", systemHealth.status, `(${alerts.length} alerts)`);

      // ==================== COMPILE SUMMARY ====================
      const summary = {
        overview: {
          totalUsers: userStats.total,
          totalProjects: projectStats.total,
          totalCommunities: communityStats.total,
          totalEvents: eventStats.total,
          platformHealth: systemHealth.status
        },
        users: userStats,
        projects: projectStats,
        communities: communityStats,
        events: eventStats,
        content: contentStats,
        activityTimeline: activityTimeline,
        systemHealth: systemHealth,
        generatedAt: now.toISOString()
      };

      console.log("\n✅ ========== ADMIN DASHBOARD SUMMARY COMPLETE ==========");
      console.log("📊 Summary Generated Successfully");
      console.log("   Users:", summary.overview.totalUsers);
      console.log("   Projects:", summary.overview.totalProjects);
      console.log("   Communities:", summary.overview.totalCommunities);
      console.log("   Events:", summary.overview.totalEvents);
      console.log("   Health:", summary.overview.platformHealth);
      console.log("========================================================\n");

      res.json({
        success: true,
        data: { summary }
      });

    } catch (error: any) {
      console.error("\n❌ ========== ADMIN DASHBOARD SUMMARY ERROR ==========");
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
      console.error("====================================================\n");

      res.status(500).json({
        success: false,
        message: "Failed to fetch admin dashboard summary",
        error: error.message
      });
    }
  }

  /**
   * Get detailed analytics for specific date range
   * Allows admins to analyze trends over custom periods
   */
  static async getDetailedAnalytics(req: Request, res: Response) {
    try {
      const { startDate, endDate, metric } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "startDate and endDate are required"
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      console.log(`\n📊 Generating analytics from ${start.toISOString()} to ${end.toISOString()}`);

      const userRepo = dbConnection.getRepository(User);
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const communityRepo = dbConnection.getRepository(Community);
      const eventRepo = dbConnection.getRepository(Event);

      let analyticsData: any = {};

      if (!metric || metric === 'users') {
        const users = await userRepo.count({
          where: { date_joined: Between(start, end) }
        });
        analyticsData.users = { newUsers: users };
      }

      if (!metric || metric === 'projects') {
        const projects = await projectRepo.count({
          where: { created_at: Between(start, end) }
        });
        analyticsData.projects = { newProjects: projects };
      }

      if (!metric || metric === 'communities') {
        const communities = await communityRepo.count({
          where: { created_at: Between(start, end) }
        });
        analyticsData.communities = { newCommunities: communities };
      }

      if (!metric || metric === 'events') {
        const events = await eventRepo.count({
          where: { created_at: Between(start, end) }
        });
        analyticsData.events = { newEvents: events };
      }

      res.json({
        success: true,
        data: {
          period: { startDate: start, endDate: end },
          analytics: analyticsData
        }
      });

    } catch (error: any) {
      console.error("❌ Detailed analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch detailed analytics",
        error: error.message
      });
    }
  }


    /**
   * Get all activities with pagination and filtering
   * Returns combined activities from all platform actions
   */

}







