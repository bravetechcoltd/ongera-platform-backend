// @ts-nocheck
import type { Server, Socket } from "socket.io";
import dbConnection from "../database/db";
import { TalentAssessment } from "../database/models/TalentAssessment";
import { AssessmentParticipant } from "../database/models/AssessmentParticipant";

const ASSESSMENT_PREFIX = "excellence:assessment:";
const INST_PREFIX = "excellence:inst:";

/**
 * Can this user subscribe to a specific assessment's live room?
 * Allowed for the owning institution or any invited participant.
 */
async function canAccessAssessment(assessmentId: string, userId: string): Promise<boolean> {
  try {
    const a = await dbConnection
      .getRepository(TalentAssessment)
      .findOne({ where: { id: assessmentId }, select: ["id", "institution_id"] });
    if (!a) return false;
    if (a.institution_id === userId) return true;
    const count = await dbConnection
      .getRepository(AssessmentParticipant)
      .count({ where: { assessment_id: assessmentId, talent_user_id: userId } });
    return count > 0;
  } catch {
    return false;
  }
}

/**
 * Registers the Excellence room join/leave handlers for a connected socket.
 * Room access is validated server-side — a client can only join its own
 * institution feed or assessments it owns/participates in.
 */
export const setupExcellenceHandlers = (io: Server, socket: Socket) => {
  socket.on("excellence:join", async (data: { rooms: string[] }, callback) => {
    const userId = socket.data.user?.id;
    if (!userId) return callback?.({ success: false, error: "Not authenticated" });

    const requested = Array.isArray(data?.rooms) ? data.rooms : [];
    const joined: string[] = [];

    for (const room of requested) {
      if (typeof room !== "string") continue;

      // Institution feed: only your own.
      if (room === `${INST_PREFIX}${userId}`) {
        socket.join(room);
        joined.push(room);
        continue;
      }

      // Assessment room: owner or participant only.
      if (room.startsWith(ASSESSMENT_PREFIX)) {
        const aid = room.slice(ASSESSMENT_PREFIX.length);
        if (aid && (await canAccessAssessment(aid, userId))) {
          socket.join(room);
          joined.push(room);
        }
        continue;
      }
      // Any other room shape is silently ignored.
    }

    callback?.({ success: true, joined });
  });

  socket.on("excellence:leave", (data: { rooms: string[] }) => {
    const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
    for (const room of rooms) {
      if (typeof room === "string") socket.leave(room);
    }
  });
};
