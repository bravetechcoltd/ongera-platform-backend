// @ts-nocheck
import dbConnection from "../database/db";
import { User } from "../database/models/User";
import { UserFollow } from "../database/models/UserFollow";
import { ResearchProject, ProjectStatus, Visibility } from "../database/models/ResearchProject";
import { Community } from "../database/models/Community";

/**
 * Canonical enriched user shape returned by every user-facing endpoint.
 * Counts are always computed live - never stored as columns.
 */
export interface EnrichedUser {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  account_type: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  profile_picture_url: string | null;
  date_joined: Date;
  last_login: Date | null;
  is_verified: boolean;
  is_active: boolean;

  // Computed counts (always accurate)
  projects_count: number;
  followers_count: number;
  following_count: number;
  communities_count: number;

  // Viewer-relative flags
  is_followed_by_me: boolean;
  is_me: boolean;

  // Optional eager-loaded profile
  profile?: any;
}

export class UserAggregateService {
  /**
   * Returns a single enriched user. The viewerId is the requesting user (may be null for anonymous).
   * All counts are computed live, never read from a stored column.
   */
  static async getEnrichedUser(
    viewerId: string | null,
    targetUserId: string
  ): Promise<EnrichedUser | null> {
    const userRepo = dbConnection.getRepository(User);
    const followRepo = dbConnection.getRepository(UserFollow);
    const projectRepo = dbConnection.getRepository(ResearchProject);

    const user = await userRepo.findOne({
      where: { id: targetUserId },
      relations: ["profile"],
    });

    if (!user) return null;

    const [projectsCount, followersCount, followingCount, isFollowingRow, communitiesCount] =
      await Promise.all([
        projectRepo
          .createQueryBuilder("p")
          .where("p.author_id = :uid", { uid: targetUserId })
          .getCount(),
        followRepo.count({ where: { following_id: targetUserId } }),
        followRepo.count({ where: { follower_id: targetUserId } }),
        viewerId && viewerId !== targetUserId
          ? followRepo.findOne({
              where: { follower_id: viewerId, following_id: targetUserId },
            })
          : Promise.resolve(null),
        this.countCommunitiesForUser(targetUserId),
      ]);

    const fullName =
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || user.email;

    return {
      id: user.id,
      email: user.email,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      full_name: fullName,
      account_type: user.account_type,
      bio: user.bio || null,
      city: user.city || null,
      country: user.country || null,
      profile_picture_url: user.profile_picture_url || null,
      date_joined: user.date_joined,
      last_login: user.last_login || null,
      is_verified: user.is_verified,
      is_active: user.is_active,
      projects_count: projectsCount,
      followers_count: followersCount,
      following_count: followingCount,
      communities_count: communitiesCount,
      is_followed_by_me: !!isFollowingRow,
      is_me: viewerId === targetUserId,
      profile: (user as any).profile || null,
    };
  }

  /**
   * Enrich a list of users with viewer-relative state in a single batched
   * round-trip - used by /followers, /following, /community members.
   */
  static async enrichUserList(
    viewerId: string | null,
    users: User[]
  ): Promise<EnrichedUser[]> {
    if (!users || users.length === 0) return [];
    const userIds = users.map((u) => u.id);

    const followRepo = dbConnection.getRepository(UserFollow);
    const projectRepo = dbConnection.getRepository(ResearchProject);

    // batch counts
    const projectCountRows = await projectRepo
      .createQueryBuilder("p")
      .select("p.author_id", "user_id")
      .addSelect("COUNT(p.id)", "cnt")
      .where("p.author_id IN (:...ids)", { ids: userIds })
      .groupBy("p.author_id")
      .getRawMany();

    const followerCountRows = await followRepo
      .createQueryBuilder("f")
      .select("f.following_id", "user_id")
      .addSelect("COUNT(f.id)", "cnt")
      .where("f.following_id IN (:...ids)", { ids: userIds })
      .groupBy("f.following_id")
      .getRawMany();

    const followingCountRows = await followRepo
      .createQueryBuilder("f")
      .select("f.follower_id", "user_id")
      .addSelect("COUNT(f.id)", "cnt")
      .where("f.follower_id IN (:...ids)", { ids: userIds })
      .groupBy("f.follower_id")
      .getRawMany();

    // is_followed_by_me batch
    const viewerFollowsSet = new Set<string>();
    if (viewerId) {
      const viewerFollows = await followRepo
        .createQueryBuilder("f")
        .select("f.following_id", "following_id")
        .where("f.follower_id = :viewer", { viewer: viewerId })
        .andWhere("f.following_id IN (:...ids)", { ids: userIds })
        .getRawMany();
      viewerFollows.forEach((r) => viewerFollowsSet.add(r.following_id));
    }

    const projectMap = new Map(projectCountRows.map((r) => [r.user_id, parseInt(r.cnt, 10)]));
    const followerMap = new Map(followerCountRows.map((r) => [r.user_id, parseInt(r.cnt, 10)]));
    const followingMap = new Map(followingCountRows.map((r) => [r.user_id, parseInt(r.cnt, 10)]));

    return users.map((u) => {
      const fullName =
        `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username || u.email;
      return {
        id: u.id,
        email: u.email,
        username: u.username || null,
        first_name: u.first_name || null,
        last_name: u.last_name || null,
        full_name: fullName,
        account_type: u.account_type,
        bio: u.bio || null,
        city: u.city || null,
        country: u.country || null,
        profile_picture_url: u.profile_picture_url || null,
        date_joined: u.date_joined,
        last_login: u.last_login || null,
        is_verified: u.is_verified,
        is_active: u.is_active,
        projects_count: projectMap.get(u.id) || 0,
        followers_count: followerMap.get(u.id) || 0,
        following_count: followingMap.get(u.id) || 0,
        communities_count: 0,
        is_followed_by_me: viewerFollowsSet.has(u.id),
        is_me: viewerId === u.id,
        profile: (u as any).profile || null,
      };
    });
  }

  static async countCommunitiesForUser(userId: string): Promise<number> {
    const repo = dbConnection.getRepository(Community);
    return repo
      .createQueryBuilder("c")
      .leftJoin("c.members", "m")
      .where("m.id = :uid", { uid: userId })
      .getCount();
  }
}
