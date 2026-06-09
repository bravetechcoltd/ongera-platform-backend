// @ts-nocheck
import { Request, Response } from "express";
import { In } from "typeorm";
import dbConnection from "../database/db";
import { User, AccountType } from "../database/models/User";
import { ExcellenceMember, ExcellenceMemberStatus } from "../database/models/ExcellenceMember";
import { TalentAssessment, AssessmentStatus } from "../database/models/TalentAssessment";
import { AssessmentParticipant, ParticipantStatus } from "../database/models/AssessmentParticipant";
import { AssessmentSubmissionFile } from "../database/models/AssessmentSubmissionFile";
import { AssessmentQuestion, QuestionType, isObjectiveType } from "../database/models/AssessmentQuestion";
import { AssessmentAnswer } from "../database/models/AssessmentAnswer";
import { upsertAnswers, autoGradeParticipant, recomputeAfterManualGrading } from "../services/assessmentGrading";
import { notifyUser } from "../services/excellenceNotify";
import { emitAssessmentChanged, emitParticipantChanged } from "../services/excellenceEvents";
import { NotificationType, NotificationEntityType, RecipientRole } from "../database/models/Notification";
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
    passing_score: a.passing_score ?? null,
    has_subjective: a.has_subjective,
    question_count: a.question_count,
    allow_files: a.allow_files,
    status: a.status,
    invited_count: a.invited_count,
    submitted_count: a.submitted_count,
    created_at: a.created_at,
    updated_at: a.updated_at,
    ...extra,
  };
}

/** Full question (institution view — includes the answer key). */
function shapeQuestionFull(q: AssessmentQuestion) {
  return {
    id: q.id,
    order_index: q.order_index,
    type: q.type,
    prompt: q.prompt,
    options: q.options || [],
    correct_answer: q.correct_answer ?? null,
    points: q.points,
    explanation: q.explanation ?? null,
    is_auto_gradable: q.is_auto_gradable,
  };
}

/** Talent view of a question. Hides the key unless `reveal` is true (post-grade review). */
function shapeQuestionForTalent(q: AssessmentQuestion, reveal: boolean) {
  return {
    id: q.id,
    order_index: q.order_index,
    type: q.type,
    prompt: q.prompt,
    options: q.options || [],
    points: q.points,
    is_auto_gradable: q.is_auto_gradable,
    correct_answer: reveal ? q.correct_answer ?? null : undefined,
    explanation: reveal ? q.explanation ?? null : undefined,
  };
}

function shapeAnswer(ans: AssessmentAnswer, reveal: boolean) {
  return {
    id: ans.id,
    question_id: ans.question_id,
    answer: ans.answer ?? "",
    is_correct: reveal ? ans.is_correct : null,
    points_earned: reveal ? ans.points_earned : null,
    is_graded: ans.is_graded,
    instructor_feedback: reveal ? ans.instructor_feedback ?? null : null,
  };
}

/**
 * Validate + normalise incoming questions for create/update. Returns the rows
 * to persist plus aggregate flags. Throws a string message on validation error.
 */
function buildQuestionRows(assessmentId: string, input: any[]): {
  rows: Partial<AssessmentQuestion>[];
  hasSubjective: boolean;
  totalPoints: number;
} {
  const rows: Partial<AssessmentQuestion>[] = [];
  let hasSubjective = false;
  let totalPoints = 0;

  input.forEach((q: any, idx: number) => {
    const type: QuestionType = q?.type;
    if (!Object.values(QuestionType).includes(type)) throw `Question ${idx + 1}: invalid type.`;
    const prompt = String(q?.prompt || "").trim();
    if (!prompt) throw `Question ${idx + 1}: prompt is required.`;
    const points = Math.max(1, parseInt(q?.points, 10) || 1);
    totalPoints += points;

    let options: string[] | null = null;
    let correct_answer: string | null = null;
    const objective = isObjectiveType(type);

    if (type === QuestionType.MULTIPLE_CHOICE || type === QuestionType.CHECKBOXES) {
      options = (Array.isArray(q?.options) ? q.options : []).map((o: any) => String(o).trim()).filter(Boolean);
      if (options.length < 2) throw `Question ${idx + 1}: provide at least 2 options.`;
      const raw = Array.isArray(q?.correct_answer) ? q.correct_answer : [q?.correct_answer];
      const correct = raw.map((c: any) => String(c ?? "").trim()).filter(Boolean);
      if (correct.length === 0) throw `Question ${idx + 1}: mark the correct answer.`;
      if (type === QuestionType.MULTIPLE_CHOICE && correct.length !== 1)
        throw `Question ${idx + 1}: exactly one correct option.`;
      if (!correct.every((c: string) => options!.includes(c)))
        throw `Question ${idx + 1}: correct answer must be one of the options.`;
      correct_answer = correct.join(",");
    } else if (type === QuestionType.TRUE_FALSE) {
      options = ["true", "false"];
      const c = String(q?.correct_answer ?? "").trim().toLowerCase();
      if (!["true", "false"].includes(c)) throw `Question ${idx + 1}: mark true or false.`;
      correct_answer = c;
    } else {
      hasSubjective = true; // SHORT_ANSWER / ESSAY
    }

    rows.push({
      assessment_id: assessmentId,
      order_index: idx,
      type,
      prompt,
      options,
      correct_answer,
      points,
      explanation: q?.explanation ? String(q.explanation).trim() : null,
      is_auto_gradable: objective,
    });
  });

  return { rows, hasSubjective, totalPoints };
}

/** Parse a possibly-stringified array (multipart form fields arrive as strings). */
function parseArrayField(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
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
      const { title, brief, instructions, required_skills, duration_minutes, opens_at, closes_at, max_score, passing_score, allow_files, questions } = req.body || {};
      if (!title || !String(title).trim() || !brief || String(brief).trim().length < 10) {
        return res.status(400).json({ success: false, message: "Title and a brief (min 10 chars) are required." });
      }

      // Validate questions up front (if any) before creating the assessment.
      const questionInput = Array.isArray(questions) ? questions : [];
      let built: { rows: Partial<AssessmentQuestion>[]; hasSubjective: boolean; totalPoints: number };
      try {
        built = buildQuestionRows("", questionInput);
      } catch (msg: any) {
        return res.status(400).json({ success: false, message: String(msg) });
      }

      const hasQuestions = built.rows.length > 0;
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
          // With structured questions, max_score is the sum of question points.
          max_score: hasQuestions ? built.totalPoints : Number.isFinite(+max_score) ? Math.max(1, parseInt(max_score, 10)) : 100,
          passing_score:
            passing_score === undefined || passing_score === null || passing_score === ""
              ? null
              : Math.max(0, Math.min(100, parseInt(passing_score, 10) || 0)),
          // No structured questions = legacy free-text brief, which is graded manually.
          has_subjective: hasQuestions ? built.hasSubjective : true,
          question_count: built.rows.length,
          allow_files: allow_files === false ? false : true,
          status: AssessmentStatus.DRAFT,
        })
      );

      if (hasQuestions) {
        const qRepo = dbConnection.getRepository(AssessmentQuestion);
        await qRepo.save(built.rows.map((r) => qRepo.create({ ...r, assessment_id: a.id })));
      }
      emitAssessmentChanged({ assessmentId: a.id, institutionId: a.institution_id, action: "created" });
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

      // Structured questions (with answer key — institution owns them).
      const questions = await dbConnection
        .getRepository(AssessmentQuestion)
        .find({ where: { assessment_id: a.id }, order: { order_index: "ASC" } });

      // All answers across participants, grouped per participant.
      const answers = pIds.length
        ? await dbConnection.getRepository(AssessmentAnswer).find({ where: { participant_id: In(pIds) } })
        : [];
      const answerMap: Record<string, any[]> = {};
      answers.forEach((ans) => {
        (answerMap[ans.participant_id] = answerMap[ans.participant_id] || []).push(shapeAnswer(ans, true));
      });

      return res.json({
        success: true,
        data: shapeAssessment(a, {
          questions: questions.map(shapeQuestionFull),
          participants: participants.map((p) => ({
            ...shapeParticipant(p, fileMap[p.id] || []),
            auto_score: p.auto_score ?? null,
            manual_score: p.manual_score ?? null,
            pending_manual: p.pending_manual,
            answers: answerMap[p.id] || [],
          })),
        }),
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
      const { title, brief, instructions, required_skills, duration_minutes, opens_at, closes_at, max_score, passing_score, allow_files, questions } = req.body || {};
      if (title !== undefined) a.title = String(title).trim();
      if (brief !== undefined) a.brief = String(brief).trim();
      if (instructions !== undefined) a.instructions = instructions ? String(instructions).trim() : null;
      if (required_skills !== undefined) a.required_skills = Array.isArray(required_skills) ? required_skills : null;
      if (duration_minutes !== undefined) a.duration_minutes = Math.max(0, parseInt(duration_minutes, 10) || 0);
      if (opens_at !== undefined) a.opens_at = opens_at ? new Date(opens_at) : null;
      if (closes_at !== undefined) a.closes_at = closes_at ? new Date(closes_at) : null;
      if (allow_files !== undefined) a.allow_files = !!allow_files;
      if (passing_score !== undefined)
        a.passing_score =
          passing_score === null || passing_score === ""
            ? null
            : Math.max(0, Math.min(100, parseInt(passing_score, 10) || 0));

      // Replace the whole question set when provided.
      if (questions !== undefined) {
        const questionInput = Array.isArray(questions) ? questions : [];
        let built: { rows: Partial<AssessmentQuestion>[]; hasSubjective: boolean; totalPoints: number };
        try {
          built = buildQuestionRows(a.id, questionInput);
        } catch (msg: any) {
          return res.status(400).json({ success: false, message: String(msg) });
        }
        const qRepo = dbConnection.getRepository(AssessmentQuestion);
        await qRepo.delete({ assessment_id: a.id });
        if (built.rows.length) await qRepo.save(built.rows.map((r) => qRepo.create(r)));

        const hasQuestions = built.rows.length > 0;
        a.question_count = built.rows.length;
        a.has_subjective = hasQuestions ? built.hasSubjective : true;
        a.max_score = hasQuestions ? built.totalPoints : a.max_score;
      } else if (max_score !== undefined && a.question_count === 0) {
        // Only honour a manual max_score when there are no structured questions.
        a.max_score = Math.max(1, parseInt(max_score, 10) || 100);
      }

      await repo.save(a);
      emitAssessmentChanged({ assessmentId: a.id, institutionId: a.institution_id, action: "updated" });
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
        notifyUser({
          recipientId: m.user_id,
          role: RecipientRole.LEARNER,
          type: NotificationType.ASSESSMENT_INVITED,
          title: "New selection assessment",
          body: `${instName} invited you to "${a.title}".`,
          entityId: a.id,
          actorId: user.id,
          institutionId: user.id,
        });
      }

      a.invited_count = (a.invited_count || 0) + invited;
      if (a.status === AssessmentStatus.DRAFT) a.status = AssessmentStatus.PUBLISHED;
      await repo.save(a);

      if (invited > 0) {
        emitAssessmentChanged({ assessmentId: a.id, institutionId: a.institution_id, action: "updated" });
        for (const m of members) {
          if (existingIds.has(m.user_id)) continue;
          emitParticipantChanged({
            assessmentId: a.id, institutionId: a.institution_id, participantId: "",
            talentUserId: m.user_id, action: "invited", status: ParticipantStatus.INVITED,
          });
        }
      }

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
      emitAssessmentChanged({ assessmentId: a.id, institutionId: a.institution_id, action: "published" });
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
      notifyUser({
        recipientId: p.talent_user_id, role: RecipientRole.LEARNER, type: NotificationType.ASSESSMENT_GRADED,
        title: "Assessment graded", body: `Your result for "${a.title}" is ready: ${s} / ${a.max_score}.`,
        entityId: a.id, actorId: user.id, institutionId: a.institution_id,
      });
      emitParticipantChanged({
        assessmentId: a.id, institutionId: a.institution_id, participantId: p.id,
        talentUserId: p.talent_user_id, action: "graded", status: p.status,
      });
      return res.json({ success: true, message: "Submission graded.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to grade", error: error.message });
    }
  }

  /**
   * PATCH /api/excellence/assessments/:id/participants/:pid/grade-answers
   * body { grades: [{ answer_id, points_earned, feedback }] }
   * Grades the subjective answers; objective answers are already auto-graded.
   * Recomputes the total and flips to GRADED once nothing remains ungraded.
   */
  static async gradeAnswers(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const { id, pid } = req.params;
      const a = await dbConnection.getRepository(TalentAssessment).findOne({ where: { id } });
      if (!a || a.institution_id !== user.id) return res.status(403).json({ success: false, message: "Not allowed." });

      const partRepo = dbConnection.getRepository(AssessmentParticipant);
      const p = await partRepo.findOne({ where: { id: pid, assessment_id: id }, relations: ["talent"] });
      if (!p) return res.status(404).json({ success: false, message: "Participant not found" });
      if (![ParticipantStatus.SUBMITTED, ParticipantStatus.GRADED].includes(p.status)) {
        return res.status(400).json({ success: false, message: "Only submitted entries can be graded." });
      }

      const grades = Array.isArray(req.body?.grades) ? req.body.grades : [];
      if (!grades.length) return res.status(400).json({ success: false, message: "No grades provided." });

      const ansRepo = dbConnection.getRepository(AssessmentAnswer);
      const qRepo = dbConnection.getRepository(AssessmentQuestion);
      const answers = await ansRepo.find({ where: { participant_id: p.id } });
      const ansMap = new Map(answers.map((x) => [x.id, x]));
      const questions = await qRepo.find({ where: { assessment_id: id } });
      const qMap = new Map(questions.map((q) => [q.id, q]));

      for (const g of grades) {
        const row = ansMap.get(g?.answer_id);
        if (!row) continue;
        const q = qMap.get(row.question_id);
        if (!q || isObjectiveType(q.type)) continue; // never override auto-graded answers
        const pts = Math.max(0, Math.min(q.points, parseInt(g?.points_earned, 10) || 0));
        row.points_earned = pts;
        row.is_correct = pts >= q.points; // full marks counts as "correct" for review styling
        row.is_graded = true;
        if (g?.feedback !== undefined) row.instructor_feedback = g.feedback ? String(g.feedback).trim() : null;
        await ansRepo.save(row);
      }

      const { fullyGraded } = await recomputeAfterManualGrading(p);
      if (fullyGraded) p.graded_by_id = user.id;
      await partRepo.save(p);

      emitParticipantChanged({
        assessmentId: a.id, institutionId: a.institution_id, participantId: p.id,
        talentUserId: p.talent_user_id, action: "graded", status: p.status,
      });

      if (fullyGraded && p.talent?.email) {
        sendAssessmentGraded(p.talent.email, p.talent.first_name || "there", a.title, p.score, p.max_score, null).catch(() => {});
      }
      if (fullyGraded) {
        notifyUser({
          recipientId: p.talent_user_id, role: RecipientRole.LEARNER, type: NotificationType.ASSESSMENT_GRADED,
          title: "Assessment graded", body: `Your result for "${a.title}" is ready: ${p.score} / ${p.max_score}.`,
          entityId: a.id, actorId: user.id, institutionId: a.institution_id,
        });
      }

      const fresh = await ansRepo.find({ where: { participant_id: p.id } });
      return res.json({
        success: true,
        message: fullyGraded ? "Grading complete." : "Grades saved.",
        data: {
          participant: { ...shapeParticipant(p), auto_score: p.auto_score, manual_score: p.manual_score, pending_manual: p.pending_manual },
          answers: fresh.map((x) => shapeAnswer(x, true)),
          fully_graded: fullyGraded,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to grade answers", error: error.message });
    }
  }

  /**
   * GET /api/excellence/assessments/pending-grading
   * All submissions across this institution's assessments awaiting manual grading.
   */
  static async pendingGrading(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const assessments = await dbConnection
        .getRepository(TalentAssessment)
        .find({ where: { institution_id: user.id } });
      const ids = assessments.map((a) => a.id);
      if (!ids.length) return res.json({ success: true, data: [] });
      const aMap = new Map(assessments.map((a) => [a.id, a]));

      const parts = await dbConnection.getRepository(AssessmentParticipant).find({
        where: { assessment_id: In(ids), status: ParticipantStatus.SUBMITTED, pending_manual: true },
        relations: ["talent"],
        order: { submitted_at: "ASC" },
      });

      // Count ungraded subjective answers per participant for the queue badge.
      const pIds = parts.map((p) => p.id);
      const answers = pIds.length
        ? await dbConnection.getRepository(AssessmentAnswer).find({ where: { participant_id: In(pIds) } })
        : [];
      const ungradedMap: Record<string, number> = {};
      answers.forEach((ans) => {
        if (!ans.is_graded) ungradedMap[ans.participant_id] = (ungradedMap[ans.participant_id] || 0) + 1;
      });

      const data = parts.map((p) => {
        const a = aMap.get(p.assessment_id);
        return {
          participant_id: p.id,
          assessment_id: p.assessment_id,
          assessment_title: a?.title || "Assessment",
          status: p.status,
          submitted_at: p.submitted_at,
          auto_submitted: p.auto_submitted,
          auto_score: p.auto_score ?? null,
          max_score: p.max_score ?? a?.max_score ?? null,
          ungraded_count: ungradedMap[p.id] || 0,
          talent: p.talent
            ? {
                id: p.talent.id,
                first_name: p.talent.first_name,
                last_name: p.talent.last_name,
                email: p.talent.email,
                profile_picture_url: p.talent.profile_picture_url,
              }
            : null,
        };
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load pending grading", error: error.message });
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
      notifyUser({
        recipientId: p.talent_user_id, role: RecipientRole.LEARNER, type: NotificationType.ASSESSMENT_OFFER,
        title: "You received an offer", body: `Based on "${a.title}", ${await institutionName(user.id)} extended you an offer.`,
        entityId: a.id, actorId: user.id, institutionId: a.institution_id,
      });
      emitParticipantChanged({
        assessmentId: a.id, institutionId: a.institution_id, participantId: p.id,
        talentUserId: p.talent_user_id, action: "offered", status: p.status,
      });
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
      emitParticipantChanged({
        assessmentId: a.id, institutionId: a.institution_id, participantId: p.id,
        talentUserId: p.talent_user_id, action: "rejected", status: p.status,
      });
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
      emitAssessmentChanged({ assessmentId: a.id, institutionId: a.institution_id, action: "closed" });
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
      const deletedId = a.id;
      const institutionId = a.institution_id;
      await repo.remove(a);
      emitAssessmentChanged({ assessmentId: deletedId, institutionId, action: "deleted" });
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

      // Reveal the answer key + per-question results only once fully graded.
      const reveal = [
        ParticipantStatus.GRADED,
        ParticipantStatus.OFFERED,
        ParticipantStatus.ACCEPTED,
        ParticipantStatus.DECLINED,
      ].includes(p.status);

      const questions = await dbConnection
        .getRepository(AssessmentQuestion)
        .find({ where: { assessment_id: a.id }, order: { order_index: "ASC" } });
      const answers = await dbConnection.getRepository(AssessmentAnswer).find({ where: { participant_id: p.id } });

      return res.json({
        success: true,
        data: {
          participant: {
            ...shapeParticipant(p, files.map((f) => ({ id: f.id, file_url: f.file_url, original_name: f.original_name }))),
            auto_score: p.auto_score ?? null,
            manual_score: p.manual_score ?? null,
            pending_manual: p.pending_manual,
          },
          questions: questions.map((q) => shapeQuestionForTalent(q, reveal)),
          answers: answers.map((ans) => shapeAnswer(ans, reveal)),
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
      if (req.body?.response_text != null) p.response_text = String(req.body.response_text);
      await repo.save(p);

      // Autosave structured answers (no grading happens here).
      const answersInput = parseArrayField(req.body?.answers);
      if (answersInput.length) await upsertAnswers(p.id, p.assessment_id, answersInput);

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

      // Persist the final structured answers before grading.
      const answersInput = parseArrayField(req.body?.answers);
      if (answersInput.length) await upsertAnswers(p.id, p.assessment_id, answersInput);

      p.submitted_at = new Date();
      p.auto_submitted = false;

      // Auto-grade objective questions and decide the resulting status:
      //  - all objective → GRADED instantly
      //  - mixed / essay / legacy free-text → SUBMITTED (pending manual grading)
      const grade = await autoGradeParticipant(p);
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

      const instUser = await dbConnection.getRepository(User).findOne({ where: { id: a.institution_id } });
      if (p.status === ParticipantStatus.GRADED) {
        // Fully auto-graded — talent can see their result immediately.
        if (p.talent?.email)
          sendAssessmentGraded(p.talent.email, p.talent.first_name || "there", a.title, p.score, p.max_score, null).catch(() => {});
        notifyUser({
          recipientId: p.talent_user_id, role: RecipientRole.LEARNER, type: NotificationType.ASSESSMENT_GRADED,
          title: "Assessment graded", body: `Your result for "${a.title}" is ready: ${p.score} / ${p.max_score}.`,
          entityId: a.id, institutionId: a.institution_id,
        });
      } else {
        if (p.talent?.email) sendAssessmentSubmitted(p.talent.email, p.talent.first_name || "there", a.title, false).catch(() => {});
        if (instUser?.email) sendAssessmentSubmissionNotice(instUser.email, fullName(p.talent), a.title, false).catch(() => {});
        notifyUser({
          recipientId: a.institution_id, role: RecipientRole.INSTITUTION_ADMIN, type: NotificationType.ASSESSMENT_SUBMITTED,
          title: "New submission to review", body: `${fullName(p.talent)} submitted "${a.title}".`,
          entityId: a.id, actorId: p.talent_user_id, institutionId: a.institution_id,
        });
      }

      emitParticipantChanged({
        assessmentId: a.id, institutionId: a.institution_id, participantId: p.id,
        talentUserId: p.talent_user_id, action: "submitted", status: p.status,
      });

      return res.json({
        success: true,
        message: p.status === ParticipantStatus.GRADED ? "Submitted and graded." : "Submitted successfully.",
        data: { ...shapeParticipant(p), auto_score: p.auto_score, pending_manual: p.pending_manual, auto_graded: p.status === ParticipantStatus.GRADED },
      });
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
      const p = await repo.findOne({ where: { id: req.params.pid }, relations: ["assessment"] });
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
      if (p.assessment?.institution_id) {
        emitParticipantChanged({
          assessmentId: p.assessment_id, institutionId: p.assessment.institution_id, participantId: p.id,
          talentUserId: p.talent_user_id, action: "responded", status: p.status,
        });
      }
      return res.json({ success: true, message: decision === "accept" ? "Offer accepted." : "Offer declined.", data: shapeParticipant(p) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to respond", error: error.message });
    }
  }
}
