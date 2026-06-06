// @ts-nocheck
import { Request, Response } from "express";
import { In } from "typeorm";
import dbConnection from "../database/db";
import { User, AccountType } from "../database/models/User";
import { ExcellenceMember, ExcellenceMemberStatus } from "../database/models/ExcellenceMember";
import { TalentAssessment, AssessmentStatus } from "../database/models/TalentAssessment";
import { AssessmentParticipant, ParticipantStatus } from "../database/models/AssessmentParticipant";
import { AssessmentSubmissionFile } from "../database/models/AssessmentSubmissionFile";
import { UploadToCloud } from "../helpers/cloud";
import {
  sendAssessmentInvitation,
  sendAssessmentGraded,
  sendAssessmentOffer,
  sendAssessmentSubmitted,
  sendAssessmentSubmissionNotice,
} from "../services/emailTemplates";

// ---------- helpers ----------
async function loadUser(req: Request): Promise<User | null> {
  const id = req.user?.userId || req.user?.id;
  if (!id) return null;
  return dbConnection.getRepository(User).findOne({ where: { id }, relations: ["profile"] });
}

async function institutionName(userId: string): Promise<string> {
  const u = await dbConnection.getRepository(User).findOne({ where: { id: userId }, relations: ["profile"] });
  if (!u) return "Company";
  return (u.profile as any)?.institution_name || `${u.first_name} ${u.last_name}`;
}

const fullName = (u: any) => (u ? `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email : "");

function shapeAssessment(a: TalentAssessment, extra: any = {}) {
  return {
    id: a.id,
    institution_id: a.institution_id,
    title: a.title,
    brief: a.brief,
    instructions: a.instructions,
    required_skills: a.required_skills || [],
    duration_minutes: a.duration_minutes,
    opens_at: a.opens_at,
    closes_at: a.closes_at,
    max_score: a.max_score,
    allow_files: a.allow_files,
    status: a.status,
    invited_count: a.invited_count,
    submitted_count: a.submitted_count,
    created_at: a.created_at,
    updated_at: a.updated_at,
    ...extra,
  };
}

function shapeParticipant(p: AssessmentParticipant, files: any[] = []) {
  return {
    id: p.id,
    assessment_id: p.assessment_id,
    talent_user_id: p.talent_user_id,
    status: p.status,
    started_at: p.started_at,
    due_at: p.due_at,
    submitted_at: p.submitted_at,
    auto_submitted: p.auto_submitted,
    response_text: p.response_text,
    score: p.score,
    max_score: p.max_score,
    feedback: p.feedback,
    graded_at: p.graded_at,
    offer_message: p.offer_message,
    offered_at: p.offered_at,
    decision_at: p.decision_at,
    created_at: p.created_at,
    talent: p.talent
      ? {
          id: p.talent.id,
          first_name: p.talent.first_name,
          last_name: p.talent.last_name,
          email: p.talent.email,
          profile_picture_url: p.talent.profile_picture_url,
        }
      : null,
    files,
  };
}

export class AssessmentController {
  // ===================== INSTITUTION =====================

  /** POST /api/excellence/assessments */
  static async createAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const { title, brief, instructions, required_skills, duration_minutes, opens_at, closes_at, max_score, allow_files } = req.body || {};
      if (!title || !String(title).trim() || !brief || String(brief).trim().length < 10) {
        return res.status(400).json({ success: false, message: "Title and a brief (min 10 chars) are required." });
      }
      const repo = dbConnection.getRepository(TalentAssessment);
      const a = await repo.save(
        repo.create({
          institution_id: user.id,
          title: String(title).trim(),
          brief: String(brief).trim(),
          instructions: instructions ? String(instructions).trim() : null,
          required_skills: Array.isArray(required_skills) ? required_skills : null,
          duration_minutes: Number.isFinite(+duration_minutes) ? Math.max(0, parseInt(duration_minutes, 10)) : 60,
          opens_at: opens_at ? new Date(opens_at) : null,
          closes_at: closes_at ? new Date(closes_at) : null,
          max_score: Number.isFinite(+max_score) ? Math.max(1, parseInt(max_score, 10)) : 100,
          allow_files: allow_files === false ? false : true,
          status: AssessmentStatus.DRAFT,
        })
      );
      return res.status(201).json({ success: true, message: "Assessment created.", data: shapeAssessment(a) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to create assessment", error: error.message });
    }
  }

  /** GET /api/excellence/assessments */
  static async myAssessments(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const repo = dbConnection.getRepository(TalentAssessment);
      const rows = await repo.find({ where: { institution_id: user.id }, order: { created_at: "DESC" } });

      // Per-assessment status tallies in one pass.
      const ids = rows.map((r) => r.id);
      const parts = ids.length
        ? await dbConnection.getRepository(AssessmentParticipant).find({ where: { assessment_id: In(ids) } })
        : [];
      const tally: Record<string, any> = {};
      parts.forEach((p) => {
        const t = (tally[p.assessment_id] = tally[p.assessment_id] || { total: 0, submitted: 0, graded: 0, offered: 0 });
        t.total++;
        if ([ParticipantStatus.SUBMITTED, ParticipantStatus.GRADED, ParticipantStatus.OFFERED, ParticipantStatus.ACCEPTED, ParticipantStatus.DECLINED].includes(p.status)) t.submitted++;
        if ([ParticipantStatus.GRADED, ParticipantStatus.OFFERED, ParticipantStatus.ACCEPTED, ParticipantStatus.DECLINED].includes(p.status)) t.graded++;
        if ([ParticipantStatus.OFFERED, ParticipantStatus.ACCEPTED, ParticipantStatus.DECLINED].includes(p.status)) t.offered++;
      });

      const data = rows.map((a) => shapeAssessment(a, { stats: tally[a.id] || { total: 0, submitted: 0, graded: 0, offered: 0 } }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load assessments", error: error.message });
    }
  }

  /** GET /api/excellence/assessments/:id — detail + participants (owner). */
  static async getAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const a = await dbConnection.getRepository(TalentAssessment).findOne({ where: { id: req.params.id } });
      if (!a) return res.status(404).json({ success: false, message: "Assessment not found" });
      if (a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });

      const participants = await dbConnection
        .getRepository(AssessmentParticipant)
        .find({ where: { assessment_id: a.id }, relations: ["talent"], order: { created_at: "ASC" } });

      const pIds = participants.map((p) => p.id);
      const files = pIds.length
        ? await dbConnection.getRepository(AssessmentSubmissionFile).find({ where: { participant_id: In(pIds) } })
        : [];
      const fileMap: Record<string, any[]> = {};
      files.forEach((f) => {
        (fileMap[f.participant_id] = fileMap[f.participant_id] || []).push({ id: f.id, file_url: f.file_url, original_name: f.original_name });
      });

      return res.json({
        success: true,
        data: shapeAssessment(a, { participants: participants.map((p) => shapeParticipant(p, fileMap[p.id] || [])) }),
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load assessment", error: error.message });
    }
  }

  /** PATCH /api/excellence/assessments/:id — edit while DRAFT. */
  static async updateAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(TalentAssessment);
      const a = await repo.findOne({ where: { id: req.params.id } });
      if (!a) return res.status(404).json({ success: false, message: "Assessment not found" });
      if (a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      if (a.status !== AssessmentStatus.DRAFT) {
        return res.status(400).json({ success: false, message: "Only draft assessments can be edited." });
      }
      const { title, brief, instructions, required_skills, duration_minutes, opens_at, closes_at, max_score, allow_files } = req.body || {};
      if (title !== undefined) a.title = String(title).trim();
      if (brief !== undefined) a.brief = String(brief).trim();
      if (instructions !== undefined) a.instructions = instructions ? String(instructions).trim() : null;
      if (required_skills !== undefined) a.required_skills = Array.isArray(required_skills) ? required_skills : null;
      if (duration_minutes !== undefined) a.duration_minutes = Math.max(0, parseInt(duration_minutes, 10) || 0);
      if (opens_at !== undefined) a.opens_at = opens_at ? new Date(opens_at) : null;
      if (closes_at !== undefined) a.closes_at = closes_at ? new Date(closes_at) : null;
      if (max_score !== undefined) a.max_score = Math.max(1, parseInt(max_score, 10) || 100);
      if (allow_files !== undefined) a.allow_files = !!allow_files;
      await repo.save(a);
      return res.json({ success: true, message: "Assessment updated.", data: shapeAssessment(a) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to update assessment", error: error.message });
    }
  }

  /** POST /api/excellence/assessments/:id/invite — body { talent_user_ids: [] } */
  static async inviteTalent(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(TalentAssessment);
      const a = await repo.findOne({ where: { id: req.params.id } });
      if (!a) return res.status(404).json({ success: false, message: "Assessment not found" });
      if (a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });

      let ids: string[] = req.body?.talent_user_ids || [];
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: "Select at least one talent to invite." });
      }

      // Only active Excellence members can be invited.
      const members = await dbConnection
        .getRepository(ExcellenceMember)
        .find({ where: { user_id: In(ids), status: ExcellenceMemberStatus.ACTIVE }, relations: ["user"] });
      const validIds = new Set(members.map((m) => m.user_id));

      const partRepo = dbConnection.getRepository(AssessmentParticipant);
      const existing = await partRepo.find({ where: { assessment_id: a.id, talent_user_id: In([...validIds]) } });
      const existingIds = new Set(existing.map((e) => e.talent_user_id));

      const instName = await institutionName(user.id);
      let invited = 0;
      for (const m of members) {
        if (existingIds.has(m.user_id)) continue;
        await partRepo.save(
          partRepo.create({
            assessment_id: a.id,
            talent_user_id: m.user_id,
            status: ParticipantStatus.INVITED,
            max_score: a.max_score,
          })
        );
        invited++;
        if (m.user?.email) {
          sendAssessmentInvitation(m.user.email, m.user.first_name || "there", a.title, instName, a.duration_minutes, a.closes_at).catch(() => {});
        }
      }

      a.invited_count = (a.invited_count || 0) + invited;
      if (a.status === AssessmentStatus.DRAFT) a.status = AssessmentStatus.PUBLISHED;
      await repo.save(a);

      return res.json({ success: true, message: `Invited ${invited} talent.`, data: { invited } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to invite talent", error: error.message });
    }
  }

  /** POST /api/excellence/assessments/:id/publish */
  static async publishAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(TalentAssessment);
      const a = await repo.findOne({ where: { id: req.params.id } });
      if (!a) return res.status(404).json({ success: false, message: "Assessment not found" });
      if (a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      const count = await dbConnection.getRepository(AssessmentParticipant).count({ where: { assessment_id: a.id } });
      if (count === 0) return res.status(400).json({ success: false, message: "Invite at least one talent before publishing." });
      a.status = AssessmentStatus.PUBLISHED;
      await repo.save(a);
      return res.json({ success: true, message: "Assessment published.", data: shapeAssessment(a) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to publish", error: error.message });
    }
  }

  /** PATCH /api/excellence/assessments/:id/participants/:pid/grade — body { score, feedback } */
  static async gradeParticipant(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const { id, pid } = req.params;
      const a = await dbConnection.getRepository(TalentAssessment).findOne({ where: { id } });
      if (!a || a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });

      const repo = dbConnection.getRepository(AssessmentParticipant);
      const p = await repo.findOne({ where: { id: pid, assessment_id: id }, relations: ["talent"] });
      if (!p) return res.status(404).json({ success: false, message: "Participant not found" });
      if (![ParticipantStatus.SUBMITTED, ParticipantStatus.GRADED].includes(p.status)) {
        return res.status(400).json({ success: false, message: "Only submitted entries can be graded." });
      }
      const { score, feedback } = req.body || {};
      const s = parseInt(score, 10);
      if (!Number.isFinite(s) || s < 0 || s > a.max_score) {
        return res.status(400).json({ success: false, message: `Score must be between 0 and ${a.max_score}.` });
      }
      p.score = s;
      p.max_score = a.max_score;
      p.feedback = feedback ? String(feedback).trim() : null;
      p.graded_at = new Date();
      p.graded_by_id = user.id;
      p.status = ParticipantStatus.GRADED;
      await repo.save(p);

      if (p.talent?.email) {
        sendAssessmentGraded(p.talent.email, p.talent.first_name || "there", a.title, s, a.max_score, p.feedback).catch(() => {});
      }
      return res.json({ success: true, message: "Submission graded.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to grade", error: error.message });
    }
  }

  /** POST /api/excellence/assessments/:id/participants/:pid/offer — body { message } */
  static async offerParticipant(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const { id, pid } = req.params;
      const a = await dbConnection.getRepository(TalentAssessment).findOne({ where: { id } });
      if (!a || a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });

      const repo = dbConnection.getRepository(AssessmentParticipant);
      const p = await repo.findOne({ where: { id: pid, assessment_id: id }, relations: ["talent"] });
      if (!p) return res.status(404).json({ success: false, message: "Participant not found" });
      if (![ParticipantStatus.GRADED, ParticipantStatus.SUBMITTED, ParticipantStatus.OFFERED].includes(p.status)) {
        return res.status(400).json({ success: false, message: "You can only offer after a submission/grade." });
      }
      p.offer_message = req.body?.message ? String(req.body.message).trim() : null;
      p.offered_at = new Date();
      p.status = ParticipantStatus.OFFERED;
      await repo.save(p);

      if (p.talent?.email) {
        sendAssessmentOffer(p.talent.email, p.talent.first_name || "there", a.title, await institutionName(user.id), p.offer_message).catch(() => {});
      }
      return res.json({ success: true, message: "Offer sent.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to send offer", error: error.message });
    }
  }

  /** POST /api/excellence/assessments/:id/participants/:pid/reject */
  static async rejectParticipant(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const { id, pid } = req.params;
      const a = await dbConnection.getRepository(TalentAssessment).findOne({ where: { id } });
      if (!a || a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      const repo = dbConnection.getRepository(AssessmentParticipant);
      const p = await repo.findOne({ where: { id: pid, assessment_id: id } });
      if (!p) return res.status(404).json({ success: false, message: "Participant not found" });
      p.status = ParticipantStatus.REJECTED;
      p.decision_at = new Date();
      await repo.save(p);
      return res.json({ success: true, message: "Talent marked as not selected.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to update", error: error.message });
    }
  }

  /** POST /api/excellence/assessments/:id/close */
  static async closeAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(TalentAssessment);
      const a = await repo.findOne({ where: { id: req.params.id } });
      if (!a || a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      a.status = AssessmentStatus.CLOSED;
      await repo.save(a);
      return res.json({ success: true, message: "Assessment closed.", data: shapeAssessment(a) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to close", error: error.message });
    }
  }

  /** DELETE /api/excellence/assessments/:id — drafts only. */
  static async deleteAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(TalentAssessment);
      const a = await repo.findOne({ where: { id: req.params.id } });
      if (!a || a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      if (a.status !== AssessmentStatus.DRAFT) {
        return res.status(400).json({ success: false, message: "Only draft assessments can be deleted." });
      }
      await repo.remove(a);
      return res.json({ success: true, message: "Assessment deleted." });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to delete", error: error.message });
    }
  }

  // ===================== TALENT (MEMBER) =====================

  /** GET /api/excellence/my-assessments */
  static async talentAssessments(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const parts = await dbConnection
        .getRepository(AssessmentParticipant)
        .find({ where: { talent_user_id: user.id }, relations: ["assessment"], order: { created_at: "DESC" } });

      const instIds = [...new Set(parts.map((p) => p.assessment?.institution_id).filter(Boolean))];
      const insts = instIds.length
        ? await dbConnection.getRepository(User).find({ where: { id: In(instIds) }, relations: ["profile"] })
        : [];
      const instMap = new Map(insts.map((i) => [i.id, (i.profile as any)?.institution_name || `${i.first_name} ${i.last_name}`]));

      const data = parts
        .filter((p) => p.assessment && p.assessment.status !== AssessmentStatus.DRAFT)
        .map((p) => ({
          id: p.id,
          status: p.status,
          started_at: p.started_at,
          due_at: p.due_at,
          submitted_at: p.submitted_at,
          score: p.score,
          max_score: p.max_score,
          assessment: {
            id: p.assessment.id,
            title: p.assessment.title,
            duration_minutes: p.assessment.duration_minutes,
            closes_at: p.assessment.closes_at,
            status: p.assessment.status,
            institution_name: instMap.get(p.assessment.institution_id) || null,
          },
        }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load assessments", error: error.message });
    }
  }

  /** GET /api/excellence/my-assessments/:pid */
  static async getTalentAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const p = await dbConnection
        .getRepository(AssessmentParticipant)
        .findOne({ where: { id: req.params.pid }, relations: ["assessment"] });
      if (!p || p.talent_user_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });

      const files = await dbConnection.getRepository(AssessmentSubmissionFile).find({ where: { participant_id: p.id } });
      const a = p.assessment;
      return res.json({
        success: true,
        data: {
          participant: shapeParticipant(p, files.map((f) => ({ id: f.id, file_url: f.file_url, original_name: f.original_name }))),
          assessment: {
            ...shapeAssessment(a),
            institution_name: await institutionName(a.institution_id),
          },
          now: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load assessment", error: error.message });
    }
  }

  /** POST /api/excellence/my-assessments/:pid/start */
  static async startAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(AssessmentParticipant);
      const p = await repo.findOne({ where: { id: req.params.pid }, relations: ["assessment"] });
      if (!p || p.talent_user_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      const a = p.assessment;

      if (a.status !== AssessmentStatus.PUBLISHED) {
        return res.status(400).json({ success: false, message: "This assessment is not open." });
      }
      const now = Date.now();
      if (a.opens_at && new Date(a.opens_at).getTime() > now) {
        return res.status(400).json({ success: false, message: "This assessment has not opened yet." });
      }
      if (a.closes_at && new Date(a.closes_at).getTime() <= now) {
        if (p.status === ParticipantStatus.INVITED) { p.status = ParticipantStatus.EXPIRED; await repo.save(p); }
        return res.status(400).json({ success: false, message: "The assessment window has closed." });
      }
      if (p.status === ParticipantStatus.IN_PROGRESS) {
        return res.json({ success: true, message: "Already started.", data: shapeParticipant(p) });
      }
      if (p.status !== ParticipantStatus.INVITED) {
        return res.status(400).json({ success: false, message: "You can no longer start this assessment." });
      }

      const startedAt = new Date(now);
      let due: Date | null = null;
      if (a.duration_minutes > 0) due = new Date(now + a.duration_minutes * 60000);
      if (a.closes_at) {
        const close = new Date(a.closes_at);
        if (!due || close.getTime() < due.getTime()) due = close;
      }
      p.started_at = startedAt;
      p.due_at = due;
      p.status = ParticipantStatus.IN_PROGRESS;
      await repo.save(p);
      return res.json({ success: true, message: "Assessment started.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to start", error: error.message });
    }
  }

  /** PATCH /api/excellence/my-assessments/:pid/save — body { response_text } */
  static async saveDraft(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(AssessmentParticipant);
      const p = await repo.findOne({ where: { id: req.params.pid } });
      if (!p || p.talent_user_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      if (p.status !== ParticipantStatus.IN_PROGRESS) {
        return res.status(400).json({ success: false, message: "Not in progress." });
      }
      p.response_text = req.body?.response_text != null ? String(req.body.response_text) : p.response_text;
      await repo.save(p);
      return res.json({ success: true, message: "Saved." });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to save", error: error.message });
    }
  }

  /** POST /api/excellence/my-assessments/:pid/submit — multipart: response_text?, submission_files[] */
  static async submitAssessment(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(AssessmentParticipant);
      const p = await repo.findOne({ where: { id: req.params.pid }, relations: ["assessment", "talent"] });
      if (!p || p.talent_user_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      if (p.status !== ParticipantStatus.IN_PROGRESS) {
        return res.status(400).json({ success: false, message: "This assessment is not in progress." });
      }
      const a = p.assessment;

      if (req.body?.response_text != null) p.response_text = String(req.body.response_text);
      p.status = ParticipantStatus.SUBMITTED;
      p.submitted_at = new Date();
      p.auto_submitted = false;
      await repo.save(p);

      const files = (req.files?.submission_files as any[]) || [];
      if (files.length && a.allow_files) {
        const fileRepo = dbConnection.getRepository(AssessmentSubmissionFile);
        for (const f of files) {
          try {
            const uploaded = await UploadToCloud(f);
            await fileRepo.save(
              fileRepo.create({
                participant_id: p.id,
                file_url: uploaded.secure_url,
                original_name: f.originalname,
                mime_type: f.mimetype,
                size: f.size,
                uploaded_by_id: user.id,
              })
            );
          } catch (_) {}
        }
      }

      await dbConnection
        .getRepository(TalentAssessment)
        .createQueryBuilder()
        .update(TalentAssessment)
        .set({ submitted_count: () => "submitted_count + 1" })
        .where("id = :id", { id: a.id })
        .execute();

      if (p.talent?.email) sendAssessmentSubmitted(p.talent.email, p.talent.first_name || "there", a.title, false).catch(() => {});
      const instUser = await dbConnection.getRepository(User).findOne({ where: { id: a.institution_id } });
      if (instUser?.email) sendAssessmentSubmissionNotice(instUser.email, fullName(p.talent), a.title, false).catch(() => {});

      return res.json({ success: true, message: "Submitted successfully.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to submit", error: error.message });
    }
  }

  /** POST /api/excellence/my-assessments/:pid/offer-response — body { decision: accept|decline } */
  static async respondOffer(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const repo = dbConnection.getRepository(AssessmentParticipant);
      const p = await repo.findOne({ where: { id: req.params.pid } });
      if (!p || p.talent_user_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });
      if (p.status !== ParticipantStatus.OFFERED) {
        return res.status(400).json({ success: false, message: "There is no pending offer." });
      }
      const decision = String(req.body?.decision || "").toLowerCase();
      if (!["accept", "decline"].includes(decision)) {
        return res.status(400).json({ success: false, message: "Decision must be accept or decline." });
      }
      p.status = decision === "accept" ? ParticipantStatus.ACCEPTED : ParticipantStatus.DECLINED;
      p.decision_at = new Date();
      await repo.save(p);
      return res.json({ success: true, message: decision === "accept" ? "Offer accepted." : "Offer declined.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to respond", error: error.message });
    }
  }
}
