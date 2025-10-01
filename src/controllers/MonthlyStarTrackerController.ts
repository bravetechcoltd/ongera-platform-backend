import { Request, Response } from "express";
import dbConnection from '../database/db';
import { MonthlyStarTracker } from "../database/models/MonthlyStarTracker";
import { User } from "../database/models/User";
import { ResearchProject, ProjectStatus } from "../database/models/ResearchProject";
import { BlogPost } from "../database/models/BlogPost";
import { EventAttendee } from "../database/models/EventAttendee";
import { Community } from "../database/models/Community";
import { UploadToCloud } from "../helpers/cloud";
import { sendEmail } from "../helpers/utils";
import { MonthlyStarCongratulationsTemplate } from "../helpers/MonthlyStarCongratulationsTemplate";
import { Between } from "typeorm";

// Score weights
const SCORE_WEIGHTS = {
  PROJECT_UPLOAD: 5,
  BLOG_POST: 3,
  EVENT_ATTENDED: 2,
  NEW_FOLLOWER: 1
};

export class MonthlyStarTrackerController {
  
  /**
   * Helper: Check if date is in current month
   */
  private static isInCurrentMonth(date: Date, month: number, year: number): boolean {
    const d = new Date(date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  }

  /**
   * Helper: Calculate user score for a specific month
   */
  private static calculateUserScore(
    projects: any[],
    blogs: any[],
    events: any[],
    followersCount: number,
    month: number,
    year: number
  ) {
    const monthlyProjects = projects.filter(p => 
      MonthlyStarTrackerController.isInCurrentMonth(p.created_at, month, year)
    );
    const monthlyBlogs = blogs.filter(b => 
      MonthlyStarTrackerController.isInCurrentMonth(b.created_at, month, year)
    );
    const monthlyEvents = events.filter(e => 
      MonthlyStarTrackerController.isInCurrentMonth(e.registered_at, month, year)
    );

    const score = 
      (monthlyProjects.length * SCORE_WEIGHTS.PROJECT_UPLOAD) +
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
   * Get top 3 performers across entire platform for current month
   */
  static async getBestPerformerAllCommunities(req: Request, res: Response) {
    try {
      console.log("\n🏆 ========== GET BEST PERFORMERS (ALL COMMUNITIES) ==========");
      
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      console.log(`📅 Current Month: ${month}/${year}`);

      const userRepo = dbConnection.getRepository(User);
      
      // Fetch all users with their activities
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

      // Calculate scores for each user
      const userScores = users.map(user => {
        // FIX: Use class name instead of 'this'
        const score = MonthlyStarTrackerController.calculateUserScore(
          user.projects || [],
          user.blog_posts || [],
          user.eventAttendances || [],
          user.followers?.length || 0,
          month,
          year
        );

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

      // Sort by score and get top 3
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

    } catch (error: any) {
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
   * Get top 3 performers in specific community for current month
   */
  static async getBestPerformerOneCommunity(req: Request, res: Response) {
    try {
      console.log("\n🏆 ========== GET BEST PERFORMERS (ONE COMMUNITY) ==========");
      
      const { communityId } = req.params;
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      console.log(`📅 Current Month: ${month}/${year}`);
      console.log(`🏘️ Community ID: ${communityId}`);

      // Verify community exists
      const communityRepo = dbConnection.getRepository(Community);
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

      const userRepo = dbConnection.getRepository(User);
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const blogRepo = dbConnection.getRepository(BlogPost);
      const attendeeRepo = dbConnection.getRepository(EventAttendee);

      // Calculate scores for each member
      const userScores = [];

      for (const member of community.members) {
        // Get community-specific projects
        const projects = await projectRepo.find({
          where: {
            author: { id: member.id },
            community: { id: communityId },
            status: ProjectStatus.PUBLISHED
          }
        });

        // Get all blogs (not community-specific in current model)
        const blogs = await blogRepo.find({
          where: { author: { id: member.id } }
        });

        // Get community-specific event attendances
        const events = await attendeeRepo
          .createQueryBuilder("attendee")
          .leftJoinAndSelect("attendee.event", "event")
          .where("attendee.user_id = :userId", { userId: member.id })
          .andWhere("event.community_id = :communityId", { communityId })
          .getMany();

        // Get user with followers
        const user = await userRepo.findOne({
          where: { id: member.id },
          relations: ["followers", "profile"]
        });

        if (!user) continue;

        // FIX: Use class name instead of 'this'
        const score = MonthlyStarTrackerController.calculateUserScore(
          projects,
          blogs,
          events,
          user.followers?.length || 0,
          month,
          year
        );

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

      // Sort and get top 3
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

    } catch (error: any) {
      console.error("❌ Get community best performers error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch community best performers",
        error: error.message
      });
    }
  }

  /**
   * POST /api/tracker/approve-best-performer
   * Admin approves monthly star and sends congratulations email
   */
  static async approveBestPerformer(req: Request, res: Response) {
    try {
      console.log("\n✅ ========== APPROVE BEST PERFORMER ==========");
      
      const { user_id, community_id, month, year, description, rewards } = req.body;

      console.log("Request data:", { user_id, community_id, month, year });

      // Validate required fields
      if (!user_id || !month || !year || !description) {
        return res.status(400).json({
          success: false,
          message: "user_id, month, year, and description are required"
        });
      }

      // Validate badge image
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Badge image is required"
        });
      }

      // Upload badge image
      console.log("📤 Uploading badge image...");
      const uploadResult = await UploadToCloud(req.file);
      const badge_image_url = uploadResult.secure_url;
      console.log("✅ Badge uploaded:", badge_image_url);

      // Get user statistics
      const userRepo = dbConnection.getRepository(User);
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

      // Calculate statistics
      let statistics;
      if (community_id) {
        // Community-specific stats
        const projectRepo = dbConnection.getRepository(ResearchProject);
        const blogRepo = dbConnection.getRepository(BlogPost);
        const attendeeRepo = dbConnection.getRepository(EventAttendee);

        const projects = await projectRepo.find({
          where: {
            author: { id: user_id },
            community: { id: community_id }
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

        // FIX: Use class name instead of 'this'
        statistics = MonthlyStarTrackerController.calculateUserScore(
          projects,
          blogs,
          events,
          user.followers?.length || 0,
          month,
          year
        );
      } else {
        // All-platform stats
        // FIX: Use class name instead of 'this'
        statistics = MonthlyStarTrackerController.calculateUserScore(
          user.projects || [],
          user.blog_posts || [],
          user.eventAttendances || [],
          user.followers?.length || 0,
          month,
          year
        );
      }

      // Create tracker record
      const trackerRepo = dbConnection.getRepository(MonthlyStarTracker);
      const tracker = trackerRepo.create({
        user: { id: user_id },
        month,
        year,
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
      console.log("✅ Tracker record saved");

      // Send congratulations email
      console.log("\n📧 ========== SENDING CONGRATULATIONS EMAIL ==========");
      try {
        const monthNames = ["January", "February", "March", "April", "May", "June", 
                           "July", "August", "September", "October", "November", "December"];

        let community_name = undefined;
        if (community_id) {
          const communityRepo = dbConnection.getRepository(Community);
          const community = await communityRepo.findOne({ where: { id: community_id } });
          community_name = community?.name;
        }

        const emailHtml = MonthlyStarCongratulationsTemplate.getCongratulationsEmail({
          user: {
            first_name: user.first_name,
            email: user.email
          },
          badge_image_url,
          month: monthNames[month - 1],
          year,
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

        await sendEmail({
          to: user.email,
          subject: `🌟 Congratulations! You're Our Monthly Star for ${monthNames[month - 1]} ${year}`,
          html: emailHtml
        });

        console.log(`✅ Email sent to ${user.email}`);
      } catch (emailError: any) {
        console.error("❌ Email failed:", emailError.message);
      }

      console.log("📧 ========== EMAIL COMPLETE ==========\n");

      res.json({
        success: true,
        message: "Best performer approved and notified successfully",
        data: { tracker }
      });

    } catch (error: any) {
      console.error("❌ Approve best performer error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve best performer",
        error: error.message
      });
    }
  }
}