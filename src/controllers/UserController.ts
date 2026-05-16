// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from "../database/db";
import { User } from "../database/models/User";
import { UserFollow } from "../database/models/UserFollow";
import { ResearchProject, ProjectStatus, Visibility } from "../database/models/ResearchProject";
import { Community } from "../database/models/Community";
import { Notification } from "../database/models/Notification";
import { UserAggregateService } from "../services/UserAggregateService";
import { SocialNotificationService } from "../services/SocialNotificationService";

export class UserController {
  // ==================== ENRICHED USER + FULL PAYLOAD ====================

  static async getFull(req: Request, res: Response) {
    try {
      const viewerId = req.user?.userId || null;
      const { id } = req.params;

      const enriched = await UserAggregateService.getEnrichedUser(viewerId, id);
      if (!enriched) return res.status(404).json({ success: false, message: "User not found" });

      // load top projects (latest 6)
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const projects = await projectRepo
        .createQueryBuilder("p")
        .where("p.author_id = :uid", { uid: id })
        .orderBy("p.created_at", "DESC")
        .limit(6)
        .getMany();

      // communities the user belongs to
      const communityRepo = dbConnection.getRepository(Community);
      const communities = await communityRepo
        .createQueryBuilder("c")
        .leftJoin("c.members", "m")
        .where("m.id = :uid", { uid: id })
        .select(["c.id", "c.name", "c.slug", "c.description", "c.cover_image_url", "c.category", "c.member_count", "c.community_type"])
        .limit(12)
        .getMany();

      return res.json({
        success: true,
        data: {
          user: enriched,
          recent_projects: projects,
          communities,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: "Failed to fetch user", error: err.message });
    }
  }

  // ==================== ME ====================
  static async getMe(req: Request, res: Response) {
    try {
      const viewerId = req.user.userId;
      const enriched = await UserAggregateService.getEnrichedUser(viewerId, viewerId);
      if (!enriched) return res.status(404).json({ success: false, message: "User not found" });

      return res.json({ success: true, data: enriched });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== USER PROJECTS (paginated) ====================
  static async getProjects(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "12", 10), 1), 50);
      const skip = (page - 1) * limit;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const [data, total] = await projectRepo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.tags", "tags")
        .where("p.author_id = :uid", { uid: id })
        .orderBy("p.created_at", "DESC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return res.json({ success: true, data, total, page, limit });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== FOLLOWERS LIST ====================
  static async getFollowers(req: Request, res: Response) {
    try {
      const viewerId = req.user?.userId || null;
      const { id } = req.params;
      const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10), 1), 100);
      const skip = (page - 1) * limit;

      const followRepo = dbConnection.getRepository(UserFollow);
      const [rows, total] = await followRepo
        .createQueryBuilder("f")
        .leftJoinAndSelect("f.follower", "follower")
        .where("f.following_id = :uid", { uid: id })
        .orderBy("f.created_at", "DESC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const users = rows.map((r) => r.follower).filter(Boolean);
      const enriched = await UserAggregateService.enrichUserList(viewerId, users);

      return res.json({ success: true, data: enriched, total, page, limit });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== FOLLOWING LIST ====================
  static async getFollowing(req: Request, res: Response) {
    try {
      const viewerId = req.user?.userId || null;
      const { id } = req.params;
      const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10), 1), 100);
      const skip = (page - 1) * limit;

      const followRepo = dbConnection.getRepository(UserFollow);
      const [rows, total] = await followRepo
        .createQueryBuilder("f")
        .leftJoinAndSelect("f.following", "following")
        .where("f.follower_id = :uid", { uid: id })
        .orderBy("f.created_at", "DESC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const users = rows.map((r) => r.following).filter(Boolean);
      const enriched = await UserAggregateService.enrichUserList(viewerId, users);

      return res.json({ success: true, data: enriched, total, page, limit });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== USER COMMUNITIES ====================
  static async getCommunities(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const communityRepo = dbConnection.getRepository(Community);
      const data = await communityRepo
        .createQueryBuilder("c")
        .leftJoin("c.members", "m")
        .where("m.id = :uid", { uid: id })
        .select([
          "c.id",
          "c.name",
          "c.slug",
          "c.description",
          "c.cover_image_url",
          "c.category",
          "c.member_count",
          "c.community_type",
        ])
        .orderBy("c.created_at", "DESC")
        .getMany();

      return res.json({ success: true, data, total: data.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== FOLLOW ACTION ====================
  static async follow(req: Request, res: Response) {
    try {
      const viewerId = req.user.userId;
      const { id: targetId } = req.params;

      if (viewerId === targetId) {
        return res.status(400).json({ success: false, message: "You cannot follow yourself" });
      }

      const userRepo = dbConnection.getRepository(User);
      const target = await userRepo.findOne({ where: { id: targetId } });
      if (!target) return res.status(404).json({ success: false, message: "User not found" });

      const followRepo = dbConnection.getRepository(UserFollow);
      const existing = await followRepo.findOne({
        where: { follower_id: viewerId, following_id: targetId },
      });

      if (!existing) {
        const newFollow = followRepo.create({
          follower_id: viewerId,
          following_id: targetId,
        });
        await followRepo.save(newFollow);

        // fire-and-forget notification
        SocialNotificationService.notifyFollow(viewerId, targetId).catch(() => {});
      }

      const enriched = await UserAggregateService.getEnrichedUser(viewerId, targetId);
      return res.json({ success: true, data: enriched, message: "Followed successfully" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== UNFOLLOW ACTION ====================
  static async unfollow(req: Request, res: Response) {
    try {
      const viewerId = req.user.userId;
      const { id: targetId } = req.params;

      if (viewerId === targetId) {
        return res.status(400).json({ success: false, message: "Cannot unfollow yourself" });
      }

      const followRepo = dbConnection.getRepository(UserFollow);
      const existing = await followRepo.findOne({
        where: { follower_id: viewerId, following_id: targetId },
      });
      if (existing) {
        await followRepo.remove(existing);
        SocialNotificationService.notifyUnfollow(viewerId, targetId).catch(() => {});
      }

      const enriched = await UserAggregateService.getEnrichedUser(viewerId, targetId);
      return res.json({ success: true, data: enriched, message: "Unfollowed successfully" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== SUGGESTIONS: USERS TO FOLLOW ====================
  // Recommendations are computed for the VIEWER (the requesting user when
  // authenticated) so the panel on /userFullInfo/:id shows "people *you* may
  // want to follow", not "people that user may want to follow".
  static async suggestUsersToFollow(req: Request, res: Response) {
    try {
      const viewerId = req.user?.userId || null;
      const { id: profileId } = req.params;
      const basisUserId = viewerId || profileId;
      const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "8", 10), 1), 20);

      const followRepo = dbConnection.getRepository(UserFollow);
      const userRepo = dbConnection.getRepository(User);

      // ids the basis user already follows -> excluded
      const alreadyFollowing = await followRepo
        .createQueryBuilder("f")
        .select("f.following_id", "following_id")
        .where("f.follower_id = :uid", { uid: basisUserId })
        .getRawMany();
      const excludedIds = new Set<string>(alreadyFollowing.map((r) => r.following_id));
      excludedIds.add(basisUserId);          // don't suggest self
      if (viewerId) excludedIds.add(viewerId); // never suggest viewer
      excludedIds.add(profileId);            // never suggest the profile being viewed

      const qb = userRepo
        .createQueryBuilder("u")
        .leftJoin(UserFollow, "uf", "uf.following_id = u.id")
        .where("u.is_active = true")
        .groupBy("u.id")
        .orderBy("COUNT(uf.id)", "DESC")
        .limit(limit);

      if (excludedIds.size > 0) {
        qb.andWhere("u.id NOT IN (:...excluded)", { excluded: Array.from(excludedIds) });
      }

      const popular = await qb.getMany();
      const enriched = await UserAggregateService.enrichUserList(viewerId, popular);
      return res.json({ success: true, data: enriched });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== SUGGESTIONS: COMMUNITIES TO JOIN ====================
  // Same rule - compute for the viewer when authenticated, otherwise fall back
  // to the URL user.
  static async suggestCommunitiesToJoin(req: Request, res: Response) {
    try {
      const viewerId = req.user?.userId || null;
      const { id: profileId } = req.params;
      const basisUserId = viewerId || profileId;
      const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "8", 10), 1), 20);

      const communityRepo = dbConnection.getRepository(Community);

      const inCommunityIds = await communityRepo
        .createQueryBuilder("c")
        .leftJoin("c.members", "m")
        .where("m.id = :uid", { uid: basisUserId })
        .select("c.id", "id")
        .getRawMany();
      const excluded = inCommunityIds.map((r) => r.id);

      const qb = communityRepo
        .createQueryBuilder("c")
        .where("c.is_active = true")
        .orderBy("c.member_count", "DESC")
        .limit(limit);

      if (excluded.length > 0) qb.andWhere("c.id NOT IN (:...excluded)", { excluded });

      const data = await qb.getMany();
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== BATCH ENRICH (for member lists, search results, etc.) ====================
  // Accepts { ids: string[] } and returns enriched users in the same order,
  // including viewer-relative is_followed_by_me + live counts.
  static async batchEnrich(req: Request, res: Response) {
    try {
      const viewerId = req.user?.userId || null;
      const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
      if (ids.length === 0) return res.json({ success: true, data: [] });
      if (ids.length > 200) {
        return res
          .status(400)
          .json({ success: false, message: "Maximum 200 ids per batch" });
      }

      const userRepo = dbConnection.getRepository(User);
      const users = await userRepo
        .createQueryBuilder("u")
        .where("u.id IN (:...ids)", { ids })
        .getMany();

      const enriched = await UserAggregateService.enrichUserList(viewerId, users);

      // preserve incoming order
      const byId = new Map(enriched.map((u) => [u.id, u]));
      const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

      return res.json({ success: true, data: ordered });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // ==================== NOTIFICATIONS FOR ME ====================
  static async myNotifications(req: Request, res: Response) {
    try {
      const viewerId = req.user.userId;
      const page = Math.max(parseInt((req.query.page as string) || "1", 10), 1);
      const limit = Math.min(Math.max(parseInt((req.query.limit as string) || "20", 10), 1), 100);
      const skip = (page - 1) * limit;
      const onlyUnread = req.query.unread === "true";

      const repo = dbConnection.getRepository(Notification);
      const qb = repo
        .createQueryBuilder("n")
        .leftJoinAndSelect("n.actor", "actor")
        .where("n.recipient_user_id = :uid", { uid: viewerId });

      if (onlyUnread) qb.andWhere("n.is_read = false");

      const [rows, total] = await qb
        .orderBy("n.created_at", "DESC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const unreadCount = await repo.count({
        where: { recipient_user_id: viewerId, is_read: false },
      });

      return res.json({ success: true, data: rows, total, page, limit, unread_count: unreadCount });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async markNotificationRead(req: Request, res: Response) {
    try {
      const viewerId = req.user.userId;
      const { id } = req.params;
      const repo = dbConnection.getRepository(Notification);
      const n = await repo.findOne({ where: { id, recipient_user_id: viewerId } });
      if (!n) return res.status(404).json({ success: false, message: "Notification not found" });
      n.is_read = true;
      n.read_at = new Date();
      await repo.save(n);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async markAllNotificationsRead(req: Request, res: Response) {
    try {
      const viewerId = req.user.userId;
      const repo = dbConnection.getRepository(Notification);
      await repo
        .createQueryBuilder()
        .update(Notification)
        .set({ is_read: true, read_at: new Date() })
        .where("recipient_user_id = :uid AND is_read = false", { uid: viewerId })
        .execute();
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
