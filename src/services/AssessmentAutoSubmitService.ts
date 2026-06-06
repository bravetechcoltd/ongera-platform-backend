// @ts-nocheck
import { LessThanOrEqual } from "typeorm";
import dbConnection from "../database/db";
import { AssessmentParticipant, ParticipantStatus } from "../database/models/AssessmentParticipant";
import { TalentAssessment } from "../database/models/TalentAssessment";
import { User } from "../database/models/User";
import { logger } from "../helpers/logger";
import { sendAssessmentSubmitted, sendAssessmentSubmissionNotice } from "../services/emailTemplates";

/**
 * Periodically finalises timed assessment attempts whose deadline has passed.
 * If a talent leaves the page or never clicks submit, their last autosaved work
 * is auto-submitted when the timer (due_at) elapses.
 */
export class AssessmentAutoSubmitService {
  private static timer: NodeJS.Timeout | null = null;
  private static readonly INTERVAL_MS = 60 * 1000; // every minute

  static start() {
    if (this.timer) return;
    // Run shortly after boot, then on an interval.
    setTimeout(() => this.runSafe(), 10 * 1000);
    this.timer = setInterval(() => this.runSafe(), this.INTERVAL_MS);
    logger.info("Assessment auto-submit service started");
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info("Assessment auto-submit service stopped");
    }
  }

  private static async runSafe() {
    try {
      await this.run();
    } catch (e: any) {
      logger.error("Assessment auto-submit run failed:", e?.message || e);
    }
  }

  private static async run() {
    const partRepo = dbConnection.getRepository(AssessmentParticipant);
    const now = new Date();

    const due = await partRepo.find({
      where: { status: ParticipantStatus.IN_PROGRESS, due_at: LessThanOrEqual(now) },
      relations: ["assessment", "talent"],
      take: 200,
    });
    if (!due.length) return;

    const assessmentRepo = dbConnection.getRepository(TalentAssessment);
    const userRepo = dbConnection.getRepository(User);

    for (const p of due) {
      if (!p.due_at) continue;
      p.status = ParticipantStatus.SUBMITTED;
      p.submitted_at = now;
      p.auto_submitted = true;
      await partRepo.save(p);

      try {
        await assessmentRepo
          .createQueryBuilder()
          .update(TalentAssessment)
          .set({ submitted_count: () => "submitted_count + 1" })
          .where("id = :id", { id: p.assessment_id })
          .execute();
      } catch (_) {}

      const title = p.assessment?.title || "Assessment";
      if (p.talent?.email) {
        sendAssessmentSubmitted(p.talent.email, p.talent.first_name || "there", title, true).catch(() => {});
      }
      try {
        const inst = p.assessment ? await userRepo.findOne({ where: { id: p.assessment.institution_id } }) : null;
        if (inst?.email) {
          const talentName = `${p.talent?.first_name || ""} ${p.talent?.last_name || ""}`.trim() || (p.talent?.email || "A talent");
          sendAssessmentSubmissionNotice(inst.email, talentName, title, true).catch(() => {});
        }
      } catch (_) {}
    }

    logger.info(`Auto-submitted ${due.length} expired assessment attempt(s)`);
  }
}
