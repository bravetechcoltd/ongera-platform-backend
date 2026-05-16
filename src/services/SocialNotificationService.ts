// @ts-nocheck
import dbConnection from "../database/db";
import {
  Notification,
  NotificationType,
  NotificationEntityType,
  RecipientRole,
} from "../database/models/Notification";
import { User } from "../database/models/User";
import { UserFollow } from "../database/models/UserFollow";
import { ResearchProject } from "../database/models/ResearchProject";
import { sendEmail } from "../helpers/utils";
import { getSocketIO } from "../socket/socketRegistry";

/**
 * Social-graph side-effects: in-app notification row + email + socket push.
 * Never blocks the HTTP response - callers should NOT await unless they need to.
 */
export class SocialNotificationService {
  private static frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "https://bwenge.com";

  /**
   * Fired when actor starts following target.
   * - creates a FOLLOW_RECEIVED notification for target
   * - emails target
   * - emits socket event to target's personal room
   */
  static async notifyFollow(actorId: string, targetId: string) {
    try {
      const userRepo = dbConnection.getRepository(User);
      const [actor, target] = await Promise.all([
        userRepo.findOne({ where: { id: actorId } }),
        userRepo.findOne({ where: { id: targetId } }),
      ]);
      if (!actor || !target) return;

      const actorName = this.displayName(actor);
      const title = `${actorName} started following you`;
      const body = `${actorName} just started following you. Explore their profile to see their research projects and communities.`;

      await this.createAndEmit(target.id, actor.id, NotificationType.FOLLOW_RECEIVED, NotificationEntityType.USER, actor.id, title, body);

      // email
      if (target.email) {
        sendEmail({
          to: target.email,
          subject: `${actorName} started following you on BWENGE`,
          html: this.followEmailTemplate(target, actor),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("notifyFollow failed", err);
    }
  }

  /**
   * Fired when actor unfollows target.
   */
  static async notifyUnfollow(actorId: string, targetId: string) {
    try {
      const userRepo = dbConnection.getRepository(User);
      const [actor, target] = await Promise.all([
        userRepo.findOne({ where: { id: actorId } }),
        userRepo.findOne({ where: { id: targetId } }),
      ]);
      if (!actor || !target) return;

      const actorName = this.displayName(actor);
      const title = `${actorName} unfollowed you`;
      const body = `${actorName} stopped following you.`;

      await this.createAndEmit(target.id, actor.id, NotificationType.UNFOLLOW_RECEIVED, NotificationEntityType.USER, actor.id, title, body);

      if (target.email) {
        sendEmail({
          to: target.email,
          subject: `${actorName} unfollowed you on BWENGE`,
          html: this.unfollowEmailTemplate(target, actor),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("notifyUnfollow failed", err);
    }
  }

  /**
   * Fired when a user publishes a new research project. Fans out to ALL their followers.
   */
  static async notifyFollowersOfNewProject(authorId: string, projectId: string) {
    try {
      const userRepo = dbConnection.getRepository(User);
      const followRepo = dbConnection.getRepository(UserFollow);
      const projectRepo = dbConnection.getRepository(ResearchProject);

      const [author, project] = await Promise.all([
        userRepo.findOne({ where: { id: authorId } }),
        projectRepo.findOne({ where: { id: projectId } }),
      ]);
      if (!author || !project) return;

      // batch fetch followers
      const followRows = await followRepo
        .createQueryBuilder("f")
        .leftJoinAndSelect("f.follower", "follower")
        .where("f.following_id = :uid", { uid: authorId })
        .getMany();

      if (followRows.length === 0) return;

      const authorName = this.displayName(author);
      const title = `${authorName} you follow just posted a new research project`;
      const body = `${authorName} just posted "${project.title}". Explore and join — as a follower you may be interested.`;

      // create rows in batch
      for (const fr of followRows) {
        const recipient = fr.follower;
        if (!recipient) continue;
        await this.createAndEmit(
          recipient.id,
          author.id,
          NotificationType.FOLLOWED_USER_NEW_PROJECT,
          NotificationEntityType.RESEARCH_PROJECT,
          project.id,
          title,
          body
        );

        if (recipient.email) {
          sendEmail({
            to: recipient.email,
            subject: `${authorName} you follow just posted a new project`,
            html: this.newProjectEmailTemplate(recipient, author, project),
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("notifyFollowersOfNewProject failed", err);
    }
  }

  private static displayName(user: User): string {
    return (
      `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || user.email
    );
  }

  /**
   * Persist a notification row and push it over socket to the recipient's personal room.
   */
  private static async createAndEmit(
    recipientId: string,
    actorId: string,
    type: NotificationType,
    entityType: NotificationEntityType,
    entityId: string,
    title: string,
    body: string
  ) {
    const repo = dbConnection.getRepository(Notification);
    const n = repo.create({
      recipient_user_id: recipientId,
      recipient_role: RecipientRole.LEARNER,
      actor_user_id: actorId,
      notification_type: type,
      title,
      body,
      entity_type: entityType,
      entity_id: entityId,
      is_read: false,
    });
    const saved = await repo.save(n);

    try {
      const io = getSocketIO();
      if (io) {
        io.to(`user_${recipientId}`).emit("notification:new", {
          id: saved.id,
          type: saved.notification_type,
          title: saved.title,
          body: saved.body,
          entity_type: saved.entity_type,
          entity_id: saved.entity_id,
          actor_user_id: saved.actor_user_id,
          created_at: saved.created_at,
          is_read: false,
        });
      }
    } catch (err) {
      // socket optional - log silently
    }
  }

  // ==================== EMAIL TEMPLATES ====================

  private static followEmailTemplate(recipient: User, actor: User): string {
    const actorName = this.displayName(actor);
    const recipientName = this.displayName(recipient);
    const profileUrl = `${this.frontendUrl}/dashboard/user/userFullInfo/${actor.id}`;
    return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#0158B7;padding:24px;text-align:center;">
      <div style="color:white;font-size:24px;font-weight:700;letter-spacing:1px;">BWENGE</div>
    </div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 8px 0;color:#1a1a1a;font-size:20px;">Hi ${recipientName},</h2>
      <p style="color:#4a4a4a;font-size:15px;line-height:1.6;">
        <strong>${actorName}</strong> just started following you on BWENGE.
      </p>
      <div style="background:#E3F2FD;border-left:4px solid #0158B7;padding:18px;border-radius:8px;margin:20px 0;">
        <div style="color:#0158B7;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">NEW FOLLOWER</div>
        <div style="color:#1a1a1a;font-size:16px;font-weight:600;">${actorName}</div>
        ${actor.bio ? `<div style="color:#6c757d;font-size:13px;margin-top:6px;">${actor.bio.substring(0, 140)}</div>` : ""}
      </div>
      <p style="color:#4a4a4a;font-size:14px;line-height:1.6;">
        Visit their profile to see their research projects, follow them back, or explore the communities they belong to.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${profileUrl}" style="display:inline-block;background:#0158B7;color:white;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;">
          View ${actorName}'s Profile
        </a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px;text-align:center;color:#94a3b8;font-size:12px;">
      © ${new Date().getFullYear()} BWENGE Research Platform.
    </div>
  </div>
</body></html>`;
  }

  private static unfollowEmailTemplate(recipient: User, actor: User): string {
    const actorName = this.displayName(actor);
    const recipientName = this.displayName(recipient);
    return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#0158B7;padding:24px;text-align:center;">
      <div style="color:white;font-size:24px;font-weight:700;letter-spacing:1px;">BWENGE</div>
    </div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 8px 0;color:#1a1a1a;font-size:20px;">Hi ${recipientName},</h2>
      <p style="color:#4a4a4a;font-size:15px;line-height:1.6;">
        <strong>${actorName}</strong> has unfollowed you on BWENGE.
      </p>
      <p style="color:#6c757d;font-size:13px;line-height:1.6;">
        You can manage your followers and discover new researchers from your dashboard.
      </p>
    </div>
    <div style="background:#f8f9fa;padding:20px;text-align:center;color:#94a3b8;font-size:12px;">
      © ${new Date().getFullYear()} BWENGE Research Platform.
    </div>
  </div>
</body></html>`;
  }

  private static newProjectEmailTemplate(
    recipient: User,
    author: User,
    project: ResearchProject
  ): string {
    const authorName = this.displayName(author);
    const recipientName = this.displayName(recipient);
    const projectUrl = `${this.frontendUrl}/dashboard/user/research/${project.id}`;
    return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#0158B7;padding:24px;text-align:center;">
      <div style="color:white;font-size:24px;font-weight:700;letter-spacing:1px;">BWENGE</div>
    </div>
    <div style="padding:30px;">
      <h2 style="margin:0 0 8px 0;color:#1a1a1a;font-size:20px;">Hi ${recipientName},</h2>
      <p style="color:#4a4a4a;font-size:15px;line-height:1.6;">
        <strong>${authorName}</strong> — someone you follow — just published a new research project on BWENGE.
      </p>
      <div style="background:#E3F2FD;border-left:4px solid #0158B7;padding:18px;border-radius:8px;margin:20px 0;">
        <div style="color:#0158B7;font-weight:600;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">NEW RESEARCH PROJECT</div>
        <div style="color:#1a1a1a;font-size:16px;font-weight:600;">${project.title}</div>
        ${project.abstract ? `<div style="color:#4a4a4a;font-size:13px;margin-top:8px;line-height:1.5;">${project.abstract.substring(0, 200)}${project.abstract.length > 200 ? "..." : ""}</div>` : ""}
      </div>
      <p style="color:#4a4a4a;font-size:14px;line-height:1.6;">
        Explore the project, leave a comment, or ask to collaborate.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${projectUrl}" style="display:inline-block;background:#0158B7;color:white;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:14px;">
          Explore Project
        </a>
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px;text-align:center;color:#94a3b8;font-size:12px;">
      © ${new Date().getFullYear()} BWENGE Research Platform.
    </div>
  </div>
</body></html>`;
  }
}
