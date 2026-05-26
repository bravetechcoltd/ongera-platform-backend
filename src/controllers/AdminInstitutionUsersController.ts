// @ts-nocheck
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import dbConnection from "../database/db";
import {
  User,
  AccountType,
  BwengeRole,
  InstitutionRole,
  InstitutionPortalRole,
  ApplicationStatus,
} from "../database/models/User";
import { UserProfile } from "../database/models/UserProfile";
import { ResearchProject } from "../database/models/ResearchProject";
import { InstitutionResearchProject } from "../database/models/InstitutionResearchProject";
import {
  IndustrialSupervisor,
  SupervisorInvitationStatus,
} from "../database/models/IndustrialSupervisor";
import { InstructorStudent } from "../database/models/InstructorStudent";
import {
  sendAccountActivatedEmail,
  sendAccountRejectedEmail,
  sendInstitutionCredentials,
} from "../services/emailTemplates";

function generateTemporaryPassword(length: number = 12): string {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Shape a User row + its profile + footprint counts for the admin list.
async function shapeInstitution(u: User, counts?: any) {
  return {
    id: u.id,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    phone_number: u.phone_number,
    country: u.country,
    city: u.city,
    date_joined: u.date_joined,
    applied_at: u.applied_at,
    is_active: u.is_active,
    is_verified: u.is_verified,
    application_status: u.application_status,
    rejection_reason: u.rejection_reason,
    bwenge_role: u.bwenge_role,
    institution_role: u.institution_role,
    institution_portal_role: u.institution_portal_role,
    is_institution_member: u.is_institution_member,
    is_industrial_supervisor: u.is_industrial_supervisor,
    has_portal_access:
      !!u.institution_portal_role ||
      !!u.is_industrial_supervisor ||
      !!u.is_institution_member ||
      u.account_type === AccountType.INSTITUTION,
    is_portal_admin:
      u.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN,
    profile: u.profile
      ? {
          institution_name: (u.profile as any).institution_name,
          institution_type: (u.profile as any).institution_type,
          institution_address: (u.profile as any).institution_address,
          institution_phone: (u.profile as any).institution_phone,
          institution_website: (u.profile as any).institution_website,
          institution_description: (u.profile as any).institution_description,
          logo_url: (u.profile as any).logo_url,
          linkedin_url: (u.profile as any).linkedin_url,
        }
      : null,
    counts: counts || null,
  };
}

export class AdminInstitutionUsersController {
  /**
   * GET /api/admin/institutions
   * Paginated list of users with account_type = Institution.
   * Filters: status (pending|approved|rejected|active|suspended|portal_admin|all),
   *          search (free-text on name/email/profile.institution_name).
   * Each row carries lightweight footprint counts.
   */
  static async list(req: Request, res: Response) {
    try {
      const { status = "all", search = "", page = "1", limit = "20" } = req.query as any;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const userRepo = dbConnection.getRepository(User);
      const qb = userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("user.account_type = :acc", { acc: AccountType.INSTITUTION })
        .orderBy("user.date_joined", "DESC");

      switch (status) {
        case "pending":
          qb.andWhere("user.application_status = :s", { s: ApplicationStatus.PENDING });
          break;
        case "approved":
          qb.andWhere("user.application_status = :s", { s: ApplicationStatus.APPROVED });
          break;
        case "rejected":
          qb.andWhere("user.application_status = :s", { s: ApplicationStatus.REJECTED });
          break;
        case "active":
          qb.andWhere("user.is_active = TRUE");
          break;
        case "suspended":
          qb.andWhere("user.is_active = FALSE");
          break;
        case "portal_admin":
          qb.andWhere("user.institution_portal_role = :r", {
            r: InstitutionPortalRole.INSTITUTION_ADMIN,
          });
          break;
        case "all":
        default:
          break;
      }

      if (search && String(search).trim()) {
        const s = `%${String(search).trim()}%`;
        qb.andWhere(
          "(user.first_name ILIKE :s OR user.last_name ILIKE :s OR user.email ILIKE :s OR profile.institution_name ILIKE :s)",
          { s }
        );
      }

      const [rows, total] = await qb.skip(offset).take(limitNum).getManyAndCount();

      // Footprint counts (per institution). We do this best-effort and tolerate
      // legacy data that uses profile.institution_name instead of FK linkage.
      const institutionResearchRepo = dbConnection.getRepository(InstitutionResearchProject);
      const supervisorRepo = dbConnection.getRepository(IndustrialSupervisor);
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const linkRepo = dbConnection.getRepository(InstructorStudent);

      const data = await Promise.all(
        rows.map(async (u) => {
          const institutionName =
            (u.profile as any)?.institution_name || u.first_name || "";

          const [suCount, instProjCount, fkStudents, fkInstructors, regProjCount] =
            await Promise.all([
              supervisorRepo.count({ where: { institution: { id: u.id } as any } }),
              institutionResearchRepo.count({ where: { institution: { id: u.id } as any } }),
              linkRepo.count({
                where: { institution_id: u.id, is_institution_portal_member: true } as any,
              }),
              userRepo
                .createQueryBuilder("u2")
                .leftJoin("u2.profile", "p2")
                .where("u2.is_institution_member = TRUE")
                .andWhere("u2.institution_role = :r", { r: InstitutionRole.INSTRUCTOR })
                .andWhere("u2.institution_ids LIKE :id", { id: `%${u.id}%` })
                .getCount()
                .catch(() => 0),
              projectRepo
                .createQueryBuilder("p")
                .leftJoin("p.author", "author")
                .leftJoin("author.profile", "ap")
                .where("ap.institution_name = :n", { n: institutionName })
                .getCount()
                .catch(() => 0),
            ]);

          const counts = {
            instructors: fkInstructors || 0,
            students: fkStudents || 0,
            industrial_supervisors: suCount || 0,
            institution_projects: instProjCount || 0,
            community_projects: regProjCount || 0,
          };
          return shapeInstitution(u, counts);
        })
      );

      return res.json({
        success: true,
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to list institution users",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/admin/institutions/:id
   * Full detail with profile, status flags, footprint, recent activity.
   */
  static async detail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userRepo = dbConnection.getRepository(User);
      const user = await userRepo.findOne({
        where: { id, account_type: AccountType.INSTITUTION },
        relations: ["profile"],
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "Institution account not found" });
      }

      const supervisorRepo = dbConnection.getRepository(IndustrialSupervisor);
      const instResearchRepo = dbConnection.getRepository(InstitutionResearchProject);
      const linkRepo = dbConnection.getRepository(InstructorStudent);

      const [supervisors, supervisorsPending, instProjects, fkStudents, fkInstructors] =
        await Promise.all([
          supervisorRepo.count({
            where: {
              institution: { id } as any,
              invitation_status: SupervisorInvitationStatus.ACCEPTED,
            },
          }),
          supervisorRepo.count({
            where: {
              institution: { id } as any,
              invitation_status: SupervisorInvitationStatus.PENDING,
            },
          }),
          instResearchRepo.count({ where: { institution: { id } as any } }),
          linkRepo.count({
            where: { institution_id: id, is_institution_portal_member: true } as any,
          }),
          userRepo
            .createQueryBuilder("u")
            .where("u.is_institution_member = TRUE")
            .andWhere("u.institution_role = :r", { r: InstitutionRole.INSTRUCTOR })
            .andWhere("u.institution_ids LIKE :id", { id: `%${id}%` })
            .getCount(),
        ]);

      const counts = {
        instructors: fkInstructors,
        students: fkStudents,
        industrial_supervisors: supervisors,
        pending_supervisor_invitations: supervisorsPending,
        institution_projects: instProjects,
      };

      const data = await shapeInstitution(user, counts);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch institution detail",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/admin/institutions/:id/approve
   * Marks application APPROVED and equips the user to drive the portal:
   *   is_active = true, is_verified = true,
   *   institution_portal_role = INSTITUTION_ADMIN,
   *   is_institution_member = true,
   *   institution_ids contains self,
   *   bwenge_role = INSTITUTION_ADMIN (only if currently null).
   */
  static async approve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userRepo = dbConnection.getRepository(User);
      const target = await userRepo.findOne({
        where: { id, account_type: AccountType.INSTITUTION },
        relations: ["profile"],
      });
      if (!target) {
        return res
          .status(404)
          .json({ success: false, message: "Institution account not found" });
      }

      const ids = Array.isArray(target.institution_ids) ? [...target.institution_ids] : [];
      if (!ids.includes(target.id)) ids.push(target.id);

      target.is_active = true;
      target.is_verified = true;
      target.application_status = ApplicationStatus.APPROVED;
      target.rejection_reason = null as any;
      target.institution_portal_role = InstitutionPortalRole.INSTITUTION_ADMIN;
      target.is_institution_member = true;
      target.institution_ids = ids;
      target.primary_institution_id = target.primary_institution_id || target.id;
      target.institution_role = target.institution_role || InstitutionRole.ADMIN;
      if (!target.bwenge_role) target.bwenge_role = BwengeRole.INSTITUTION_ADMIN;

      await userRepo.save(target);

      try {
        await sendAccountActivatedEmail(target.email, target.first_name, target.last_name);
      } catch (_) {}

      return res.json({
        success: true,
        message: `Institution ${target.first_name} ${target.last_name} approved and portal access granted.`,
        data: await shapeInstitution(target),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to approve institution",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/admin/institutions/:id/reject
   * Marks application REJECTED, deactivates, stores reason.
   */
  static async reject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const userRepo = dbConnection.getRepository(User);
      const target = await userRepo.findOne({
        where: { id, account_type: AccountType.INSTITUTION },
        relations: ["profile"],
      });
      if (!target) {
        return res
          .status(404)
          .json({ success: false, message: "Institution account not found" });
      }

      target.application_status = ApplicationStatus.REJECTED;
      target.is_active = false;
      target.rejection_reason = reason || null;
      await userRepo.save(target);

      try {
        await sendAccountRejectedEmail(
          target.email,
          target.first_name,
          target.last_name,
          reason
        );
      } catch (_) {}

      return res.json({
        success: true,
        message: "Institution application rejected.",
        data: await shapeInstitution(target),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to reject institution",
        error: error.message,
      });
    }
  }

  /**
   * PATCH /api/admin/institutions/:id/portal-access
   * Body: { grant: boolean }
   * grant=true  -> institution_portal_role = INSTITUTION_ADMIN, is_institution_member=true
   * grant=false -> clears institution_portal_role and institution_role; user can still
   *                exist as Institution-type but won't drive the portal until re-granted.
   */
  static async setPortalAccess(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { grant } = req.body || {};
      if (typeof grant !== "boolean") {
        return res
          .status(400)
          .json({ success: false, message: "Body must include boolean 'grant'." });
      }
      const userRepo = dbConnection.getRepository(User);
      const target = await userRepo.findOne({
        where: { id, account_type: AccountType.INSTITUTION },
        relations: ["profile"],
      });
      if (!target) {
        return res
          .status(404)
          .json({ success: false, message: "Institution account not found" });
      }

      if (grant) {
        target.institution_portal_role = InstitutionPortalRole.INSTITUTION_ADMIN;
        target.is_institution_member = true;
        if (!target.bwenge_role) target.bwenge_role = BwengeRole.INSTITUTION_ADMIN;
        const ids = Array.isArray(target.institution_ids) ? [...target.institution_ids] : [];
        if (!ids.includes(target.id)) ids.push(target.id);
        target.institution_ids = ids;
        target.primary_institution_id = target.primary_institution_id || target.id;
      } else {
        target.institution_portal_role = null as any;
      }

      await userRepo.save(target);
      return res.json({
        success: true,
        message: grant ? "Portal access granted." : "Portal access revoked.",
        data: await shapeInstitution(target),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to update portal access",
        error: error.message,
      });
    }
  }

  /**
   * PATCH /api/admin/institutions/:id/suspend
   * Body: { suspend: boolean }
   */
  static async setSuspension(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { suspend } = req.body || {};
      if (typeof suspend !== "boolean") {
        return res
          .status(400)
          .json({ success: false, message: "Body must include boolean 'suspend'." });
      }
      const userRepo = dbConnection.getRepository(User);
      const target = await userRepo.findOne({
        where: { id, account_type: AccountType.INSTITUTION },
        relations: ["profile"],
      });
      if (!target) {
        return res
          .status(404)
          .json({ success: false, message: "Institution account not found" });
      }
      target.is_active = !suspend;
      await userRepo.save(target);
      return res.json({
        success: true,
        message: suspend ? "Institution suspended." : "Institution reactivated.",
        data: await shapeInstitution(target),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to update suspension",
        error: error.message,
      });
    }
  }

  /**
   * GET /api/admin/institutions/stats/overview
   */
  static async statsOverview(_req: Request, res: Response) {
    try {
      const userRepo = dbConnection.getRepository(User);
      const base = () =>
        userRepo
          .createQueryBuilder("u")
          .where("u.account_type = :a", { a: AccountType.INSTITUTION });

      const [total, pending, approved, rejected, active, suspended, portalAdmins] =
        await Promise.all([
          base().getCount(),
          base().andWhere("u.application_status = :s", { s: ApplicationStatus.PENDING }).getCount(),
          base().andWhere("u.application_status = :s", { s: ApplicationStatus.APPROVED }).getCount(),
          base().andWhere("u.application_status = :s", { s: ApplicationStatus.REJECTED }).getCount(),
          base().andWhere("u.is_active = TRUE").getCount(),
          base().andWhere("u.is_active = FALSE").getCount(),
          base()
            .andWhere("u.institution_portal_role = :r", {
              r: InstitutionPortalRole.INSTITUTION_ADMIN,
            })
            .getCount(),
        ]);

      return res.json({
        success: true,
        data: {
          total,
          pending,
          approved,
          rejected,
          active,
          suspended,
          portal_admins: portalAdmins,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to load stats",
        error: error.message,
      });
    }
  }

  /**
   * POST /api/admin/institutions
   * Admin creates a brand-new Institution Portal account.
   * - Generates a temporary password and emails the credentials.
   * - Account is born APPROVED and ready to drive its portal
   *   (institution_portal_role = INSTITUTION_ADMIN).
   */
  static async createInstitution(req: Request, res: Response) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone_number,
        institution_name,
        institution_type,
        institution_address,
        institution_phone,
        institution_website,
        institution_description,
      } = req.body || {};

      if (!first_name || !last_name || !email || !institution_name) {
        return res.status(400).json({
          success: false,
          message:
            "first_name, last_name, email and institution_name are required",
        });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid email format" });
      }

      const userRepo = dbConnection.getRepository(User);
      const profileRepo = dbConnection.getRepository(UserProfile);

      const exists = await userRepo.findOne({ where: { email: normalizedEmail } });
      if (exists) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      const tempPassword = generateTemporaryPassword(12);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const user = userRepo.create({
        first_name: String(first_name).trim(),
        last_name: String(last_name).trim(),
        email: normalizedEmail,
        phone_number: phone_number || null,
        password_hash: passwordHash,
        account_type: AccountType.INSTITUTION,
        is_active: true,
        is_verified: true,
        application_status: ApplicationStatus.APPROVED,
        applied_at: new Date(),
        bwenge_role: BwengeRole.INSTITUTION_ADMIN,
        institution_role: InstitutionRole.ADMIN,
        institution_portal_role: InstitutionPortalRole.INSTITUTION_ADMIN,
        is_institution_member: true,
      } as Partial<User>);

      const savedUser = await userRepo.save(user);
      // Now that the id exists, wire the self-membership pointers.
      savedUser.institution_ids = [savedUser.id];
      savedUser.primary_institution_id = savedUser.id;
      await userRepo.save(savedUser);

      const profile = profileRepo.create({
        user: { id: savedUser.id } as any,
        institution_name: String(institution_name).trim(),
        institution_type: institution_type || null,
        institution_address: institution_address || null,
        institution_phone: institution_phone || phone_number || null,
        institution_website: institution_website || null,
        institution_description: institution_description || null,
      } as Partial<UserProfile>);
      await profileRepo.save(profile);

      try {
        await sendInstitutionCredentials(
          savedUser.email,
          savedUser.first_name,
          savedUser.last_name,
          tempPassword,
          String(institution_name).trim()
        );
      } catch (_) {
        // Email failure must not break account creation; admin can resend.
      }

      const reloaded = await userRepo.findOne({
        where: { id: savedUser.id },
        relations: ["profile"],
      });

      return res.status(201).json({
        success: true,
        message:
          "Institution account created. Login credentials have been emailed.",
        data: await shapeInstitution(reloaded!, {
          instructors: 0,
          students: 0,
          industrial_supervisors: 0,
          institution_projects: 0,
          community_projects: 0,
        }),
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to create institution account",
        error: error.message,
      });
    }
  }
}
