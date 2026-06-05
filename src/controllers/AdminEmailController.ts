// @ts-nocheck
import { Request, Response } from "express";
import { In, ILike, Brackets } from "typeorm";
import dbConnection from "../database/db";
import { User, AccountType } from "../database/models/User";
import { transporter } from "../services/emailTemplates";
import {
  EmailCampaign,
  EmailCampaignStatus,
} from "../database/models/EmailCampaign";
import {
  EmailRecipient,
  EmailRecipientStatus,
} from "../database/models/EmailRecipient";
import { getSocketIO } from "../socket/socketRegistry";

function wrapHtml(subject: string, body: string): string {
  // Preserve line breaks from a plain-text body.
  const safeBody = String(body).replace(/\n/g, "<br/>");
  return `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6fb;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#0158B7;padding:24px 30px;text-align:center;">
      <div style="color:white;font-size:24px;font-weight:bold;letter-spacing:1px;">BWENGE</div>
    </div>
    <div style="padding:30px;color:#374151;font-size:15px;line-height:1.7;">${safeBody}</div>
    <div style="background:#f8f9fa;padding:20px 30px;text-align:center;border-top:2px solid #eef0f4;">
      <div style="color:#6c757d;font-size:13px;">BWENGE Research Platform</div>
      <div style="color:#94a3b8;font-size:12px;margin-top:6px;">© ${new Date().getFullYear()} BWENGE.</div>
    </div>
  </div>
</body></html>`;
}

function displayName(u: { first_name?: string; last_name?: string; username?: string }): string {
  const full = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim();
  return full || u?.username || "";
}

/**
 * Emit a socket event to the admin who started the send. We reuse the existing
 * per-user room convention from socketHandlers (`user_<id>`), so no new auth.
 */
function emitToAdmin(adminId: string, event: string, payload: any) {
  try {
    const io = getSocketIO();
    if (io && adminId) io.to(`user_${adminId}`).emit(event, payload);
  } catch (_) {
    /* progress is best-effort; never let it break the send */
  }
}

export class AdminEmailController {
  /**
   * GET /api/admin/email/recipient-counts
   * Returns how many active users exist per account type (for the composer UI).
   */
  static async recipientCounts(_req: Request, res: Response) {
    try {
      const userRepo = dbConnection.getRepository(User);
      const types = [
        AccountType.STUDENT,
        AccountType.RESEARCHER,
        AccountType.DIASPORA,
        AccountType.INSTITUTION,
      ];
      const counts: Record<string, number> = {};
      await Promise.all(
        types.map(async (t) => {
          counts[t] = await userRepo.count({ where: { account_type: t, is_active: true } });
        })
      );
      const total = await userRepo.count({ where: { is_active: true } });
      return res.json({ success: true, data: { byType: counts, total } });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load counts", error: error.message });
    }
  }

  /**
   * GET /api/admin/email/recipients?search=&account_type=&page=&limit=
   * Paginated, searchable list of active users for the recipient picker.
   * Returns real email + names + username so admins choose exactly who to email.
   */
  static async listRecipients(req: Request, res: Response) {
    try {
      const userRepo = dbConnection.getRepository(User);
      const search = String(req.query.search || "").trim();
      const accountType = String(req.query.account_type || "").trim();
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "25"), 10) || 25));
      // `all=true` returns every match (capped) — used by the "select all of a
      // type" toggle so the picker can add a whole segment at once.
      const fetchAll = String(req.query.all || "") === "true";
      const ALL_CAP = 5000;

      const qb = userRepo
        .createQueryBuilder("u")
        .where("u.is_active = :active", { active: true });

      if (accountType) {
        qb.andWhere("u.account_type = :accountType", { accountType });
      }

      if (search) {
        qb.andWhere(
          new Brackets((b) => {
            b.where("u.email ILIKE :s", { s: `%${search}%` })
              .orWhere("u.username ILIKE :s", { s: `%${search}%` })
              .orWhere("u.first_name ILIKE :s", { s: `%${search}%` })
              .orWhere("u.last_name ILIKE :s", { s: `%${search}%` });
          })
        );
      }

      qb.orderBy("u.first_name", "ASC")
        .addOrderBy("u.email", "ASC")
        .skip(fetchAll ? 0 : (page - 1) * limit)
        .take(fetchAll ? ALL_CAP : limit)
        .select([
          "u.id",
          "u.email",
          "u.username",
          "u.first_name",
          "u.last_name",
          "u.account_type",
          "u.profile_picture_url",
        ]);

      const [users, total] = await qb.getManyAndCount();

      const data = users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username || null,
        first_name: u.first_name || null,
        last_name: u.last_name || null,
        name: displayName(u),
        account_type: u.account_type,
        profile_picture_url: u.profile_picture_url || null,
      }));

      return res.json({
        success: true,
        data,
        pagination: {
          page: fetchAll ? 1 : page,
          limit: fetchAll ? data.length : limit,
          total,
          totalPages: fetchAll ? 1 : Math.ceil(total / limit),
          hasMore: fetchAll ? false : page * limit < total,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load recipients", error: error.message });
    }
  }

  /**
   * Resolve the final, de-duplicated recipient set from a selection payload.
   * Returns recipient objects { user_id, email, name } and a human audience label.
   */
  static async resolveRecipients({ account_types, user_ids, emails, all }: any) {
    const userRepo = dbConnection.getRepository(User);
    const recipientMap = new Map<string, { user_id: string | null; email: string; name: string }>();

    const add = (u: any) => {
      if (u?.email) {
        recipientMap.set(u.email.toLowerCase(), {
          user_id: u.id || null,
          email: u.email,
          name: displayName(u),
        });
      }
    };

    const labelParts: string[] = [];

    if (all) {
      const users = await userRepo.find({
        where: { is_active: true },
        select: ["id", "email", "first_name", "last_name", "username"],
      });
      users.forEach(add);
      labelParts.push("All active users");
    } else {
      if (Array.isArray(account_types) && account_types.length) {
        const users = await userRepo.find({
          where: { account_type: In(account_types), is_active: true },
          select: ["id", "email", "first_name", "last_name", "username"],
        });
        users.forEach(add);
        labelParts.push(account_types.join(", "));
      }
      if (Array.isArray(user_ids) && user_ids.length) {
        const users = await userRepo.find({
          where: { id: In(user_ids) },
          select: ["id", "email", "first_name", "last_name", "username"],
        });
        users.forEach(add);
        labelParts.push(`${users.length} selected user(s)`);
      }
      if (Array.isArray(emails) && emails.length) {
        emails.forEach((e: string) => {
          if (e) recipientMap.set(String(e).toLowerCase(), { user_id: null, email: e, name: "" });
        });
        labelParts.push(`${emails.length} email(s)`);
      }
    }

    const recipients = Array.from(recipientMap.values());
    const audience_label = labelParts.join(" + ") || "Custom selection";
    return { recipients, audience_label };
  }

  /**
   * Background worker: sends to each recipient sequentially, updating the DB row
   * and emitting live progress to the admin after every message.
   */
  static async runCampaign(campaignId: string, adminId: string, subject: string, body: string) {
    const campaignRepo = dbConnection.getRepository(EmailCampaign);
    const recipientRepo = dbConnection.getRepository(EmailRecipient);

    const html = wrapHtml(subject, body);
    const rows = await recipientRepo.find({
      where: { campaign_id: campaignId, status: EmailRecipientStatus.PENDING },
    });
    const total = await recipientRepo.count({ where: { campaign_id: campaignId } });

    let sent = await recipientRepo.count({
      where: { campaign_id: campaignId, status: EmailRecipientStatus.SENT },
    });
    let failed = await recipientRepo.count({
      where: { campaign_id: campaignId, status: EmailRecipientStatus.FAILED },
    });

    await campaignRepo.update(campaignId, {
      status: EmailCampaignStatus.SENDING,
      started_at: () => "COALESCE(started_at, NOW())",
    });

    emitToAdmin(adminId, "bulk_email:started", { campaignId, total, sent, failed });

    for (const r of rows) {
      try {
        await transporter.sendMail({ from: process.env.EMAIL_USER, to: r.email, subject, html });
        r.status = EmailRecipientStatus.SENT;
        r.sent_at = new Date();
        r.error = null;
        sent++;
      } catch (e: any) {
        r.status = EmailRecipientStatus.FAILED;
        r.error = String(e?.message || e).slice(0, 500);
        failed++;
      }
      await recipientRepo.save(r);
      await campaignRepo.update(campaignId, { sent_count: sent, failed_count: failed });

      emitToAdmin(adminId, "bulk_email:progress", {
        campaignId,
        total,
        sent,
        failed,
        processed: sent + failed,
        recipient: {
          id: r.id,
          user_id: r.user_id,
          email: r.email,
          name: r.name,
          status: r.status,
        },
      });
    }

    const finalStatus =
      failed === 0
        ? EmailCampaignStatus.COMPLETED
        : sent === 0
        ? EmailCampaignStatus.FAILED
        : EmailCampaignStatus.PARTIAL;

    await campaignRepo.update(campaignId, {
      status: finalStatus,
      sent_count: sent,
      failed_count: failed,
      completed_at: new Date(),
    });

    emitToAdmin(adminId, "bulk_email:complete", {
      campaignId,
      total,
      sent,
      failed,
      status: finalStatus,
    });
  }

  /**
   * POST /api/admin/email/bulk
   * Body: { account_types?, user_ids?, emails?, all?, subject, body }
   * Creates a campaign + per-recipient rows, responds immediately with the
   * campaignId, then sends in the background with live socket progress.
   */
  static async sendBulkEmail(req: Request, res: Response) {
    try {
      const { account_types, user_ids, emails, all, subject, body } = req.body || {};
      if (!subject || !body) {
        return res.status(400).json({ success: false, message: "subject and body are required" });
      }

      const adminId = req.user?.id;
      const { recipients, audience_label } = await AdminEmailController.resolveRecipients({
        account_types,
        user_ids,
        emails,
        all,
      });

      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: "No recipients matched your selection." });
      }

      const campaignRepo = dbConnection.getRepository(EmailCampaign);
      const recipientRepo = dbConnection.getRepository(EmailRecipient);

      const campaign = await campaignRepo.save(
        campaignRepo.create({
          subject,
          body,
          audience_label,
          account_types: Array.isArray(account_types) ? account_types : null,
          sent_to_all: !!all,
          status: EmailCampaignStatus.PENDING,
          total_recipients: recipients.length,
          sent_count: 0,
          failed_count: 0,
          created_by_id: adminId || null,
        })
      );

      // Persist recipient rows in bulk (PENDING).
      const recipientRows = recipients.map((r) =>
        recipientRepo.create({
          campaign_id: campaign.id,
          user_id: r.user_id,
          email: r.email,
          name: r.name,
          status: EmailRecipientStatus.PENDING,
        })
      );
      await recipientRepo.save(recipientRows, { chunk: 200 });

      // Fire-and-forget: send in the background so the request returns instantly.
      setImmediate(() => {
        AdminEmailController.runCampaign(campaign.id, adminId, subject, body).catch(async (err) => {
          try {
            await campaignRepo.update(campaign.id, { status: EmailCampaignStatus.FAILED });
          } catch (_) {}
          emitToAdmin(adminId, "bulk_email:complete", {
            campaignId: campaign.id,
            error: String(err?.message || err),
            status: EmailCampaignStatus.FAILED,
          });
        });
      });

      return res.status(202).json({
        success: true,
        message: `Sending to ${recipients.length} recipient(s)…`,
        data: { campaignId: campaign.id, total: recipients.length, audience_label },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to start bulk email", error: error.message });
    }
  }

  /**
   * GET /api/admin/email/campaigns/:id/progress
   * Polling fallback for live progress (when sockets are unavailable).
   */
  static async getCampaignProgress(req: Request, res: Response) {
    try {
      const campaignRepo = dbConnection.getRepository(EmailCampaign);
      const campaign = await campaignRepo.findOne({ where: { id: req.params.id } });
      if (!campaign) {
        return res.status(404).json({ success: false, message: "Campaign not found" });
      }
      return res.json({
        success: true,
        data: {
          campaignId: campaign.id,
          status: campaign.status,
          total: campaign.total_recipients,
          sent: campaign.sent_count,
          failed: campaign.failed_count,
          processed: campaign.sent_count + campaign.failed_count,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load progress", error: error.message });
    }
  }

  /**
   * GET /api/admin/email/campaigns?search=&status=&page=&limit=
   * History list of past sends.
   */
  static async listCampaigns(req: Request, res: Response) {
    try {
      const campaignRepo = dbConnection.getRepository(EmailCampaign);
      const search = String(req.query.search || "").trim();
      const status = String(req.query.status || "").trim();
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20));

      const where: any = {};
      if (status) where.status = status;
      if (search) where.subject = ILike(`%${search}%`);

      const [items, total] = await campaignRepo.findAndCount({
        where,
        relations: ["created_by"],
        order: { created_at: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });

      const data = items.map((c) => ({
        id: c.id,
        subject: c.subject,
        audience_label: c.audience_label,
        status: c.status,
        total_recipients: c.total_recipients,
        sent_count: c.sent_count,
        failed_count: c.failed_count,
        created_by: c.created_by ? { id: c.created_by.id, name: displayName(c.created_by), email: c.created_by.email } : null,
        started_at: c.started_at,
        completed_at: c.completed_at,
        created_at: c.created_at,
      }));

      return res.json({
        success: true,
        data,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load campaigns", error: error.message });
    }
  }

  /**
   * GET /api/admin/email/campaigns/:id?recipientStatus=&page=&limit=
   * Full campaign detail + paginated per-recipient delivery breakdown
   * (who actually received it).
   */
  static async getCampaign(req: Request, res: Response) {
    try {
      const campaignRepo = dbConnection.getRepository(EmailCampaign);
      const recipientRepo = dbConnection.getRepository(EmailRecipient);

      const campaign = await campaignRepo.findOne({
        where: { id: req.params.id },
        relations: ["created_by"],
      });
      if (!campaign) {
        return res.status(404).json({ success: false, message: "Campaign not found" });
      }

      const recipientStatus = String(req.query.recipientStatus || "").trim();
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "50"), 10) || 50));

      const where: any = { campaign_id: campaign.id };
      if (recipientStatus) where.status = recipientStatus;

      const [recipients, recipientsTotal] = await recipientRepo.findAndCount({
        where,
        order: { sent_at: "DESC", created_at: "ASC" },
        skip: (page - 1) * limit,
        take: limit,
      });

      return res.json({
        success: true,
        data: {
          id: campaign.id,
          subject: campaign.subject,
          body: campaign.body,
          audience_label: campaign.audience_label,
          account_types: campaign.account_types,
          sent_to_all: campaign.sent_to_all,
          status: campaign.status,
          total_recipients: campaign.total_recipients,
          sent_count: campaign.sent_count,
          failed_count: campaign.failed_count,
          created_by: campaign.created_by
            ? { id: campaign.created_by.id, name: displayName(campaign.created_by), email: campaign.created_by.email }
            : null,
          started_at: campaign.started_at,
          completed_at: campaign.completed_at,
          created_at: campaign.created_at,
          recipients: recipients.map((r) => ({
            id: r.id,
            user_id: r.user_id,
            email: r.email,
            name: r.name,
            status: r.status,
            error: r.error,
            sent_at: r.sent_at,
          })),
          recipientsPagination: {
            page,
            limit,
            total: recipientsTotal,
            totalPages: Math.ceil(recipientsTotal / limit),
            hasMore: page * limit < recipientsTotal,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to load campaign", error: error.message });
    }
  }

  /**
   * POST /api/admin/email/campaigns/:id/resend-failed
   * Re-queues only the FAILED recipients and sends again with live progress.
   */
  static async resendFailed(req: Request, res: Response) {
    try {
      const campaignRepo = dbConnection.getRepository(EmailCampaign);
      const recipientRepo = dbConnection.getRepository(EmailRecipient);
      const adminId = req.user?.id;

      const campaign = await campaignRepo.findOne({ where: { id: req.params.id } });
      if (!campaign) {
        return res.status(404).json({ success: false, message: "Campaign not found" });
      }

      const failedCount = await recipientRepo.count({
        where: { campaign_id: campaign.id, status: EmailRecipientStatus.FAILED },
      });
      if (failedCount === 0) {
        return res.status(400).json({ success: false, message: "No failed recipients to resend." });
      }

      // Reset failed rows to PENDING and adjust the failed counter.
      await recipientRepo.update(
        { campaign_id: campaign.id, status: EmailRecipientStatus.FAILED },
        { status: EmailRecipientStatus.PENDING, error: null }
      );
      await campaignRepo.update(campaign.id, {
        failed_count: 0,
        status: EmailCampaignStatus.SENDING,
        completed_at: null,
      });

      setImmediate(() => {
        AdminEmailController.runCampaign(campaign.id, adminId, campaign.subject, campaign.body).catch(async (err) => {
          try {
            await campaignRepo.update(campaign.id, { status: EmailCampaignStatus.FAILED });
          } catch (_) {}
          emitToAdmin(adminId, "bulk_email:complete", {
            campaignId: campaign.id,
            error: String(err?.message || err),
            status: EmailCampaignStatus.FAILED,
          });
        });
      });

      return res.status(202).json({
        success: true,
        message: `Resending to ${failedCount} failed recipient(s)…`,
        data: { campaignId: campaign.id, retrying: failedCount },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to resend", error: error.message });
    }
  }

  /**
   * DELETE /api/admin/email/campaigns/:id
   * Removes a campaign and its recipient records (cascade).
   */
  static async deleteCampaign(req: Request, res: Response) {
    try {
      const campaignRepo = dbConnection.getRepository(EmailCampaign);
      const campaign = await campaignRepo.findOne({ where: { id: req.params.id } });
      if (!campaign) {
        return res.status(404).json({ success: false, message: "Campaign not found" });
      }
      if (campaign.status === EmailCampaignStatus.SENDING) {
        return res.status(409).json({ success: false, message: "Cannot delete a campaign while it is still sending." });
      }
      await campaignRepo.remove(campaign);
      return res.json({ success: true, message: "Campaign deleted." });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to delete campaign", error: error.message });
    }
  }
}
