// @ts-nocheck
import { Request, Response } from "express";
import { In } from "typeorm";
import dbConnection from "../database/db";
import { User, AccountType } from "../database/models/User";
import { transporter } from "../services/emailTemplates";

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
   * POST /api/admin/email/bulk
   * Body: { account_types?: string[], user_ids?: string[], emails?: string[], all?: boolean, subject, body }
   */
  static async sendBulkEmail(req: Request, res: Response) {
    try {
      const { account_types, user_ids, emails, all, subject, body } = req.body || {};
      if (!subject || !body) {
        return res.status(400).json({ success: false, message: "subject and body are required" });
      }

      const userRepo = dbConnection.getRepository(User);
      const recipientMap = new Map<string, { email: string; first_name: string }>();

      const add = (u: any) => {
        if (u?.email) recipientMap.set(u.email.toLowerCase(), { email: u.email, first_name: u.first_name || "" });
      };

      if (all) {
        const users = await userRepo.find({ where: { is_active: true }, select: ["email", "first_name"] });
        users.forEach(add);
      } else {
        if (Array.isArray(account_types) && account_types.length) {
          const users = await userRepo.find({
            where: { account_type: In(account_types), is_active: true },
            select: ["email", "first_name"],
          });
          users.forEach(add);
        }
        if (Array.isArray(user_ids) && user_ids.length) {
          const users = await userRepo.find({ where: { id: In(user_ids) }, select: ["email", "first_name"] });
          users.forEach(add);
        }
        if (Array.isArray(emails) && emails.length) {
          emails.forEach((e: string) => e && recipientMap.set(String(e).toLowerCase(), { email: e, first_name: "" }));
        }
      }

      const recipients = Array.from(recipientMap.values());
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, message: "No recipients matched your selection." });
      }

      const html = wrapHtml(subject, body);
      let sent = 0;
      let failed = 0;

      // Send in small sequential batches to stay within provider limits.
      for (const r of recipients) {
        try {
          await transporter.sendMail({ from: process.env.EMAIL_USER, to: r.email, subject, html });
          sent++;
        } catch (_) {
          failed++;
        }
      }

      return res.json({
        success: true,
        message: `Email sent to ${sent} recipient(s)${failed ? `, ${failed} failed` : ""}.`,
        data: { total: recipients.length, sent, failed },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: "Failed to send bulk email", error: error.message });
    }
  }
}
