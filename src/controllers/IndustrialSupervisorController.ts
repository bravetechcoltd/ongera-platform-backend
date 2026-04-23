// @ts-nocheck
import { Request, Response } from "express";
import { In } from "typeorm";
import crypto from "crypto";
import dbConnection from "../database/db";
import { User, AccountType, InstitutionPortalRole } from "../database/models/User";
import {
  IndustrialSupervisor,
  SupervisorInvitationStatus,
} from "../database/models/IndustrialSupervisor";
import { InstructorStudent } from "../database/models/InstructorStudent";
import { InstitutionResearchProject } from "../database/models/InstitutionResearchProject";
import { sendEmail } from "../helpers/utils";

function buildInviteEmail(
  institutionName: string,
  inviterName: string,
  acceptUrl: string,
  expertise?: string,
  projects?: { title: string }[]
) {
  const projectList =
    projects && projects.length > 0
      ? `
        <div style="margin-top:18px; padding:14px; background:#f3f6fb; border:1px solid #d6e1f0; border-radius:8px;">
          <p style="margin:0 0 8px 0; font-weight:600; color:#0158B7;">Projects pre-assigned to you (${projects.length}):</p>
          <ul style="margin:0; padding-left:18px; color:#374151;">
            ${projects.map((p) => `<li>${p.title}</li>`).join("")}
          </ul>
          <p style="margin:8px 0 0 0; font-size:12px; color:#6b7280;">These will be linked to your account automatically once you accept.</p>
        </div>`
      : "";
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
        ${projectList}
        <p style="margin-top:18px;">
          <a href="${acceptUrl}" style="display:inline-block; background:#0158B7; color:#ffffff; padding:12px 22px; border-radius:6px; text-decoration:none; font-weight:600;">Accept Invitation</a>
        </p>
        <p style="color:#6b7280; font-size:13px;">This link is valid for 7 days.</p>
      </div>
    </div>
  `;
}

function buildAcceptedDigestEmail(institutionName: string, projects: { title: string }[]) {
  const list = projects.map((p) => `<li>${p.title}</li>`).join("");
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width:600px; margin:0 auto;">
      <div style="background:#0158B7; padding:20px; color:white; text-align:center;">
        <h2 style="margin:0;">Welcome — Project Assignments</h2>
      </div>
      <div style="padding:25px; background:#ffffff; border:1px solid #e5e7eb;">
        <p>Thank you for accepting the Industrial Supervisor role at <b>${institutionName}</b>.</p>
        <p>The following ${projects.length} project${projects.length === 1 ? " is" : "s are"} now linked to your account for advisory supervision:</p>
        <ul style="color:#374151;">${list}</ul>
        <p>Sign in to your Bwenge dashboard to review these projects. Your reviews are advisory and run independently of the instructor review.</p>
      </div>
    </div>
  `;
}

export class IndustrialSupervisorController {
  static async invite(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { user_id, expertise_area, organization, project_ids } = req.body;

      const userRepo = dbConnection.getRepository(User);
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);

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

let validatedProjects: InstitutionResearchProject[] = [];
if (Array.isArray(project_ids) && project_ids.length > 0) {
  const insRepo = dbConnection.getRepository(InstructorStudent);

  const candidates = await projectRepo.find({
    where: { id: In(project_ids) },
    relations: ["institution", "students"],
  });

  if (candidates.length !== project_ids.length) {
    return res.status(400).json({
      success: false,
      message: "Some selected projects do not exist",
    });
  }

  const portalLinks = await insRepo.find({
    where: { institution_id: institutionId, is_institution_portal_member: true },
    relations: ["student"],
  });
  const portalStudentIdSet = new Set(
    portalLinks.map((l) => l.student?.id).filter(Boolean)
  );

  // Mirror the visibility logic of listProjects: a project is in scope when
  // it is owned by this institution, or any of its students is a portal
  // member of this institution. Projects with a missing institution FK are
  // also accepted — they were surfaced to the institution via the portal
  // and selected from their own dashboard.
  validatedProjects = candidates.filter(
    (p) =>
      !p.institution ||
      p.institution.id === institutionId ||
      (p.students || []).some((s) => portalStudentIdSet.has(s.id))
  );

  if (validatedProjects.length === 0) {
    return res.status(400).json({
      success: false,
      message: "None of the selected projects belong to your institution",
    });
  }
}

      // Already invited?
      const existing = await supRepo.findOne({
        where: {
          user: { id: target.id },
          institution: { id: institutionId },
        },
      });

      // Eagerly persist supervisor membership on the User row so the
      // database reflects the assignment immediately — independent of
      // whether the supervisor has clicked the accept link yet.
      target.is_industrial_supervisor = true;
      target.is_institution_member = true;
      const targetInstIds = target.institution_ids || [];
      if (!targetInstIds.includes(institutionId)) {
        target.institution_ids = [...targetInstIds, institutionId];
      }
      const targetInsts = target.industrial_supervisor_institutions || [];
      if (!targetInsts.includes(institutionId)) {
        target.industrial_supervisor_institutions = [...targetInsts, institutionId];
      }
      if (target.institution_portal_role !== InstitutionPortalRole.INSTITUTION_ADMIN) {
        target.institution_portal_role = InstitutionPortalRole.INDUSTRIAL_SUPERVISOR;
      }
      await userRepo.save(target);

      // Eagerly attach the supervisor to each selected project's M2M and
      // propagate to InstructorStudent.industrial_supervisor_id so any
      // future project the student creates auto-attaches this supervisor.
      const insRepo = dbConnection.getRepository(InstructorStudent);
      const attachProjectsAndStudentLinks = async () => {
        for (const pid of validatedProjects.map((p) => p.id)) {
          const p = await projectRepo.findOne({
            where: { id: pid },
            relations: ["industrial_supervisors", "students"],
          });
          if (!p) continue;
          const already = (p.industrial_supervisors || []).some((s) => s.id === target.id);
          if (!already) {
            p.industrial_supervisors = [...(p.industrial_supervisors || []), target];
            await projectRepo.save(p);
          }
          for (const s of p.students || []) {
            const links = await insRepo.find({
              where: { student: { id: s.id } as any, institution_id: institutionId },
            });
            for (const l of links) {
              if (l.industrial_supervisor_id !== target.id) {
                l.has_industrial_supervisor = true;
                l.industrial_supervisor_id = target.id;
                l.assigned_by_institution_id = institutionId;
                await insRepo.save(l);
              }
            }
          }
        }
      };

      if (existing && existing.invitation_status === SupervisorInvitationStatus.ACCEPTED) {
        // Already accepted — attach selected projects to M2M (idempotent)
        if (validatedProjects.length > 0) {
          await attachProjectsAndStudentLinks();
          return res.json({
            success: true,
            message: "Projects assigned to existing supervisor",
            data: { invitation_id: existing.id, invitation_status: existing.invitation_status },
          });
        }
        return res.status(400).json({ success: false, message: "User already a supervisor for this institution" });
      }

      const token = crypto.randomBytes(24).toString("hex");
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const pendingIds = validatedProjects.map((p) => p.id);

      let invitation: IndustrialSupervisor;
      if (existing) {
        existing.invitation_status = SupervisorInvitationStatus.PENDING;
        existing.invitation_token = token;
        existing.invitation_expires_at = expires;
        existing.expertise_area = expertise_area || existing.expertise_area;
        existing.organization = organization || existing.organization;
        existing.pending_project_ids = pendingIds;
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
          pending_project_ids: pendingIds,
        });
        invitation = await supRepo.save(invitation);
      }

      // Pre-attach projects + student links so the data is consistent in
      // the DB even before the email link is clicked.
      if (validatedProjects.length > 0) {
        await attachProjectsAndStudentLinks();
      }

      const clientUrl = process.env.CLIENT_URL;
      const acceptUrl = `${clientUrl}/dashboard/user/institution-portal/supervisor-invitation/${token}`;
      const institutionName = institution.profile?.institution_name || `${institution.first_name} ${institution.last_name || ""}`;

      await sendEmail({
        to: target.email,
        subject: "Industrial Supervisor Invitation - Bwenge",
        html: buildInviteEmail(
          institutionName,
          institutionName,
          acceptUrl,
          expertise_area,
          validatedProjects.map((p) => ({ title: p.title }))
        ),
      });

      return res.status(201).json({
        success: true,
        message: "Invitation sent",
        data: {
          invitation_id: invitation.id,
          invitation_status: invitation.invitation_status,
          pending_project_count: pendingIds.length,
        },
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
        relations: ["user", "institution", "institution.profile"],
      });
      if (!inv) return res.status(404).json({ success: false, message: "Invitation not found" });

      // Only the invited user is allowed to accept the invitation.
      if (!req.user || req.user.userId !== inv.user.id) {
        return res.status(403).json({
          success: false,
          message: "This invitation does not belong to you",
        });
      }

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

      const u = inv.user;
      u.is_industrial_supervisor = true;
      u.is_institution_member = true;
      const inst = inv.institution.id;
      const uInstIds = u.institution_ids || [];
      if (!uInstIds.includes(inst)) {
        u.institution_ids = [...uInstIds, inst];
      }
      const current = u.industrial_supervisor_institutions || [];
      if (!current.includes(inst)) current.push(inst);
      u.industrial_supervisor_institutions = current;
      // Don't downgrade an existing INSTITUTION_ADMIN portal role
      if (u.institution_portal_role !== InstitutionPortalRole.INSTITUTION_ADMIN) {
        u.institution_portal_role = InstitutionPortalRole.INDUSTRIAL_SUPERVISOR;
      }
      await userRepo.save(u);

      // Apply any project assignments selected at invite time. The invite
      // path already eagerly attaches these to the M2M and propagates
      // InstructorStudent FKs, so this is idempotent — but it also
      // backfills legacy invitations created before that change.
      const pendingIds = inv.pending_project_ids || [];
      const attachedProjects: InstitutionResearchProject[] = [];
      if (pendingIds.length > 0) {
        const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
        const insRepo = dbConnection.getRepository(InstructorStudent);
        const projects = await projectRepo.find({
          where: { id: In(pendingIds) },
          relations: ["industrial_supervisors", "institution", "students"],
        });
        for (const p of projects) {
          // Safety: only attach to projects that still belong to the same institution
          if (p.institution?.id !== inst) continue;
          const already = (p.industrial_supervisors || []).some((s) => s.id === u.id);
          if (!already) {
            p.industrial_supervisors = [...(p.industrial_supervisors || []), u];
            await projectRepo.save(p);
          }
          for (const s of p.students || []) {
            const links = await insRepo.find({
              where: { student: { id: s.id } as any, institution_id: inst },
            });
            for (const l of links) {
              if (l.industrial_supervisor_id !== u.id) {
                l.has_industrial_supervisor = true;
                l.industrial_supervisor_id = u.id;
                l.assigned_by_institution_id = inst;
                await insRepo.save(l);
              }
            }
          }
          attachedProjects.push(p);
        }
        // Clear pending list once applied
        inv.pending_project_ids = [];
      }

      await supRepo.save(inv);

      // Send digest email if there were any pre-assigned projects
      if (attachedProjects.length > 0) {
        try {
          const institutionName =
            inv.institution.profile?.institution_name ||
            `${inv.institution.first_name || ""} ${inv.institution.last_name || ""}`.trim() ||
            "your institution";
          await sendEmail({
            to: u.email,
            subject: `Your supervisor projects at ${institutionName}`,
            html: buildAcceptedDigestEmail(
              institutionName,
              attachedProjects.map((p) => ({ title: p.title }))
            ),
          });
        } catch (e) {
          console.error("Supervisor digest email failed:", e);
        }
      }

      return res.json({
        success: true,
        message: "Invitation accepted",
        data: { ...inv, attached_project_count: attachedProjects.length },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Returns all non-expired PENDING supervisor invitations for the
  // authenticated user, shaped for the dashboard banner.
  static async myPendingInvitations(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const rows = await supRepo.find({
        where: {
          user: { id: userId } as any,
          invitation_status: SupervisorInvitationStatus.PENDING,
        },
        relations: ["institution", "institution.profile"],
        order: { created_at: "DESC" },
      });
      const now = new Date();
      const data = rows
        .filter((r) => !r.invitation_expires_at || r.invitation_expires_at > now)
        .map((r) => ({
          invitation_id: r.id,
          token: r.invitation_token,
          expires_at: r.invitation_expires_at,
          expertise_area: r.expertise_area || null,
          organization: r.organization || null,
          pending_project_count: Array.isArray(r.pending_project_ids)
            ? r.pending_project_ids.length
            : 0,
          institution: {
            id: r.institution?.id,
            name:
              r.institution?.profile?.institution_name ||
              [r.institution?.first_name, r.institution?.last_name]
                .filter(Boolean)
                .join(" ") ||
              null,
            logo_url: r.institution?.profile_picture_url || null,
            email: r.institution?.email || null,
          },
        }));
      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async listSupervisors(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);

      const list = await supRepo.find({
        where: { institution: { id: institutionId } as any },
        relations: ["user", "user.profile"],
        order: { created_at: "DESC" },
      });

      // Resolve pending_project_ids to lightweight {id,title} entries so the
      // institution can see which projects each pending invite will be linked
      // to upon acceptance.
      const allPendingIds = Array.from(
        new Set(
          list.flatMap((s) => Array.isArray(s.pending_project_ids) ? s.pending_project_ids : [])
        )
      );
      let pendingMap: Record<string, { id: string; title: string }> = {};
      if (allPendingIds.length > 0) {
        const projects = await projectRepo.find({
          where: { id: In(allPendingIds) },
          select: ["id", "title"],
        });
        pendingMap = projects.reduce((acc, p) => {
          acc[p.id] = { id: p.id, title: p.title };
          return acc;
        }, {} as Record<string, { id: string; title: string }>);
      }

      const enriched = list.map((s) => ({
        ...s,
        pending_projects: (s.pending_project_ids || [])
          .map((id) => pendingMap[id])
          .filter(Boolean),
      }));

      return res.json({ success: true, data: enriched });
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
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const insRepo = dbConnection.getRepository(InstructorStudent);

      const inv = await supRepo.findOne({
        where: { id: supervisorId, institution: { id: institutionId } as any },
        relations: ["user", "institution"],
      });
      if (!inv) return res.status(404).json({ success: false, message: "Invitation not found" });

      inv.invitation_status = SupervisorInvitationStatus.REVOKED;
      inv.is_active = false;
      await supRepo.save(inv);

      const u = inv.user;

      // Detach this supervisor from all M2M project rows owned by this
      // institution and clear InstructorStudent FK rows scoped to this
      // institution. Other institutions' assignments remain untouched.
      const projects = await projectRepo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.industrial_supervisors", "supervisors")
        .leftJoinAndSelect("p.institution", "institution")
        .where("supervisors.id = :uid", { uid: u.id })
        .andWhere("institution.id = :instId", { instId: institutionId })
        .getMany();
      for (const p of projects) {
        p.industrial_supervisors = (p.industrial_supervisors || []).filter((s) => s.id !== u.id);
        await projectRepo.save(p);
      }
      const studentLinks = await insRepo.find({
        where: { industrial_supervisor_id: u.id, institution_id: institutionId },
      });
      for (const l of studentLinks) {
        l.has_industrial_supervisor = false;
        l.industrial_supervisor_id = null;
        l.assigned_by_institution_id = null;
        await insRepo.save(l);
      }

      const list = (u.industrial_supervisor_institutions || []).filter((i) => i !== institutionId);
      u.industrial_supervisor_institutions = list;
      if (list.length === 0) {
        u.is_industrial_supervisor = false;
        if (u.institution_portal_role === InstitutionPortalRole.INDUSTRIAL_SUPERVISOR) {
          u.institution_portal_role = null;
        }
      }
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
      const userRepo = dbConnection.getRepository(User);

      const inv = await supRepo.findOne({
        where: {
          user: { id: supervisor_id } as any,
          institution: { id: institutionId } as any,
          invitation_status: SupervisorInvitationStatus.ACCEPTED,
          is_active: true,
        },
        relations: ["user"],
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

      // Keep the supervisor's User row consistent with the assignment
      const supUser = inv.user;
      if (supUser) {
        let dirty = false;
        if (!supUser.is_industrial_supervisor) {
          supUser.is_industrial_supervisor = true;
          dirty = true;
        }
        const insts = supUser.industrial_supervisor_institutions || [];
        if (!insts.includes(institutionId)) {
          supUser.industrial_supervisor_institutions = [...insts, institutionId];
          dirty = true;
        }
        if (
          !supUser.institution_portal_role &&
          supUser.institution_portal_role !== InstitutionPortalRole.INSTITUTION_ADMIN
        ) {
          supUser.institution_portal_role = InstitutionPortalRole.INDUSTRIAL_SUPERVISOR;
          dirty = true;
        }
        if (dirty) await userRepo.save(supUser);
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
