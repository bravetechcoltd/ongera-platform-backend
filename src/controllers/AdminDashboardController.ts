
import { Request, Response } from "express";
import dbConnection from '../database/db';
import { User, AccountType } from "../database/models/User";
import { ResearchProject, ProjectStatus } from "../database/models/ResearchProject";
import { Community, CommunityType } from "../database/models/Community";
import { Event, EventStatus } from "../database/models/Event";
import { BlogPost, BlogStatus } from "../database/models/BlogPost";
import { QAThread } from "../database/models/QAThread";
import { CommunityPost } from "../database/models/CommunityPost";
import { EventAttendee, RegistrationStatus } from "../database/models/EventAttendee";
import { CommunityJoinRequest, JoinRequestStatus } from "../database/models/CommunityJoinRequest";
import { Between, LessThan, MoreThan } from "typeorm";
import { Comment } from "../database/models/Comment";
import { Like } from "../database/models/Like";

export class AdminDashboardController {
  
  /**
   * Get comprehensive admin dashboard summary with enhanced community and project analytics
   */
  static async getAdminDashboardSummary(req: Request, res: Response) {
    try {
      console.log("\n📊 ========== ENHANCED ADMIN DASHBOARD SUMMARY ==========");
      console.log("📅 Request Time:", new Date().toISOString());

      // Get date ranges for analytics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

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
      const commentRepo = dbConnection.getRepository(Comment);
      const likeRepo = dbConnection.getRepository(Like);

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
        userRepo.count({ where: { date_joined: Between(today, now) } }),
        userRepo.count({ where: { date_joined: Between(thisWeekStart, now) } }),
        userRepo.count({ where: { date_joined: Between(thisMonthStart, now) } }),
        userRepo.count({ where: { date_joined: Between(lastMonthStart, lastMonthEnd) } })
      ]);

      const usersByType = await userRepo
        .createQueryBuilder('user')
        .select('user.account_type', 'account_type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.account_type')
        .getRawMany();

      // ==================== COMMUNITY ANALYTICS ====================
      console.log("\n📍 STEP 2: Fetching community analytics...");
      
      // 1. Communities with most research projects
      const communitiesWithMostProjects = await communityRepo
        .createQueryBuilder("community")
        .leftJoin("community.projects", "project")
        .select([
          "community.id",
          "community.name",
          "community.category",
          "community.member_count",
          "community.post_count",
          "COUNT(project.id) as project_count"
        ])
        .groupBy("community.id")
        .orderBy("project_count", "DESC")
        .limit(10)
        .getRawMany();

      // 2. Communities by member count
      const communitiesByMemberCount = await communityRepo
        .createQueryBuilder("community")
        .select([
          "community.id",
          "community.name",
          "community.member_count",
          "community.post_count",
          "community.category"
        ])
        .orderBy("community.member_count", "DESC")
        .limit(10)
        .getMany();

      // 3. Communities by activity (posts)
      const communitiesByActivity = await communityRepo
        .createQueryBuilder("community")
        .select([
          "community.id",
          "community.name",
          "community.post_count",
          "community.member_count",
          "community.category"
        ])
        .orderBy("community.post_count", "DESC")
        .limit(10)
        .getMany();

      // 4. Community growth over time (last 6 months)
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const communityGrowthOverTime = await communityRepo
        .createQueryBuilder("community")
        .select([
          "DATE_TRUNC('month', community.created_at) as month",
          "COUNT(*) as count"
        ])
        .where("community.created_at >= :sixMonthsAgo", { sixMonthsAgo })
        .groupBy("month")
        .orderBy("month", "ASC")
        .getRawMany();

      // 5. Community type distribution
      const communityTypeDistribution = await communityRepo
        .createQueryBuilder("community")
        .select("community.community_type", "type")
        .addSelect("COUNT(*)", "count")
        .groupBy("community.community_type")
        .getRawMany();

      // 6. Community category distribution
      const communityCategoryDistribution = await communityRepo
        .createQueryBuilder("community")
        .select("community.category", "category")
        .addSelect("COUNT(*)", "count")
        .groupBy("community.category")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany();

      // 7. Community join requests analytics
      const [
        totalJoinRequests,
        pendingJoinRequests,
        approvedJoinRequests,
        rejectedJoinRequests
      ] = await Promise.all([
        joinRequestRepo.count(),
        joinRequestRepo.count({ where: { status: JoinRequestStatus.PENDING } }),
        joinRequestRepo.count({ where: { status: JoinRequestStatus.APPROVED } }),
        joinRequestRepo.count({ where: { status: JoinRequestStatus.REJECTED } })
      ]);

      // 8. Most active communities (by join requests)
      const communitiesByJoinRequests = await joinRequestRepo
        .createQueryBuilder("request")
        .leftJoin("request.community", "community")
        .select([
          "community.id",
          "community.name",
          "COUNT(request.id) as request_count",
          "SUM(CASE WHEN request.status = 'Approved' THEN 1 ELSE 0 END) as approved_count"
        ])
        .groupBy("community.id")
        .orderBy("request_count", "DESC")
        .limit(10)
        .getRawMany();

      // ==================== RESEARCH PROJECT ANALYTICS ====================
      console.log("\n📍 STEP 3: Fetching research project analytics...");

      // 1. Projects by research type
      const projectsByResearchType = await projectRepo
        .createQueryBuilder("project")
        .select("project.research_type", "research_type")
        .addSelect("COUNT(*)", "count")
        .addSelect("SUM(project.view_count)", "total_views")
        .addSelect("SUM(project.download_count)", "total_downloads")
        .groupBy("project.research_type")
        .getRawMany();

      // 2. Projects by collaboration status
      const projectsByCollaborationStatus = await projectRepo
        .createQueryBuilder("project")
        .select("project.collaboration_status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("project.collaboration_status")
        .getRawMany();

      // 3. Projects by status
      const projectsByStatus = await projectRepo
        .createQueryBuilder("project")
        .select("project.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("project.status")
        .getRawMany();

      // 4. Top projects by engagement (views + likes + comments)
      const topProjectsByEngagement = await projectRepo
        .createQueryBuilder("project")
        .leftJoin("project.author", "author")
        .select([
          "project.id",
          "project.title",
          "project.view_count",
          "project.download_count",
          "project.like_count",
          "project.comment_count",
          "author.first_name",
          "author.last_name"
        ])
        .where("project.status = :status", { status: ProjectStatus.PUBLISHED })
        .orderBy("project.view_count + project.like_count + project.comment_count", "DESC")
        .limit(10)
        .getMany();

      // 5. Project growth over time
      const projectGrowthOverTime = await projectRepo
        .createQueryBuilder("project")
        .select([
          "DATE_TRUNC('month', project.created_at) as month",
          "COUNT(*) as count",
          "SUM(CASE WHEN project.status = 'Published' THEN 1 ELSE 0 END) as published_count"
        ])
        .where("project.created_at >= :sixMonthsAgo", { sixMonthsAgo })
        .groupBy("month")
        .orderBy("month", "ASC")
        .getRawMany();

      // 6. Field of study distribution
      const fieldOfStudyDistribution = await projectRepo
        .createQueryBuilder("project")
        .select("project.field_of_study", "field")
        .addSelect("COUNT(*)", "count")
        .where("project.field_of_study IS NOT NULL")
        .groupBy("project.field_of_study")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany();

      // 7. Project collaboration stats
      const collaborationStats = await projectRepo
        .createQueryBuilder("project")
        .select([
          "SUM(CASE WHEN project.collaboration_status = 'Seeking Collaborators' THEN 1 ELSE 0 END) as seeking_collaborators",
          "SUM(CASE WHEN project.collaboration_status = 'Collaborative' THEN 1 ELSE 0 END) as collaborative",
          "SUM(CASE WHEN project.collaboration_status = 'Solo' THEN 1 ELSE 0 END) as solo",
          "SUM(project.collaborator_count) as total_collaborators"
        ])
        .getRawOne();

      // 8. Most collaborative projects
      const mostCollaborativeProjects = await projectRepo
        .createQueryBuilder("project")
        .leftJoin("project.author", "author")
        .select([
          "project.id",
          "project.title",
          "project.collaborator_count",
          "project.collaboration_status",
          "author.first_name",
          "author.last_name"
        ])
        .where("project.collaborator_count > 0")
        .orderBy("project.collaborator_count", "DESC")
        .limit(10)
        .getMany();

      // 9. Project engagement summary
      const projectEngagement = await projectRepo
        .createQueryBuilder("project")
        .select([
          "COALESCE(SUM(project.view_count), 0) as totalViews",
          "COALESCE(SUM(project.download_count), 0) as totalDownloads",
          "COALESCE(SUM(project.like_count), 0) as totalLikes",
          "COALESCE(SUM(project.comment_count), 0) as totalComments",
          "AVG(project.view_count) as avgViews",
          "AVG(project.download_count) as avgDownloads"
        ])
        .getRawOne();

      // 10. Top projects by views
      const topProjects = await projectRepo.find({
        where: { status: ProjectStatus.PUBLISHED },
        relations: ["author"],
        order: { view_count: "DESC" },
        take: 5,
        select: ["id", "title", "view_count", "download_count", "like_count"]
      });

      // ==================== BASIC STATS ====================
      
      // Community basic stats
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
        communityRepo.count({ where: { created_at: Between(today, now) } }),
        communityRepo.count({ where: { created_at: Between(thisWeekStart, now) } }),
        communityRepo.count({ where: { created_at: Between(thisMonthStart, now) } })
      ]);

      const communityEngagement = await communityRepo
        .createQueryBuilder("community")
        .select("COALESCE(SUM(community.member_count), 0)", "totalMembers")
        .addSelect("COALESCE(SUM(community.post_count), 0)", "totalPosts")
        .addSelect("COALESCE(AVG(community.member_count), 0)", "avgMembersPerCommunity")
        .where("community.is_active = :isActive", { isActive: true })
        .getRawOne();

      // Project basic stats
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
        projectRepo.count({ where: { created_at: Between(today, now) } }),
        projectRepo.count({ where: { created_at: Between(thisWeekStart, now) } }),
        projectRepo.count({ where: { created_at: Between(thisMonthStart, now) } })
      ]);

      // Event basic stats
      const totalEvents = await eventRepo.count();

      // ==================== CHART DATA PREPARATION ====================
      console.log("\n📍 STEP 4: Preparing chart data...");

      // Prepare community data for charts
      const communityChartData = {
        topCommunitiesByProjects: communitiesWithMostProjects.map((c: any) => ({
          name: c.community_name || 'Unknown',
          projectCount: parseInt(c.project_count) || 0,
          members: c.community_member_count || 0,
          posts: c.community_post_count || 0
        })),
        topCommunitiesByMembers: communitiesByMemberCount.map(c => ({
          name: c.name,
          members: c.member_count,
          posts: c.post_count,
          category: c.category
        })),
        topCommunitiesByActivity: communitiesByActivity.map(c => ({
          name: c.name,
          posts: c.post_count,
          members: c.member_count,
          category: c.category
        })),
        communityGrowth: communityGrowthOverTime.map((item: any) => ({
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          count: parseInt(item.count)
        })),
        communityTypeDistribution: communityTypeDistribution.map((item: any) => ({
          type: item.type,
          count: parseInt(item.count)
        })),
        communityCategoryDistribution: communityCategoryDistribution.map((item: any) => ({
          category: item.category,
          count: parseInt(item.count)
        })),
        communityJoinRequests: {
          total: totalJoinRequests,
          pending: pendingJoinRequests,
          approved: approvedJoinRequests,
          rejected: rejectedJoinRequests
        },
        communitiesByJoinRequests: communitiesByJoinRequests.map((item: any) => ({
          name: item.community_name || 'Unknown',
          requestCount: parseInt(item.request_count) || 0,
          approvedCount: parseInt(item.approved_count) || 0
        }))
      };

      // Prepare project data for charts
      const projectChartData = {
        byResearchType: projectsByResearchType.map((item: any) => ({
          type: item.research_type,
          count: parseInt(item.count),
          totalViews: parseInt(item.total_views) || 0,
          totalDownloads: parseInt(item.total_downloads) || 0
        })),
        byCollaborationStatus: projectsByCollaborationStatus.map((item: any) => ({
          status: item.status,
          count: parseInt(item.count)
        })),
        byStatus: projectsByStatus.map((item: any) => ({
          status: item.status,
          count: parseInt(item.count)
        })),
        topByEngagement: topProjectsByEngagement.map(p => ({
          id: p.id,
          title: p.title,
          views: p.view_count,
          downloads: p.download_count,
          likes: p.like_count,
          comments: p.comment_count,
          author: p.author ? `${p.author.first_name} ${p.author.last_name}` : 'Unknown'
        })),
        growthOverTime: projectGrowthOverTime.map((item: any) => ({
          month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total: parseInt(item.count),
          published: parseInt(item.published_count)
        })),
        fieldOfStudyDistribution: fieldOfStudyDistribution.map((item: any) => ({
          field: item.field || 'Other',
          count: parseInt(item.count)
        })),
        collaborationStats: {
          seekingCollaborators: parseInt(collaborationStats?.seeking_collaborators || 0),
          collaborative: parseInt(collaborationStats?.collaborative || 0),
          solo: parseInt(collaborationStats?.solo || 0),
          totalCollaborators: parseInt(collaborationStats?.total_collaborators || 0)
        },
        mostCollaborativeProjects: mostCollaborativeProjects.map(p => ({
          id: p.id,
          title: p.title,
          collaboratorCount: p.collaborator_count,
          status: p.collaboration_status,
          author: p.author ? `${p.author.first_name} ${p.author.last_name}` : 'Unknown'
        })),
        engagement: {
          totalViews: parseInt(projectEngagement?.totalViews) || 0,
          totalDownloads: parseInt(projectEngagement?.totalDownloads) || 0,
          totalLikes: parseInt(projectEngagement?.totalLikes) || 0,
          totalComments: parseInt(projectEngagement?.totalComments) || 0,
          avgViews: Math.round(parseFloat(projectEngagement?.avgViews)) || 0,
          avgDownloads: Math.round(parseFloat(projectEngagement?.avgDownloads)) || 0
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

      // ==================== ACTIVITY TIMELINE ====================
      console.log("\n📍 STEP 5: Generating activity timeline...");
      
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

      // ==================== COMPILE ENHANCED SUMMARY ====================
      
      const summary = {
        overview: {
          totalUsers,
          totalProjects,
          totalCommunities,
          totalEvents,
          platformHealth: "healthy"
        },
        users: {
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
        },
        projects: {
          total: totalProjects,
          published: publishedProjects,
          draft: draftProjects,
          archived: archivedProjects,
          newToday: newProjectsToday,
          newThisWeek: newProjectsThisWeek,
          newThisMonth: newProjectsThisMonth,
          publishRate: totalProjects > 0 ? Math.round((publishedProjects / totalProjects) * 100) : 0,
          engagement: projectChartData.engagement,
          topProjects: projectChartData.topProjects,
          // ENHANCED PROJECT ANALYTICS
          byResearchType: projectChartData.byResearchType,
          byCollaborationStatus: projectChartData.byCollaborationStatus,
          byStatus: projectChartData.byStatus,
          topByEngagement: projectChartData.topByEngagement,
          growthOverTime: projectChartData.growthOverTime,
          fieldOfStudyDistribution: projectChartData.fieldOfStudyDistribution,
          collaborationStats: projectChartData.collaborationStats,
          mostCollaborativeProjects: projectChartData.mostCollaborativeProjects
        },
        communities: {
          total: totalCommunities,
          active: activeCommunities,
          pending: pendingCommunities,
          approvalRate: totalCommunities > 0 ? Math.round((activeCommunities / totalCommunities) * 100) : 0,
          newToday: newCommunitiesToday,
          newThisWeek: newCommunitiesThisWeek,
          newThisMonth: newCommunitiesThisMonth,
          engagement: {
            totalMembers: parseInt(communityEngagement?.totalMembers) || 0,
            totalPosts: parseInt(communityEngagement?.totalPosts) || 0,
            avgMembersPerCommunity: Math.round(parseFloat(communityEngagement?.avgMembersPerCommunity) || 0),
            pendingJoinRequests
          },
          // ENHANCED COMMUNITY ANALYTICS
          chartData: communityChartData,
          joinRequests: {
            total: totalJoinRequests,
            pending: pendingJoinRequests,
            approved: approvedJoinRequests,
            rejected: rejectedJoinRequests
          },
          topByProjects: communityChartData.topCommunitiesByProjects,
          topByMembers: communityChartData.topCommunitiesByMembers,
          topByActivity: communityChartData.topCommunitiesByActivity,
          growthOverTime: communityChartData.communityGrowth,
          typeDistribution: communityChartData.communityTypeDistribution,
          categoryDistribution: communityChartData.communityCategoryDistribution,
          topByJoinRequests: communityChartData.communitiesByJoinRequests
        },
        events: {
          total: totalEvents,
          upcoming: await eventRepo.count({ where: { status: EventStatus.UPCOMING } }),
          ongoing: await eventRepo.count({ where: { status: EventStatus.ONGOING } }),
          completed: await eventRepo.count({ where: { status: EventStatus.COMPLETED } }),
          cancelled: await eventRepo.count({ where: { status: EventStatus.CANCELLED } })
        },
        content: {
          blogs: {
            total: await blogRepo.count(),
            published: await blogRepo.count({ where: { status: BlogStatus.PUBLISHED } })
          },
          qa: {
            total: await qaRepo.count(),
            answered: await qaRepo.count({ where: { is_answered: true } })
          },
          communityPosts: {
            total: await postRepo.count()
          }
        },
        // Activity timeline for last 7 days
        activityTimeline,
        // ENHANCED CHART DATA
        chartData: {
          communities: communityChartData,
          projects: projectChartData
        },
        generatedAt: now.toISOString()
      };

      console.log("\n✅ ENHANCED DASHBOARD SUMMARY COMPLETE");
      console.log("   Users:", summary.overview.totalUsers);
      console.log("   Projects:", summary.overview.totalProjects);
      console.log("   Communities:", summary.overview.totalCommunities);
      console.log("   Events:", summary.overview.totalEvents);
      console.log("========================================================\n");

      res.json({
        success: true,
        data: { summary }
      });

    } catch (error: any) {
      console.error("\n❌ ENHANCED DASHBOARD SUMMARY ERROR:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin dashboard summary",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get detailed analytics for specific date range
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

      console.log(`\n📊 Generating detailed analytics from ${start.toISOString()} to ${end.toISOString()}`);

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
}