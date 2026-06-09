// @ts-nocheck
import { getSocketIO } from "../socket/socketRegistry";

/**
 * Granular real-time events for the Excellence dashboard.
 *
 * Unlike notifications (which target a single recipient + persist a row), these
 * are ephemeral domain events broadcast to dedicated Excellence rooms so any
 * open page updates instantly — even for changes that never raise a
 * notification (e.g. a draft being edited, published, or closed).
 *
 * Rooms:
 *   excellence:inst:<institutionId>   — the institution's private feed (owner only)
 *   excellence:assessment:<id>        — anyone viewing a specific assessment
 *   user_<userId>                     — a talent's personal room (already joined on connect)
 */
export const instRoom = (institutionId: string) => `excellence:inst:${institutionId}`;
export const assessmentRoom = (assessmentId: string) => `excellence:assessment:${assessmentId}`;
export const userRoom = (userId: string) => `user_${userId}`;

/** Emit an event to one or more rooms (union — socket.io dedupes sockets). */
function emit(event: string, payload: any, rooms: (string | null | undefined)[]) {
  try {
    const io = getSocketIO();
    if (!io) return;
    const targets = rooms.filter(Boolean) as string[];
    if (!targets.length) return;
    let chain: any = io;
    for (const r of targets) chain = chain.to(r);
    chain.emit(event, payload);
  } catch (_) {
    // Real-time is best-effort; never block the request.
  }
}

/** Assessment-level change (created / updated / published / closed / deleted). */
export function emitAssessmentChanged(opts: {
  assessmentId: string;
  institutionId: string;
  action: "created" | "updated" | "published" | "closed" | "deleted";
}) {
  emit(
    "excellence:assessment:changed",
    { id: opts.assessmentId, action: opts.action, at: Date.now() },
    [instRoom(opts.institutionId), assessmentRoom(opts.assessmentId)]
  );
}

/** Participant-level change inside an assessment. */
export function emitParticipantChanged(opts: {
  assessmentId: string;
  institutionId: string;
  participantId: string;
  talentUserId?: string | null;
  action: "invited" | "submitted" | "graded" | "offered" | "rejected" | "responded";
  status?: string;
}) {
  emit(
    "excellence:participant:changed",
    {
      assessment_id: opts.assessmentId,
      participant_id: opts.participantId,
      action: opts.action,
      status: opts.status || null,
      at: Date.now(),
    },
    [
      instRoom(opts.institutionId),
      assessmentRoom(opts.assessmentId),
      opts.talentUserId ? userRoom(opts.talentUserId) : null,
    ]
  );
}

/** Bounty submission lifecycle change. */
export function emitBountyChanged(opts: {
  bountyId: string;
  institutionId: string;
  submitterUserId?: string | null;
  submissionId?: string | null;
  action: "submission" | "shortlisted" | "winner";
}) {
  emit(
    "excellence:bounty:changed",
    {
      bounty_id: opts.bountyId,
      submission_id: opts.submissionId || null,
      action: opts.action,
      at: Date.now(),
    },
    [instRoom(opts.institutionId), opts.submitterUserId ? userRoom(opts.submitterUserId) : null]
  );
}
