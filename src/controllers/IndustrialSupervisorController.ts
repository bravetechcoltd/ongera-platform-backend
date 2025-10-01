// @ts-nocheck
import { Request, Response } from "express";
import crypto from "crypto";
import dbConnection from "../database/db";
import { User, AccountType } from "../database/models/User";
import {
  IndustrialSupervisor,
  SupervisorInvitationStatus,
} from "../database/models/IndustrialSupervisor";
import { InstructorStudent } from "../database/models/InstructorStudent";
import { sendEmail } from "../helpers/utils";

function buildInviteEmail(institutionName: string, inviterName: string, acceptUrl: string, expertise?: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width:600px; margin:0 auto;">
      <div style="background:#0158B7; padding:20px; color:white; text-align:center;">
        <h2 style="margin:0;">Industrial Supervisor Invitation</h2>
      </div>
      <div style="padding:25px; background:#ffffff; border:1px solid #e5e7eb;">
        <p>Dear Expert,</p>
        <p>${inviterName} has invited you to serve as an <b>Industrial Supervisor</b> for <b>${institutionName}</b> on the Bwenge Institution Research Portal.</p>
        ${expertise ? `<p><b>Expertise area:</b> ${expertise}</p>` : ""}
        <p>As an Industrial Supervisor you will review student research projects at <b>Stage 2</b> of the institution's multi-stage pipeline.</p>
        <p>
          <a href="${acceptUrl}" style="display:inline-block; background:#0158B7; color:#ffffff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:600;">Accept Invitation</a>
        </p>
        <p style="color:#6b7280; font-size:13px;">This link is valid for 7 days.</p>
      </div>
    </div>
  `;
}

export class IndustrialSupervisorController {
  static async invite(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { user_id, expertise_area, organization } = req.body;

      const userRepo = dbConnection.getRepository(User);
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);

      const institution = await userRepo.findOne({
        where: { id: institutionId },
        relations: ["profile"],
      });
      if (!institution || institution.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Only institution accounts can invite supervisors" });
      }

      const target = await userRepo.findOne({ where: { id: user_id } });
      if (!target) return res.status(404).json({ success: false, message: "User not found" });

      if (![AccountType.RESEARCHER, AccountType.DIASPORA, AccountType.INSTITUTION].includes(target.account_type)) {
        return res.status(400).json({
          success: false,
          message: "User must be a Researcher, Diaspora, or Institution account",
        });
      }

      // Already invited?
      const existing = await supRepo.findOne({
        where: {
          user: { id: target.id },
          institution: { id: institutionId },
        },
      });
      if (existing && existing.invitation_status === SupervisorInvitationStatus.ACCEPTED) {
        return res.status(400).json({ success: false, message: "User already a supervisor for this institution" });
      }

      const token = crypto.randomBytes(24).toString("hex");
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      let invitation: IndustrialSupervisor;
      if (existing) {
        existing.invitation_status = SupervisorInvitationStatus.PENDING;
        existing.invitation_token = token;
        existing.invitation_expires_at = expires;
        existing.expertise_area = expertise_area || existing.expertise_area;
        existing.organization = organization || existing.organization;
        invitation = await supRepo.save(existing);
      } else {
        invitation = supRepo.create({
          user: target,
          institution,
          invited_by: { id: institutionId } as any,
          invitation_status: SupervisorInvitationStatus.PENDING,
          invitation_token: token,
          invitation_expires_at: expires,
          expertise_area,
          organization,
          is_active: false,
        });
        invitation = await supRepo.save(invitation);
      }

      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      const acceptUrl = `${clientUrl}/institution-portal/supervisor-invitation/${token}`;
      const institutionName = institution.profile?.institution_name || `${institution.first_name} ${institution.last_name || ""}`;

      await sendEmail({
        to: target.email,
        subject: "Industrial Supervisor Invitation - Bwenge",
        html: buildInviteEmail(institutionName, institutionName, acceptUrl, expertise_area),
      });

      return res.status(201).json({
        success: true,
        message: "Invitation sent",
        data: { invitation_id: invitation.id, invitation_status: invitation.invitation_status },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async acceptInvitation(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const userRepo = dbConnection.getRepository(User);

      const inv = await supRepo.findOne({
        where: { invitation_token: token },
        relations: ["user", "institution"],
      });
      if (!inv) return res.status(404).json({ success: false, message: "Invitation not found" });

      if (inv.invitation_status === SupervisorInvitationStatus.ACCEPTED) {
        return res.json({ success: true, message: "Already accepted", data: inv });
      }

      if (inv.invitation_status === SupervisorInvitationStatus.REVOKED) {
        return res.status(400).json({ success: false, message: "Invitation has been revoked" });
      }

      if (inv.invitation_expires_at && new Date() > inv.invitation_expires_at) {
        return res.status(400).json({ success: false, message: "Invitation has expired" });
      }

      inv.invitation_status = SupervisorInvitationStatus.ACCEPTED;
      inv.accepted_at = new Date();
      inv.is_active = true;
      await supRepo.save(inv);

      const u = inv.user;
      u.is_industrial_supervisor = true;
      const inst = inv.institution.id;
      const current = u.industrial_supervisor_institutions || [];
      if (!current.includes(inst)) current.push(inst);
      u.industrial_supervisor_institutions = current;
      await userRepo.save(u);

      return res.json({ success: true, message: "Invitation accepted", data: inv });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listSupervisors(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);

      const list = await supRepo.find({
        where: { institution: { id: institutionId } as any },
        relations: ["user", "user.profile"],
        order: { created_at: "DESC" },
      });
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async revokeSupervisor(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { supervisorId } = req.params;
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const userRepo = dbConnection.getRepository(User);

      const inv = await supRepo.findOne({
        where: { id: supervisorId, institution: { id: institutionId } as any },
        relations: ["user", "institution"],
      });
      if (!inv) return res.status(404).json({ success: false, message: "Invitation not found" });

      inv.invitation_status = SupervisorInvitationStatus.REVOKED;
      inv.is_active = false;
      await supRepo.save(inv);

      const u = inv.user;
      const list = (u.industrial_supervisor_institutions || []).filter((i) => i !== institutionId);
      u.industrial_supervisor_institutions = list;
      if (list.length === 0) u.is_industrial_supervisor = false;
      await userRepo.save(u);

      return res.json({ success: true, message: "Supervisor access revoked" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async assignSupervisorToStudent(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { supervisor_id, student_id } = req.body;

      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const insRepo = dbConnection.getRepository(InstructorStudent);

      const inv = await supRepo.findOne({
        where: {
          user: { id: supervisor_id } as any,
          institution: { id: institutionId } as any,
          invitation_status: SupervisorInvitationStatus.ACCEPTED,
          is_active: true,
        },
      });
      if (!inv) return res.status(400).json({ success: false, message: "Supervisor is not active in this institution" });

      const links = await insRepo.find({
        where: { student: { id: student_id } as any },
      });
      if (!links || links.length === 0) {
        return res.status(400).json({ success: false, message: "Student has no instructor assignment yet" });
      }

      for (const l of links) {
        l.has_industrial_supervisor = true;
        l.industrial_supervisor_id = supervisor_id;
        l.assigned_by_institution_id = institutionId;
        await insRepo.save(l);
      }

      return res.json({ success: true, message: "Supervisor assigned to student" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listAllAdmin(req: Request, res: Response) {
    try {
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const { institution_id, status } = req.query;
      const qb = supRepo
        .createQueryBuilder("s")
        .leftJoinAndSelect("s.user", "user")
        .leftJoinAndSelect("user.profile", "profile")
        .leftJoinAndSelect("s.institution", "institution")
        .orderBy("s.created_at", "DESC");
      if (institution_id) qb.andWhere("institution.id = :id", { id: institution_id });
      if (status) qb.andWhere("s.invitation_status = :st", { st: status });
      const list = await qb.getMany();
      return res.json({ success: true, data: list });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
