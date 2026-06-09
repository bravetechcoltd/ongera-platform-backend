// @ts-nocheck
import dbConnection from "../database/db";
import { Notification, NotificationType, NotificationEntityType, RecipientRole } from "../database/models/Notification";
import { getSocketIO } from "../socket/socketRegistry";

/**
 * Persist an in-app notification row and push it to the recipient's personal
 * socket room. Reuses the platform-wide notification system (same bell/center
 * the rest of the app uses). Fire-and-forget — never blocks the HTTP response.
 */
export async function notifyUser(opts: {
  recipientId: string;
  role: RecipientRole;
  type: NotificationType;
  title: string;
  body: string;
  entityId?: string | null;
  entityType?: NotificationEntityType;
  actorId?: string | null;
  institutionId?: string | null;
}): Promise<void> {
  try {
    const repo = dbConnection.getRepository(Notification);
    const saved = await repo.save(
      repo.create({
        recipient_user_id: opts.recipientId,
        recipient_role: opts.role,
        notification_type: opts.type,
        title: opts.title,
        body: opts.body,
        entity_type: opts.entityType || NotificationEntityType.ASSESSMENT,
        entity_id: opts.entityId || null,
        actor_user_id: opts.actorId || null,
        institution_id: opts.institutionId || null,
        is_read: false,
      })
    );

    const io = getSocketIO();
    if (io) {
      io.to(`user_${opts.recipientId}`).emit("notification:new", {
        id: saved.id,
        notification_type: saved.notification_type,
        title: saved.title,
        body: saved.body,
        entity_type: saved.entity_type,
        entity_id: saved.entity_id,
        actor_user_id: saved.actor_user_id,
        created_at: saved.created_at,
        is_read: false,
      });
    }
  } catch (_) {
    // Notifications are best-effort; never surface failures to the caller.
  }
}
