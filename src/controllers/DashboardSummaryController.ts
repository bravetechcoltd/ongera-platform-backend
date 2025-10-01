// @ts-nocheck

import { Request, Response } from "express";
import dbConnection from '../database/db';
import { ResearchProject, ProjectStatus } from "../database/models/ResearchProject";
import { Community } from "../database/models/Community";
import { Event, EventStatus } from "../database/models/Event";
import { BlogPost } from "../database/models/BlogPost";
import { QAThread } from "../database/models/QAThread";
import { CommunityPost } from "../database/models/CommunityPost";
import { EventAttendee } from "../database/models/EventAttendee";
import { Between } from "typeorm";

export class DashboardSummaryController {
  static async getDashboardSummary(req: Request, res: Response) {
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
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const communityRepo = dbConnection.getRepository(Community);
      const eventRepo = dbConnection.getRepository(Event);
      const blogRepo = dbConnection.getRepository(BlogPost);
      const qaRepo = dbConnection.getRepository(QAThread);
      const postRepo = dbConnection.getRepository(CommunityPost);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      // 1. Fetch User's Research Projects Stats
      console.log("📍 STEP 1: Fetching research projects...");
      const [totalProjects, publishedProjects, draftProjects] = await Promise.all([
        projectRepo.count({ where: { author: { id: userId } } }),
        projectRepo.count({ 
          where: { 
            author: { id: userId }, 
            status: ProjectStatus.PUBLISHED 
          } 
        }),
        projectRepo.count({ 
          where: { 
            author: { id: userId }, 
            status: ProjectStatus.DRAFT 
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
          status: EventStatus.UPCOMING
        } 
      });

      // Events user is attending (check EventAttendee table)
      const attendingEventsCount = await attendeeRepo
        .createQueryBuilder("attendee")
        .leftJoin("attendee.event", "event")
        .where("attendee.user_id = :userId", { userId })
        .andWhere("event.status IN (:...statuses)", { 
          statuses: [EventStatus.UPCOMING, EventStatus.ONGOING] 
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
          statuses: [EventStatus.UPCOMING, EventStatus.ONGOING] 
        })
        .andWhere(
          "(event.organizer_id = :userId OR attendee.user_id = :userId)",
          { userId }
        )
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
            status: ProjectStatus.PUBLISHED 
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
            created_at: Between(today, tomorrow)
          },
          relations: ["author", "author.profile", "tags"],
          order: { created_at: "DESC" },
          take: 10
        }),
        postRepo.find({
          where: {
            author: { id: userId },
            created_at: Between(today, tomorrow)
          },
          relations: ["author", "author.profile", "community"],
          order: { created_at: "DESC" },
          take: 10
        }),
        eventRepo.find({
          where: {
            organizer: { id: userId },
            created_at: Between(today, tomorrow)
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

    } catch (error: any) {
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