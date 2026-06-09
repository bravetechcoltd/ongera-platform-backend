// @ts-nocheck
import dbConnection from "../database/db";
import { AssessmentQuestion, QuestionType, isObjectiveType } from "../database/models/AssessmentQuestion";
import { AssessmentAnswer } from "../database/models/AssessmentAnswer";
import { AssessmentParticipant, ParticipantStatus } from "../database/models/AssessmentParticipant";

const norm = (s: any) => String(s ?? "").trim().toLowerCase();

const splitMulti = (s: any) =>
  String(s ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .sort();

/** Set-equality for checkbox questions (order-independent). */
function checkboxesCorrect(userAnswer: any, correctAnswer: any): boolean {
  const ua = splitMulti(userAnswer);
  const ca = splitMulti(correctAnswer);
  return ca.length > 0 && ua.length === ca.length && ua.every((v, i) => v === ca[i]);
}

/** Normalise an incoming answer value (array or scalar) to stored string form. */
export function normalizeAnswerValue(value: any): string {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join(",");
  return value == null ? "" : String(value);
}

/**
 * Upsert a talent's answers (used by autosave and by submit). Does NOT grade —
 * just stores the latest values. answersInput: [{ question_id, answer }].
 */
export async function upsertAnswers(
  participantId: string,
  assessmentId: string,
  answersInput: any[]
): Promise<void> {
  if (!Array.isArray(answersInput) || !answersInput.length) return;
  const qRepo = dbConnection.getRepository(AssessmentQuestion);
  const aRepo = dbConnection.getRepository(AssessmentAnswer);

  const questions = await qRepo.find({ where: { assessment_id: assessmentId } });
  const qIds = new Set(questions.map((q) => q.id));

  const existing = await aRepo.find({ where: { participant_id: participantId } });
  const exMap = new Map(existing.map((e) => [e.question_id, e]));

  for (const inp of answersInput) {
    if (!inp || !qIds.has(inp.question_id)) continue;
    const val = normalizeAnswerValue(inp.answer);
    const row = exMap.get(inp.question_id);
    if (row) {
      row.answer = val;
      await aRepo.save(row);
    } else {
      const created = aRepo.create({
        participant_id: participantId,
        question_id: inp.question_id,
        answer: val,
        is_graded: false,
      });
      await aRepo.save(created);
      exMap.set(inp.question_id, created);
    }
  }
}

/**
 * Auto-grade all objective answers for a participant and decide the resulting
 * status. Subjective answers are left ungraded. Returns a summary.
 *
 * - All objective (and at least one question) → status GRADED, score = auto_score.
 * - Has subjective, or no structured questions (legacy free-text) → status SUBMITTED,
 *   pending_manual = true.
 *
 * The caller is responsible for saving the participant and sending emails.
 */
export async function autoGradeParticipant(participant: AssessmentParticipant): Promise<{
  hasQuestions: boolean;
  hasSubjective: boolean;
  autoScore: number;
  totalPoints: number;
}> {
  const qRepo = dbConnection.getRepository(AssessmentQuestion);
  const aRepo = dbConnection.getRepository(AssessmentAnswer);

  const questions = await qRepo.find({ where: { assessment_id: participant.assessment_id } });
  const answers = await aRepo.find({ where: { participant_id: participant.id } });
  const ansMap = new Map(answers.map((a) => [a.question_id, a]));

  let autoScore = 0;
  let hasSubjective = false;
  let totalPoints = 0;

  for (const q of questions) {
    totalPoints += q.points || 0;
    let row = ansMap.get(q.id);
    if (!row) {
      row = aRepo.create({ participant_id: participant.id, question_id: q.id, answer: "", is_graded: false });
    }

    if (isObjectiveType(q.type)) {
      let correct = false;
      if (q.type === QuestionType.CHECKBOXES) correct = checkboxesCorrect(row.answer, q.correct_answer);
      else correct = norm(row.answer) !== "" && norm(row.answer) === norm(q.correct_answer);
      row.is_correct = correct;
      row.points_earned = correct ? q.points : 0;
      row.is_graded = true;
      autoScore += row.points_earned;
    } else {
      hasSubjective = true;
      // Leave subjective answers pending; preserve any prior manual grade.
      if (row.is_graded !== true) {
        row.is_correct = null;
        row.points_earned = null;
        row.is_graded = false;
      }
    }
    await aRepo.save(row);
  }

  const hasQuestions = questions.length > 0;
  participant.auto_score = autoScore;
  participant.max_score = participant.max_score || totalPoints || participant.max_score;

  if (hasQuestions && !hasSubjective) {
    participant.manual_score = 0;
    participant.score = autoScore;
    participant.pending_manual = false;
    participant.graded_at = new Date();
    participant.status = ParticipantStatus.GRADED;
  } else {
    // Legacy free-text (no questions) or mixed/essay → await manual grading.
    participant.pending_manual = true;
    participant.status = ParticipantStatus.SUBMITTED;
  }

  return { hasQuestions, hasSubjective, autoScore, totalPoints };
}

/**
 * Recompute a participant's manual + total score after subjective answers are
 * graded. Flips to GRADED and clears pending_manual once no ungraded answers
 * remain. Returns whether the participant is now fully graded.
 */
export async function recomputeAfterManualGrading(
  participant: AssessmentParticipant
): Promise<{ fullyGraded: boolean; total: number; maxScore: number }> {
  const qRepo = dbConnection.getRepository(AssessmentQuestion);
  const aRepo = dbConnection.getRepository(AssessmentAnswer);

  const questions = await qRepo.find({ where: { assessment_id: participant.assessment_id } });
  const answers = await aRepo.find({ where: { participant_id: participant.id } });
  const qMap = new Map(questions.map((q) => [q.id, q]));

  let autoScore = 0;
  let manualScore = 0;
  let anyUngraded = false;

  for (const a of answers) {
    const q = qMap.get(a.question_id);
    if (!q) continue;
    if (isObjectiveType(q.type)) {
      autoScore += a.points_earned || 0;
    } else if (a.is_graded) {
      manualScore += a.points_earned || 0;
    } else {
      anyUngraded = true;
    }
  }

  // Any subjective question with no answer row at all is still ungraded.
  const subjectiveQs = questions.filter((q) => !isObjectiveType(q.type));
  if (subjectiveQs.some((q) => !answers.find((a) => a.question_id === q.id && a.is_graded))) {
    anyUngraded = true;
  }

  const maxScore = questions.reduce((s, q) => s + (q.points || 0), 0) || participant.max_score || 0;
  participant.auto_score = autoScore;
  participant.manual_score = manualScore;
  participant.max_score = maxScore || participant.max_score;
  participant.score = autoScore + manualScore;

  const fullyGraded = !anyUngraded;
  if (fullyGraded) {
    participant.pending_manual = false;
    participant.graded_at = new Date();
    participant.status = ParticipantStatus.GRADED;
  }
  return { fullyGraded, total: autoScore + manualScore, maxScore };
}
