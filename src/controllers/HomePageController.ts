import { Request, Response } from "express";
import dbConnection from '../database/db';
import { ResearchProject, ProjectStatus } from "../database/models/ResearchProject";
import { Event, EventStatus } from "../database/models/Event";
import { Community } from "../database/models/Community";
import { User } from "../database/models/User";

export class HomePageController {
  /**
   * Get homepage summary statistics
   * Returns counts for projects, researchers, communities, and events
   */
  static async getHomePageSummary(req: Request, res: Response) {
    try {
      console.log("\n📊 [GET HOMEPAGE SUMMARY] Starting...");

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const eventRepo = dbConnection.getRepository(Event);
      const communityRepo = dbConnection.getRepository(Community);
      const userRepo = dbConnection.getRepository(User);

      // Get counts in parallel for better performance
      const [
        projectsCount,
        researchersCount,
        communitiesCount,
        eventsCount
      ] = await Promise.all([
        projectRepo.count({
          where: { status: ProjectStatus.PUBLISHED }
        }),
        userRepo.count(),
        communityRepo.count({
          where: { is_active: true }
        }),
        eventRepo.count({
          where: { status: EventStatus.UPCOMING }
        })
      ]);

      console.log(`✅ Summary: ${projectsCount} projects, ${researchersCount} researchers, ${communitiesCount} communities, ${eventsCount} events`);

      res.json({
        success: true,
        data: {
          projectsCount,
          researchersCount,
          communitiesCount,
          eventsCount
        }
      });
    } catch (error: any) {
      console.error("❌ Get homepage summary error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch homepage summary",
        error: error.message
      });
    }
  }

  /**
   * Get featured content for homepage
   * Returns top 3 projects, events, and communities
   */
  static async getHomePageContent(req: Request, res: Response) {
    try {
      console.log("\n🎯 [GET HOMEPAGE CONTENT] Starting...");

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const eventRepo = dbConnection.getRepository(Event);
      const communityRepo = dbConnection.getRepository(Community);

      // Fetch top 3 published projects (by view count)
      const projects = await projectRepo.createQueryBuilder("project")
        .leftJoinAndSelect("project.author", "author")
        .leftJoinAndSelect("author.profile", "profile")
        .leftJoinAndSelect("project.tags", "tags")
        .where("project.status = :status", { status: ProjectStatus.PUBLISHED })
        .orderBy("project.view_count", "DESC")
        .addOrderBy("project.created_at", "DESC")
        .take(3)
        .select([
          "project",
          "author.id",
          "author.email",
          "author.first_name",
          "author.last_name",
          "author.profile_picture_url",
          "author.account_type",
          "profile.institution_name",
          "tags"
        ])
        .getMany();

      // Fetch top 3 upcoming events (only upcoming status and future dates)
      const events = await eventRepo.createQueryBuilder("event")
        .leftJoinAndSelect("event.organizer", "organizer")
        .leftJoinAndSelect("organizer.profile", "profile")
        .leftJoinAndSelect("event.community", "community")
        .leftJoinAndSelect("event.attendees", "attendees")
        .where("event.status = :status", { status: EventStatus.UPCOMING })
        .andWhere("event.start_datetime > :now", { now: new Date() })
        .orderBy("event.start_datetime", "ASC")
        .take(4) // Get 4 events (1 featured + 3 upcoming)
        .select([
          "event",
          "organizer.id",
          "organizer.email",
          "organizer.first_name",
          "organizer.last_name",
          "organizer.profile_picture_url",
          "organizer.account_type",
          "profile",
          "community.id",
          "community.name",
          "community.slug",
          "attendees.id",
          "attendees.registration_status"
        ])
        .getMany();

      // Fetch top 3 active communities (by member count)
      const communities = await communityRepo.createQueryBuilder("community")
        .leftJoinAndSelect("community.creator", "creator")
        .leftJoinAndSelect("creator.profile", "profile")
        .where("community.is_active = :isActive", { isActive: true })
        .orderBy("community.member_count", "DESC")
        .addOrderBy("community.created_at", "DESC")
        .take(3)
        .select([
          "community",
          "creator.id",
          "creator.first_name",
          "creator.last_name",
          "creator.profile_picture_url",
          "profile"
        ])
        .getMany();

      console.log(`✅ Featured content: ${projects.length} projects, ${events.length} events, ${communities.length} communities`);

      res.json({
        success: true,
        data: {
          projects,
          events,
          communities
        }
      });
    } catch (error: any) {
      console.error("❌ Get homepage content error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch homepage content",
        error: error.message
      });
    }
  }
}