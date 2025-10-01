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
import { User } from "../database/models/User";
import { Comment } from "../database/models/Comment";
import { Like } from "../database/models/Like";

export class DashboardSummaryController {

    static async getAllActivities(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, type = 'all' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const userRepo = dbConnection.getRepository(User);
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const communityRepo = dbConnection.getRepository(Community);
      const eventRepo = dbConnection.getRepository(Event);
      const blogRepo = dbConnection.getRepository(BlogPost);
      const qaRepo = dbConnection.getRepository(QAThread);
      const postRepo = dbConnection.getRepository(CommunityPost);
      const commentRepo = dbConnection.getRepository(Comment);
      const likeRepo = dbConnection.getRepository(Like);

      let activities: any[] = [];

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

        activities.push(...posts.map(p => ({
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
            communityId: p.community?.id,
            viewsCount: p.view_count
          },
          link: `/dashboard/user/communities/${p.community?.id}`
        })));
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

      activities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const totalActivities = activities.length;
      const paginatedActivities = type === 'all' 
        ? activities.slice(skip, skip + limitNum)
        : activities;

      const hasMore = skip + limitNum < totalActivities;

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

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch activities",
        error: error.message
      });
    }
  }
  
  static async getDashboardSummary(req: Request, res: Response) {
    try {
      const userId = req.user.userId;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const communityRepo = dbConnection.getRepository(Community);
      const eventRepo = dbConnection.getRepository(Event);
      const blogRepo = dbConnection.getRepository(BlogPost);
      const qaRepo = dbConnection.getRepository(QAThread);
      const postRepo = dbConnection.getRepository(CommunityPost);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

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

      const projectStats = await projectRepo
        .createQueryBuilder("project")
        .select("COALESCE(SUM(project.view_count), 0)", "totalViews")
        .addSelect("COALESCE(SUM(project.download_count), 0)", "totalDownloads")
        .addSelect("COALESCE(SUM(project.like_count), 0)", "totalLikes")
        .where("project.author_id = :userId", { userId })
        .getRawOne();

      const createdCommunitiesCount = await communityRepo.count({
        where: { 
          creator: { id: userId },
          is_active: true
        }
      });

      const memberCommunities = await communityRepo
        .createQueryBuilder("community")
        .leftJoin("community.members", "member")
        .where("member.id = :userId", { userId })
        .andWhere("community.is_active = :isActive", { isActive: true })
        .getCount();

      const totalCommunities = createdCommunitiesCount + memberCommunities;

      const organizingEvents = await eventRepo.count({ 
        where: { 
          organizer: { id: userId },
          status: EventStatus.UPCOMING
        } 
      });

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

      const [totalBlogs, publishedBlogs] = await Promise.all([
        blogRepo.count({ where: { author: { id: userId } } }),
        blogRepo.count({ 
          where: { 
            author: { id: userId }, 
            status: ProjectStatus.PUBLISHED 
          } 
        })
      ]);

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

      res.json({
        success: true,
        data: { summary }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard summary",
        error: error.message
      });
    }
  }
}