// @ts-nocheck
import { Request, Response } from "express";
import { In } from "typeorm";
import dbConnection from "../database/db";
import { User, AccountType } from "../database/models/User";
import { UserProfile } from "../database/models/UserProfile";
import {
  ExcellenceMember,
  ExcellenceTier,
  ExcellenceMemberStatus,
} from "../database/models/ExcellenceMember";
import {
  ExcellenceSubscription,
  SubscriptionStatus,
} from "../database/models/ExcellenceSubscription";
import { Bounty, BountyStatus } from "../database/models/Bounty";
import { BountyPayout, PayoutStatus } from "../database/models/BountyPayout";
import { BountyActivity, BountyActivityType } from "../database/models/BountyActivity";
import {
  sendExcellenceEnrollment,
  sendCompanyAccessGranted,
  sendBountyAwardWinner,
} from "../services/emailTemplates";

const MEMBER_ACCOUNT_TYPES = [
  AccountType.STUDENT,
  AccountType.RESEARCHER,
  AccountType.DIASPORA,
];

function shapeMember(m: ExcellenceMember) {
  const u = m.user || ({} as User);
  return {
    id: m.id,
    user_id: m.user_id,
    status: m.status,
    tier: m.tier,
    headline: m.headline,
    bio_highlight: m.bio_highlight,
    specialties: m.specialties || [],
    total_score: m.total_score,
    linked_institution_ids: m.linked_institution_ids || [],
    created_at: m.created_at,
    user: u
      ? {
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
          account_type: u.account_type,
          profile_picture_url: u.profile_picture_url,
          country: u.country,
          city: u.city,
        }
      : null,
  };
}

export class ExcellenceAdminController {
  /** GET /api/admin/excellence/stats/overview */
  static async statsOverview(_req: Request, res: Response) {
    try {
      const memberRepo = dbConnection.getRepository(ExcellenceMember);
      const subRepo = dbConnection.getRepository(ExcellenceSubscription);
      const bountyRepo = dbConnection.getRepository(Bounty);
      const payoutRepo = dbConnection.getRepository(BountyPayout);

      const [
        members_active,
        members_total,
        subscriptions_pending,
        subscriptions_active,
        bounties_open,
        payouts_pending,
      ] = await Promise.all([
        memberRepo.count({ where: { status: ExcellenceMemberStatus.ACTIVE } }),
        memberRepo.count(),
        subRepo.count({ where: { status: SubscriptionStatus.PENDING } }),
        subRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
        bountyRepo.count({ where: { status: BountyStatus.OPEN } }),
        payoutRepo.count({ where: { status: PayoutStatus.PENDING } }),
      ]);

      return res.json({
        success: true,
        data: {
          members_active,
          members_total,
          subscriptions_pending,
          subscriptions_active,
          bounties_open,
          payouts_pending,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load stats", error: error.message });
    }
  }

  /**
   * GET /api/admin/excellence/candidates?search=
   * Outstanding-eligible users (Student/Researcher/Diaspora) NOT yet enrolled.
   */
  static async listCandidates(req: Request, res: Response) {
    try {
      const { search = "", limit = "20" } = req.query as any;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

      const memberRepo = dbConnection.getRepository(ExcellenceMember);
      const existing = await memberRepo.find({ select: ["user_id"] });
      const excludeIds = existing.map((e) => e.user_id);

      const userRepo = dbConnection.getRepository(User);
      const qb = userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("user.account_type IN (:...types)", { types: MEMBER_ACCOUNT_TYPES })
        .andWhere("user.is_active = TRUE")
        .orderBy("user.date_joined", "DESC")
        .take(limitNum);

      if (excludeIds.length) {
        qb.andWhere("user.id NOT IN (:...excludeIds)", { excludeIds });
      }
      if (search && String(search).trim()) {
        const s = `%${String(search).trim()}%`;
        qb.andWhere(
          "(user.first_name ILIKE :s OR user.last_name ILIKE :s OR user.email ILIKE :s)",
          { s }
        );
      }

      const rows = await qb.getMany();
      const data = rows.map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        account_type: u.account_type,
        profile_picture_url: u.profile_picture_url,
        country: u.country,
        city: u.city,
        headline: (u.profile as any)?.headline || (u.profile as any)?.title || null,
      }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load candidates", error: error.message });
    }
  }

  /** GET /api/admin/excellence/institutions — active institution accounts (for linking). */
  static async listInstitutions(_req: Request, res: Response) {
    try {
      const userRepo = dbConnection.getRepository(User);
      const rows = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("user.account_type = :acc", { acc: AccountType.INSTITUTION })
        .andWhere("user.is_active = TRUE")
        .orderBy("user.date_joined", "DESC")
        .take(200)
        .getMany();
      const data = rows.map((u) => ({
        id: u.id,
        name: (u.profile as any)?.institution_name || `${u.first_name} ${u.last_name}`,
        email: u.email,
      }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load institutions", error: error.message });
    }
  }

  /** GET /api/admin/excellence/members?status=&search= */
  static async listMembers(req: Request, res: Response) {
    try {
      const { status = "all", search = "", page = "1", limit = "20" } = req.query as any;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const repo = dbConnection.getRepository(ExcellenceMember);
      const qb = repo
        .createQueryBuilder("m")
        .leftJoinAndSelect("m.user", "user")
        .orderBy("m.created_at", "DESC");

      if (status !== "all") {
        qb.andWhere("m.status = :status", { status });
      }
      if (search && String(search).trim()) {
        const s = `%${String(search).trim()}%`;
        qb.andWhere("(user.first_name ILIKE :s OR user.last_name ILIKE :s OR user.email ILIKE :s)", { s });
      }

      const [rows, total] = await qb
        .skip((pageNum - 1) * limitNum)
        .take(limitNum)
        .getManyAndCount();

      return res.json({
        success: true,
        data: rows.map(shapeMember),
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to list members", error: error.message });
    }
  }

  /**
   * POST /api/admin/excellence/members
   * Body: { user_id, tier?, headline?, bio_highlight?, specialties?[], linked_institution_ids?[] }
   */
  static async enrollMember(req: Request, res: Response) {
    try {
      const { user_id, tier, headline, bio_highlight, specialties, linked_institution_ids } = req.body || {};
      if (!user_id) {
        return res.status(400).json({ success: false, message: "user_id is required" });
      }

      const userRepo = dbConnection.getRepository(User);
      const memberRepo = dbConnection.getRepository(ExcellenceMember);

      const target = await userRepo.findOne({ where: { id: user_id } });
      if (!target) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const exists = await memberRepo.findOne({ where: { user_id } });
      if (exists) {
        return res.status(409).json({ success: false, message: "User is already an Excellence member" });
      }

      const resolvedTier = Object.values(ExcellenceTier).includes(tier) ? tier : ExcellenceTier.RISING;

      const member = memberRepo.create({
        user_id,
        enrolled_by_id: req.user?.userId || null,
        status: ExcellenceMemberStatus.ACTIVE,
        tier: resolvedTier,
        headline: headline || null,
        bio_highlight: bio_highlight || null,
        specialties: Array.isArray(specialties) ? specialties : null,
        linked_institution_ids: Array.isArray(linked_institution_ids) ? linked_institution_ids : null,
        total_score: 0,
      });
      const saved = await memberRepo.save(member);

      // Flip the overlay flag so the dashboard tab unlocks.
      target.is_excellence_member = true;
      target.excellence_tier = resolvedTier;
      await userRepo.save(target);

      try {
        await sendExcellenceEnrollment(target.email, target.first_name, resolvedTier);
      } catch (_) {}

      const reloaded = await memberRepo.findOne({ where: { id: saved.id }, relations: ["user"] });
      return res.status(201).json({
        success: true,
        message: "Excellence member enrolled. Recognition email sent.",
        data: shapeMember(reloaded!),
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to enroll member", error: error.message });
    }
  }

  /** PATCH /api/admin/excellence/members/:id */
  static async updateMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tier, status, headline, bio_highlight, specialties } = req.body || {};
      const memberRepo = dbConnection.getRepository(ExcellenceMember);
      const userRepo = dbConnection.getRepository(User);

      const member = await memberRepo.findOne({ where: { id }, relations: ["user"] });
      if (!member) {
        return res.status(404).json({ success: false, message: "Member not found" });
      }

      if (tier && Object.values(ExcellenceTier).includes(tier)) member.tier = tier;
      if (status && Object.values(ExcellenceMemberStatus).includes(status)) member.status = status;
      if (headline !== undefined) member.headline = headline;
      if (bio_highlight !== undefined) member.bio_highlight = bio_highlight;
      if (Array.isArray(specialties)) member.specialties = specialties;
      await memberRepo.save(member);

      // Keep the user overlay in sync.
      if (member.user) {
        member.user.is_excellence_member = member.status === ExcellenceMemberStatus.ACTIVE;
        member.user.excellence_tier = member.tier;
        await userRepo.save(member.user);
      }

      return res.json({ success: true, message: "Member updated.", data: shapeMember(member) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to update member", error: error.message });
    }
  }

  /** POST /api/admin/excellence/members/:id/link-institutions  Body: { institution_ids:[] } */
  static async linkInstitutions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { institution_ids } = req.body || {};
      if (!Array.isArray(institution_ids)) {
        return res.status(400).json({ success: false, message: "institution_ids array is required" });
      }
      const memberRepo = dbConnection.getRepository(ExcellenceMember);
      const member = await memberRepo.findOne({ where: { id }, relations: ["user"] });
      if (!member) {
        return res.status(404).json({ success: false, message: "Member not found" });
      }
      member.linked_institution_ids = institution_ids;
      await memberRepo.save(member);
      return res.json({ success: true, message: "Linked institutions updated.", data: shapeMember(member) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to link institutions", error: error.message });
    }
  }

  /** DELETE /api/admin/excellence/members/:id — revoke membership. */
  static async removeMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const memberRepo = dbConnection.getRepository(ExcellenceMember);
      const userRepo = dbConnection.getRepository(User);
      const member = await memberRepo.findOne({ where: { id }, relations: ["user"] });
      if (!member) {
        return res.status(404).json({ success: false, message: "Member not found" });
      }
      member.status = ExcellenceMemberStatus.REVOKED;
      await memberRepo.save(member);
      if (member.user) {
        member.user.is_excellence_member = false;
        await userRepo.save(member.user);
      }
      return res.json({ success: true, message: "Membership revoked." });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to revoke member", error: error.message });
    }
  }

  /** GET /api/admin/excellence/subscriptions?status= */
  static async listSubscriptions(req: Request, res: Response) {
    try {
      const { status = "all" } = req.query as any;
      const repo = dbConnection.getRepository(ExcellenceSubscription);
      const qb = repo
        .createQueryBuilder("s")
        .leftJoinAndSelect("s.institution", "institution")
        .leftJoinAndSelect("institution.profile", "profile")
        .orderBy("s.created_at", "DESC");
      if (status !== "all") qb.andWhere("s.status = :status", { status });
      const rows = await qb.getMany();
      const data = rows.map((s) => ({
        id: s.id,
        plan: s.plan,
        status: s.status,
        contact_message: s.contact_message,
        notes: s.notes,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        created_at: s.created_at,
        institution: s.institution
          ? {
              id: s.institution.id,
              name: (s.institution.profile as any)?.institution_name ||
                `${s.institution.first_name} ${s.institution.last_name}`,
              email: s.institution.email,
            }
          : null,
      }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to list subscriptions", error: error.message });
    }
  }

  /** PATCH /api/admin/excellence/subscriptions/:id  Body: { status, plan?, notes?, ends_at? } */
  static async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, plan, notes, ends_at } = req.body || {};
      const repo = dbConnection.getRepository(ExcellenceSubscription);
      const sub = await repo.findOne({ where: { id }, relations: ["institution", "institution.profile"] });
      if (!sub) {
        return res.status(404).json({ success: false, message: "Subscription not found" });
      }

      if (status && Object.values(SubscriptionStatus).includes(status)) sub.status = status;
      if (plan) sub.plan = plan;
      if (notes !== undefined) sub.notes = notes;
      if (ends_at) sub.ends_at = new Date(ends_at);

      if (sub.status === SubscriptionStatus.ACTIVE) {
        sub.starts_at = sub.starts_at || new Date();
        sub.approved_by_id = req.user?.userId || null;
      }
      await repo.save(sub);

      if (sub.status === SubscriptionStatus.ACTIVE && sub.institution) {
        try {
          await sendCompanyAccessGranted(
            sub.institution.email,
            sub.institution.first_name,
            (sub.institution.profile as any)?.institution_name || sub.institution.first_name
          );
        } catch (_) {}
      }

      return res.json({ success: true, message: "Subscription updated.", data: { id: sub.id, status: sub.status } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to update subscription", error: error.message });
    }
  }

  /** GET /api/admin/excellence/payouts?status= */
  static async listPayouts(req: Request, res: Response) {
    try {
      const { status = "all" } = req.query as any;
      const repo = dbConnection.getRepository(BountyPayout);
      const qb = repo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.bounty", "bounty")
        .leftJoinAndSelect("p.winner", "winner")
        .orderBy("p.created_at", "DESC");
      if (status !== "all") qb.andWhere("p.status = :status", { status });
      const rows = await qb.getMany();
      const data = rows.map((p) => ({
        id: p.id,
        status: p.status,
        gross_amount: p.gross_amount,
        commission_rate: p.commission_rate,
        commission_amount: p.commission_amount,
        net_to_winner: p.net_to_winner,
        currency: p.currency,
        released_at: p.released_at,
        created_at: p.created_at,
        bounty: p.bounty ? { id: p.bounty.id, title: p.bounty.title } : null,
        winner: p.winner
          ? { id: p.winner.id, first_name: p.winner.first_name, last_name: p.winner.last_name, email: p.winner.email }
          : null,
      }));
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to list payouts", error: error.message });
    }
  }

  /** POST /api/admin/excellence/payouts/:id/confirm — confirm + release payout, mark bounty PAID. */
  static async confirmPayout(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payoutRepo = dbConnection.getRepository(BountyPayout);
      const bountyRepo = dbConnection.getRepository(Bounty);
      const activityRepo = dbConnection.getRepository(BountyActivity);

      const payout = await payoutRepo.findOne({ where: { id }, relations: ["bounty", "winner"] });
      if (!payout) {
        return res.status(404).json({ success: false, message: "Payout not found" });
      }
      if (payout.status === PayoutStatus.RELEASED) {
        return res.status(400).json({ success: false, message: "Payout already released" });
      }

      payout.status = PayoutStatus.RELEASED;
      payout.confirmed_by_id = req.user?.userId || null;
      payout.released_at = new Date();
      await payoutRepo.save(payout);

      if (payout.bounty) {
        payout.bounty.status = BountyStatus.PAID;
        await bountyRepo.save(payout.bounty);
        await activityRepo.save(
          activityRepo.create({
            bounty_id: payout.bounty.id,
            actor_id: req.user?.userId || null,
            actor_role: "ADMIN",
            action_type: BountyActivityType.PAID,
            description: `Payout released: ${payout.currency} ${payout.net_to_winner} to winner.`,
          })
        );
      }

      if (payout.winner && payout.bounty) {
        try {
          await sendBountyAwardWinner(
            payout.winner.email,
            payout.winner.first_name,
            payout.bounty.title,
            String(payout.gross_amount),
            String(payout.net_to_winner),
            payout.currency
          );
        } catch (_) {}
      }

      return res.json({ success: true, message: "Payout confirmed & released.", data: { id: payout.id, status: payout.status } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to confirm payout", error: error.message });
    }
  }
}
