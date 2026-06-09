// @ts-nocheck
import { Request, Response } from "express";
import { In } from "typeorm";
import dbConnection from "../database/db";
import { User, AccountType } from "../database/models/User";
import {
  ExcellenceMember,
  ExcellenceMemberStatus,
} from "../database/models/ExcellenceMember";
import {
  ExcellenceSubscription,
  SubscriptionStatus,
  SubscriptionPlan,
} from "../database/models/ExcellenceSubscription";
import { Bounty, BountyStatus } from "../database/models/Bounty";
import {
  BountySubmission,
  SubmissionStatus,
} from "../database/models/BountySubmission";
import { BountySubmissionFile } from "../database/models/BountySubmissionFile";
import { BountyPayout, PayoutStatus } from "../database/models/BountyPayout";
import { BountyActivity, BountyActivityType } from "../database/models/BountyActivity";
import { ExcellenceBookmark } from "../database/models/ExcellenceBookmark";
import { UploadToCloud } from "../helpers/cloud";

// ---------- Helpers ----------

async function loadUser(req: Request): Promise<User | null> {
  const id = req.user?.userId || req.user?.id;
  if (!id) return null;
  return dbConnection.getRepository(User).findOne({ where: { id }, relations: ["profile"] });
}

async function activeMember(userId: string): Promise<ExcellenceMember | null> {
  return dbConnection
    .getRepository(ExcellenceMember)
    .findOne({ where: { user_id: userId, status: ExcellenceMemberStatus.ACTIVE } });
}

async function activeSubscription(institutionId: string): Promise<ExcellenceSubscription | null> {
  return dbConnection
    .getRepository(ExcellenceSubscription)
    .findOne({ where: { institution_id: institutionId, status: SubscriptionStatus.ACTIVE } });
}

async function institutionName(userId: string): Promise<string> {
  const u = await dbConnection.getRepository(User).findOne({ where: { id: userId }, relations: ["profile"] });
  if (!u) return "Company";
  return (u.profile as any)?.institution_name || `${u.first_name} ${u.last_name}`;
}

async function logBounty(bountyId: string, actorId: string | null, role: string, type: BountyActivityType, description: string) {
  try {
    const repo = dbConnection.getRepository(BountyActivity);
    await repo.save(repo.create({ bounty_id: bountyId, actor_id: actorId, actor_role: role, action_type: type, description }));
  } catch (_) {}
}

function shapeBountyCard(b: Bounty, instName?: string, mySubmission?: BountySubmission | null) {
  return {
    id: b.id,
    title: b.title,
    problem_statement: b.problem_statement,
    category: b.category,
    required_skills: b.required_skills || [],
    prize_amount: b.prize_amount,
    currency: b.currency,
    commission_rate: b.commission_rate,
    deadline: b.deadline,
    status: b.status,
    submissions_count: b.submissions_count,
    created_at: b.created_at,
    institution_id: b.institution_id,
    institution_name: instName || null,
    my_submission: mySubmission
      ? { id: mySubmission.id, status: mySubmission.status, created_at: mySubmission.created_at }
      : null,
  };
}

export class ExcellenceController {
  // ============================ MEMBER ============================

  /** GET /api/excellence/me */
  static async me(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

      const member = await dbConnection
        .getRepository(ExcellenceMember)
        .findOne({ where: { user_id: user.id } });
      if (!member || member.status !== ExcellenceMemberStatus.ACTIVE) {
        return res.status(403).json({ success: false, message: "You are not an active Excellence member." });
      }

      // Resolve linked company names.
      let linked: any[] = [];
      if (member.linked_institution_ids?.length) {
        const insts = await dbConnection
          .getRepository(User)
          .find({ where: { id: In(member.linked_institution_ids) }, relations: ["profile"] });
        linked = insts.map((i) => ({
          id: i.id,
          name: (i.profile as any)?.institution_name || `${i.first_name} ${i.last_name}`,
        }));
      }

      const subRepo = dbConnection.getRepository(BountySubmission);
      const [submissions_count, wins_count] = await Promise.all([
        subRepo.count({ where: { submitter_id: user.id } }),
        subRepo.count({ where: { submitter_id: user.id, status: SubmissionStatus.WINNER } }),
      ]);

      return res.json({
        success: true,
        data: {
          id: member.id,
          tier: member.tier,
          status: member.status,
          headline: member.headline,
          bio_highlight: member.bio_highlight,
          specialties: member.specialties || [],
          total_score: member.total_score,
          linked_institutions: linked,
          submissions_count,
          wins_count,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            profile_picture_url: user.profile_picture_url,
            account_type: user.account_type,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load profile", error: error.message });
    }
  }

  /** GET /api/excellence/bounties — OPEN bounties feed for members. */
  static async listOpenBounties(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const member = await activeMember(user.id);
      if (!member) return res.status(403).json({ success: false, message: "Excellence members only." });

      const { search = "", category = "" } = req.query as any;
      const repo = dbConnection.getRepository(Bounty);
      const qb = repo
        .createQueryBuilder("b")
        .where("b.status = :open", { open: BountyStatus.OPEN })
        .orderBy("b.deadline", "ASC");
      if (search && String(search).trim()) {
        qb.andWhere("(b.title ILIKE :s OR b.problem_statement ILIKE :s)", { s: `%${String(search).trim()}%` });
      }
      if (category && String(category).trim()) {
        qb.andWhere("b.category = :c", { c: category });
      }
      const rows = await qb.getMany();

      // Resolve institution names + my submission state in batch.
      const instIds = [...new Set(rows.map((r) => r.institution_id))];
      const insts = instIds.length
        ? await dbConnection.getRepository(User).find({ where: { id: In(instIds) }, relations: ["profile"] })
        : [];
      const instMap = new Map(insts.map((i) => [i.id, (i.profile as any)?.institution_name || `${i.first_name} ${i.last_name}`]));

      const mySubs = rows.length
        ? await dbConnection.getRepository(BountySubmission).find({
            where: { submitter_id: user.id, bounty_id: In(rows.map((r) => r.id)) },
          })
        : [];
      const subMap = new Map(mySubs.map((s) => [s.bounty_id, s]));

      const data = rows.map((b) => shapeBountyCard(b, instMap.get(b.institution_id), subMap.get(b.id) || null));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load bounties", error: error.message });
    }
  }

  /** GET /api/excellence/bounties/:id — detail (member or poster). */
  static async getBounty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

      const bounty = await dbConnection.getRepository(Bounty).findOne({ where: { id } });
      if (!bounty) return res.status(404).json({ success: false, message: "Bounty not found" });

      const isPoster = bounty.institution_id === user.id;
      const member = await activeMember(user.id);
      if (!isPoster && !member) {
        return res.status(403).json({ success: false, message: "Not allowed to view this bounty." });
      }

      const instName = await institutionName(bounty.institution_id);
      let mySubmission: BountySubmission | null = null;
      let myFiles: BountySubmissionFile[] = [];
      if (member) {
        mySubmission = await dbConnection
          .getRepository(BountySubmission)
          .findOne({ where: { bounty_id: id, submitter_id: user.id } });
        if (mySubmission) {
          myFiles = await dbConnection
            .getRepository(BountySubmissionFile)
            .find({ where: { submission_id: mySubmission.id } });
        }
      }

      return res.json({
        success: true,
        data: {
          ...shapeBountyCard(bounty, instName, mySubmission),
          is_poster: isPoster,
          can_submit:
            !!member &&
            bounty.status === BountyStatus.OPEN &&
            new Date(bounty.deadline).getTime() > Date.now() &&
            !mySubmission,
          my_submission_files: myFiles.map((f) => ({ id: f.id, file_url: f.file_url, original_name: f.original_name })),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load bounty", error: error.message });
    }
  }

  /** GET /api/excellence/bounties/:id/activity */
  static async bountyActivity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const rows = await dbConnection
        .getRepository(BountyActivity)
        .createQueryBuilder("a")
        .leftJoinAndSelect("a.actor", "actor")
        .where("a.bounty_id = :id", { id })
        .orderBy("a.created_at", "DESC")
        .getMany();
      const data = rows.map((a) => ({
        id: a.id,
        action_type: a.action_type,
        description: a.description,
        actor_role: a.actor_role,
        created_at: a.created_at,
        actor: a.actor ? { first_name: a.actor.first_name, last_name: a.actor.last_name } : null,
      }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load activity", error: error.message });
    }
  }

  /** POST /api/excellence/bounties/:id/submissions — multipart: summary, team_member_ids?, submission_files[] */
  static async submitSolution(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const member = await activeMember(user.id);
      if (!member) return res.status(403).json({ success: false, message: "Excellence members only." });

      const { summary, team_member_ids } = req.body || {};
      if (!summary || String(summary).trim().length < 10) {
        return res.status(400).json({ success: false, message: "A solution summary (min 10 characters) is required." });
      }

      const bountyRepo = dbConnection.getRepository(Bounty);
      const bounty = await bountyRepo.findOne({ where: { id } });
      if (!bounty) return res.status(404).json({ success: false, message: "Bounty not found" });
      if (bounty.status !== BountyStatus.OPEN) {
        return res.status(400).json({ success: false, message: "This bounty is no longer accepting submissions." });
      }
      if (new Date(bounty.deadline).getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: "The submission deadline has passed." });
      }

      const subRepo = dbConnection.getRepository(BountySubmission);
      const existing = await subRepo.findOne({ where: { bounty_id: id, submitter_id: user.id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "You have already submitted to this bounty." });
      }

      let teamIds: string[] | null = null;
      if (team_member_ids) {
        try {
          teamIds = Array.isArray(team_member_ids) ? team_member_ids : JSON.parse(team_member_ids);
        } catch (_) {
          teamIds = String(team_member_ids).split(",").map((s) => s.trim()).filter(Boolean);
        }
      }

      const submission = await subRepo.save(
        subRepo.create({
          bounty_id: id,
          submitter_id: user.id,
          summary: String(summary).trim(),
          team_member_ids: teamIds,
          status: SubmissionStatus.SUBMITTED,
        })
      );

      // Upload deliverable files (optional).
      const files = (req.files?.submission_files as any[]) || [];
      if (files.length) {
        const fileRepo = dbConnection.getRepository(BountySubmissionFile);
        for (const f of files) {
          try {
            const uploaded = await UploadToCloud(f);
            await fileRepo.save(
              fileRepo.create({
                submission_id: submission.id,
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

      // Bump denormalised counter atomically.
      await bountyRepo
        .createQueryBuilder()
        .update(Bounty)
        .set({ submissions_count: () => "submissions_count + 1" })
        .where("id = :id", { id })
        .execute();

      await logBounty(
        id,
        user.id,
        "MEMBER",
        BountyActivityType.SUBMITTED,
        `${user.first_name} ${user.last_name} submitted a solution.`
      );

      return res.status(201).json({
        success: true,
        message: "Solution submitted successfully.",
        data: { id: submission.id, status: submission.status },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to submit solution", error: error.message });
    }
  }

  /** GET /api/excellence/submissions — member's own submissions. */
  static async mySubmissions(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

      const rows = await dbConnection
        .getRepository(BountySubmission)
        .createQueryBuilder("s")
        .leftJoinAndSelect("s.bounty", "bounty")
        .where("s.submitter_id = :uid", { uid: user.id })
        .orderBy("s.created_at", "DESC")
        .getMany();

      const data = rows.map((s) => ({
        id: s.id,
        status: s.status,
        summary: s.summary,
        score: s.score,
        feedback: s.feedback,
        created_at: s.created_at,
        bounty: s.bounty
          ? {
              id: s.bounty.id,
              title: s.bounty.title,
              prize_amount: s.bounty.prize_amount,
              currency: s.bounty.currency,
              status: s.bounty.status,
              deadline: s.bounty.deadline,
            }
          : null,
      }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load submissions", error: error.message });
    }
  }

  // ============================ COMPANY (INSTITUTION) ============================

  /** GET /api/excellence/subscription — this company's subscription (or null). */
  static async mySubscription(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const sub = await dbConnection
        .getRepository(ExcellenceSubscription)
        .findOne({ where: { institution_id: user.id }, order: { created_at: "DESC" } });
      return res.json({
        success: true,
        data: sub
          ? { id: sub.id, plan: sub.plan, status: sub.status, contact_message: sub.contact_message, ends_at: sub.ends_at, created_at: sub.created_at }
          : null,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load subscription", error: error.message });
    }
  }

  /** POST /api/excellence/subscription — request access. Body: { plan?, contact_message? } */
  static async requestSubscription(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const { plan, contact_message } = req.body || {};
      const repo = dbConnection.getRepository(ExcellenceSubscription);

      const existing = await repo.findOne({ where: { institution_id: user.id }, order: { created_at: "DESC" } });
      if (existing && (existing.status === SubscriptionStatus.PENDING || existing.status === SubscriptionStatus.ACTIVE)) {
        return res.status(409).json({ success: false, message: `You already have a ${existing.status.toLowerCase()} subscription.` });
      }

      const sub = await repo.save(
        repo.create({
          institution_id: user.id,
          plan: plan === SubscriptionPlan.ONLINE ? SubscriptionPlan.ONLINE : SubscriptionPlan.NEGOTIATION,
          status: SubscriptionStatus.PENDING,
          contact_message: contact_message || null,
        })
      );
      return res.status(201).json({
        success: true,
        message: "Access request submitted. Our team will reach out to finalise your subscription.",
        data: { id: sub.id, status: sub.status, plan: sub.plan },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to request access", error: error.message });
    }
  }

  /** GET /api/excellence/talent — browse members (requires ACTIVE subscription). */
  static async listTalent(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const sub = await activeSubscription(user.id);
      if (!sub) {
        return res.status(402).json({ success: false, message: "An active subscription is required to access the talent pool.", code: "NO_SUBSCRIPTION" });
      }

      const { search = "", tier = "", specialty = "" } = req.query as any;
      const repo = dbConnection.getRepository(ExcellenceMember);
      const qb = repo
        .createQueryBuilder("m")
        .leftJoinAndSelect("m.user", "user")
        .where("m.status = :active", { active: ExcellenceMemberStatus.ACTIVE })
        .orderBy("m.tier", "DESC")
        .addOrderBy("m.total_score", "DESC");
      if (tier) qb.andWhere("m.tier = :tier", { tier });
      if (specialty) qb.andWhere("m.specialties ILIKE :sp", { sp: `%${specialty}%` });
      if (search && String(search).trim()) {
        qb.andWhere("(user.first_name ILIKE :s OR user.last_name ILIKE :s OR m.headline ILIKE :s)", { s: `%${String(search).trim()}%` });
      }
      const rows = await qb.getMany();
      const data = rows.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        tier: m.tier,
        headline: m.headline,
        specialties: m.specialties || [],
        total_score: m.total_score,
        user: m.user
          ? {
              id: m.user.id,
              first_name: m.user.first_name,
              last_name: m.user.last_name,
              profile_picture_url: m.user.profile_picture_url,
              country: m.user.country,
              city: m.user.city,
              account_type: m.user.account_type,
            }
          : null,
      }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load talent", error: error.message });
    }
  }

  /** GET /api/excellence/talent/:userId — full talent profile. */
  static async getTalent(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const sub = await activeSubscription(user.id);
      if (!sub) {
        return res.status(402).json({ success: false, message: "An active subscription is required.", code: "NO_SUBSCRIPTION" });
      }

      const { userId } = req.params;
      const member = await dbConnection
        .getRepository(ExcellenceMember)
        .findOne({ where: { user_id: userId, status: ExcellenceMemberStatus.ACTIVE }, relations: ["user", "user.profile"] });
      if (!member) return res.status(404).json({ success: false, message: "Talent profile not found" });

      const wins = await dbConnection
        .getRepository(BountySubmission)
        .count({ where: { submitter_id: userId, status: SubmissionStatus.WINNER } });

      const u = member.user;
      return res.json({
        success: true,
        data: {
          id: member.id,
          tier: member.tier,
          headline: member.headline,
          bio_highlight: member.bio_highlight,
          specialties: member.specialties || [],
          total_score: member.total_score,
          wins_count: wins,
          user: u
            ? {
                id: u.id,
                first_name: u.first_name,
                last_name: u.last_name,
                email: u.email,
                profile_picture_url: u.profile_picture_url,
                bio: u.bio,
                country: u.country,
                city: u.city,
                account_type: u.account_type,
                profile: u.profile || null,
              }
            : null,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load talent profile", error: error.message });
    }
  }

  /** GET /api/excellence/my-bounties — bounties posted by this company. */
  static async myBounties(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const rows = await dbConnection
        .getRepository(Bounty)
        .find({ where: { institution_id: user.id }, order: { created_at: "DESC" } });
      const instName = await institutionName(user.id);
      return res.json({ success: true, data: rows.map((b) => shapeBountyCard(b, instName)) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load bounties", error: error.message });
    }
  }

  /** POST /api/excellence/bounties — create a bounty (requires ACTIVE subscription). */
  static async createBounty(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      if (user.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Institution accounts only." });
      }
      const sub = await activeSubscription(user.id);
      if (!sub) {
        return res.status(402).json({ success: false, message: "An active subscription is required to post bounties.", code: "NO_SUBSCRIPTION" });
      }

      const { title, problem_statement, category, required_skills, prize_amount, currency, commission_rate, deadline } = req.body || {};
      if (!title || !problem_statement || !prize_amount || !deadline) {
        return res.status(400).json({ success: false, message: "title, problem_statement, prize_amount and deadline are required." });
      }
      const prize = parseFloat(prize_amount);
      if (isNaN(prize) || prize <= 0) {
        return res.status(400).json({ success: false, message: "prize_amount must be a positive number." });
      }
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime()) || deadlineDate.getTime() <= Date.now()) {
        return res.status(400).json({ success: false, message: "deadline must be a future date." });
      }
      let rate = parseFloat(commission_rate);
      if (isNaN(rate) || rate < 0.15 || rate > 0.2) rate = 0.15;

      let skills: string[] | null = null;
      if (required_skills) {
        skills = Array.isArray(required_skills)
          ? required_skills
          : String(required_skills).split(",").map((s) => s.trim()).filter(Boolean);
      }

      const repo = dbConnection.getRepository(Bounty);
      const bounty = await repo.save(
        repo.create({
          institution_id: user.id,
          title: String(title).trim(),
          problem_statement: String(problem_statement).trim(),
          category: category || null,
          required_skills: skills,
          prize_amount: prize,
          currency: currency || "USD",
          commission_rate: rate,
          deadline: deadlineDate,
          status: BountyStatus.OPEN,
        })
      );
      await logBounty(bounty.id, user.id, "COMPANY", BountyActivityType.CREATED, `Bounty "${bounty.title}" posted.`);

      return res.status(201).json({ success: true, message: "Bounty posted.", data: shapeBountyCard(bounty, await institutionName(user.id)) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to create bounty", error: error.message });
    }
  }

  /** GET /api/excellence/bounties/:id/submissions — poster reviews submissions. */
  static async listSubmissionsForBounty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

      const bounty = await dbConnection.getRepository(Bounty).findOne({ where: { id } });
      if (!bounty) return res.status(404).json({ success: false, message: "Bounty not found" });
      if (bounty.institution_id !== user.id) {
        return res.status(403).json({ success: false, message: "Only the posting company can review submissions." });
      }

      const subs = await dbConnection
        .getRepository(BountySubmission)
        .createQueryBuilder("s")
        .leftJoinAndSelect("s.submitter", "submitter")
        .where("s.bounty_id = :id", { id })
        .orderBy("s.created_at", "ASC")
        .getMany();

      const fileRepo = dbConnection.getRepository(BountySubmissionFile);
      const data = await Promise.all(
        subs.map(async (s) => {
          const files = await fileRepo.find({ where: { submission_id: s.id } });
          return {
            id: s.id,
            status: s.status,
            summary: s.summary,
            score: s.score,
            feedback: s.feedback,
            created_at: s.created_at,
            team_member_ids: s.team_member_ids || [],
            submitter: s.submitter
              ? {
                  id: s.submitter.id,
                  first_name: s.submitter.first_name,
                  last_name: s.submitter.last_name,
                  profile_picture_url: s.submitter.profile_picture_url,
                }
              : null,
            files: files.map((f) => ({ id: f.id, file_url: f.file_url, original_name: f.original_name })),
          };
        })
      );

      return res.json({
        success: true,
        data: { bounty: shapeBountyCard(bounty, await institutionName(bounty.institution_id)), submissions: data },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load submissions", error: error.message });
    }
  }

  /**
   * PATCH /api/excellence/submissions/:id
   * Body: { action: "shortlist" | "winner" | "feedback", feedback?, score? }
   * Picking a winner marks the bounty AWARDED and creates a PENDING payout (admin releases it).
   */
  static async reviewSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, feedback, score } = req.body || {};
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });

      const subRepo = dbConnection.getRepository(BountySubmission);
      const bountyRepo = dbConnection.getRepository(Bounty);
      const submission = await subRepo.findOne({ where: { id }, relations: ["bounty", "submitter"] });
      if (!submission) return res.status(404).json({ success: false, message: "Submission not found" });

      const bounty = submission.bounty;
      if (!bounty || bounty.institution_id !== user.id) {
        return res.status(403).json({ success: false, message: "Only the posting company can review submissions." });
      }

      if (feedback !== undefined) submission.feedback = feedback;
      if (score !== undefined && score !== null && !isNaN(parseInt(score))) submission.score = parseInt(score);

      if (action === "shortlist") {
        submission.status = SubmissionStatus.SHORTLISTED;
        await subRepo.save(submission);
        await logBounty(bounty.id, user.id, "COMPANY", BountyActivityType.SHORTLISTED, `A submission was shortlisted.`);
        return res.json({ success: true, message: "Submission shortlisted.", data: { id: submission.id, status: submission.status } });
      }

      if (action === "winner") {
        if (bounty.status === BountyStatus.PAID || bounty.status === BountyStatus.AWARDED) {
          return res.status(400).json({ success: false, message: "A winner has already been selected for this bounty." });
        }
        submission.status = SubmissionStatus.WINNER;
        await subRepo.save(submission);

        // Mark every other submission as not selected.
        await subRepo
          .createQueryBuilder()
          .update(BountySubmission)
          .set({ status: SubmissionStatus.NOT_SELECTED })
          .where("bounty_id = :bid AND id != :sid", { bid: bounty.id, sid: submission.id })
          .execute();

        bounty.status = BountyStatus.AWARDED;
        bounty.winner_submission_id = submission.id;
        await bountyRepo.save(bounty);

        // Create the pending payout with the commission split.
        const gross = parseFloat(bounty.prize_amount as any) || 0;
        const rate = parseFloat(bounty.commission_rate as any) || 0.15;
        const commission = Math.round(gross * rate * 100) / 100;
        const net = Math.round((gross - commission) * 100) / 100;
        const payoutRepo = dbConnection.getRepository(BountyPayout);
        await payoutRepo.save(
          payoutRepo.create({
            bounty_id: bounty.id,
            submission_id: submission.id,
            winner_id: submission.submitter_id,
            gross_amount: gross,
            commission_rate: rate,
            commission_amount: commission,
            net_to_winner: net,
            currency: bounty.currency,
            status: PayoutStatus.PENDING,
          })
        );

        await logBounty(
          bounty.id,
          user.id,
          "COMPANY",
          BountyActivityType.AWARDED,
          `Winner selected — payout of ${bounty.currency} ${net} is pending platform confirmation.`
        );

        return res.json({
          success: true,
          message: "Winner selected. The payout is now pending platform confirmation.",
          data: { id: submission.id, status: submission.status, bounty_status: bounty.status },
        });
      }

      // Plain feedback / score update.
      await subRepo.save(submission);
      return res.json({ success: true, message: "Submission updated.", data: { id: submission.id, status: submission.status } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to review submission", error: error.message });
    }
  }

  /** GET /api/excellence/bookmarks — returns the talent's saved bounty ids. */
  static async listBookmarks(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const rows = await dbConnection
        .getRepository(ExcellenceBookmark)
        .find({ where: { user_id: user.id }, select: ["bounty_id"] });
      return res.json({ success: true, data: rows.map((r) => r.bounty_id) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load bookmarks", error: error.message });
    }
  }

  /** POST /api/excellence/bookmarks/:bountyId/toggle — add/remove a saved bounty. */
  static async toggleBookmark(req: Request, res: Response) {
    try {
      const user = await loadUser(req);
      if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
      const { bountyId } = req.params;

      const bounty = await dbConnection.getRepository(Bounty).findOne({ where: { id: bountyId } });
      if (!bounty) return res.status(404).json({ success: false, message: "Bounty not found" });

      const repo = dbConnection.getRepository(ExcellenceBookmark);
      const existing = await repo.findOne({ where: { user_id: user.id, bounty_id: bountyId } });
      if (existing) {
        await repo.remove(existing);
        return res.json({ success: true, data: { saved: false } });
      }
      await repo.save(repo.create({ user_id: user.id, bounty_id: bountyId }));
      return res.json({ success: true, data: { saved: true } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to update bookmark", error: error.message });
    }
  }
}
