// @ts-nocheck
import { Request, Response } from "express";
import { In } from "typeorm";
import dbConnection from "../database/db";
import { User, AccountType, InstitutionPortalRole } from "../database/models/User";
import {
  InstitutionResearchProject,
  InstitutionProjectType,
  AcademicSemester,
  InstitutionProjectStatus,
  InstitutionPublishVisibility,
} from "../database/models/InstitutionResearchProject";
import { InstitutionProjectFile } from "../database/models/InstitutionProjectFile";
import {
  InstitutionProjectReview,
  InstitutionReviewerRole,
  InstitutionReviewAction,
  InstitutionReviewStage,
} from "../database/models/InstitutionProjectReview";
import {
  InstitutionProjectActivity,
  InstitutionActivityType,
} from "../database/models/InstitutionProjectActivity";
import { InstructorStudent } from "../database/models/InstructorStudent";
import { IndustrialSupervisor } from "../database/models/IndustrialSupervisor";
import {
  ResearchProject,
  ProjectStatus,
  Visibility,
  ResearchType,
  AcademicLevel,
} from "../database/models/ResearchProject";
import { UploadToCloud } from "../helpers/cloud";
import { sendEmail } from "../helpers/utils";

// ---------- Helpers ----------

async function logActivity(
  projectId: string,
  actorId: string | null,
  actionType: InstitutionActivityType,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    const repo = dbConnection.getRepository(InstitutionProjectActivity);
    const activity = repo.create({
      project: { id: projectId } as any,
      actor: actorId ? ({ id: actorId } as any) : null,
      action_type: actionType,
      description,
      metadata: metadata || null,
    });
    await repo.save(activity);
  } catch (err) {
    console.error("Failed to log institution activity:", err);
  }
}

async function notifyUsers(users: User[], subject: string, htmlBody: string) {
  const unique = new Map<string, User>();
  (users || []).forEach((u) => {
    if (u && u.email) unique.set(u.id, u);
  });
  for (const u of unique.values()) {
    try {
      await sendEmail({ to: u.email, subject, html: htmlBody });
    } catch (e) {
      console.error("Email send failed:", e);
    }
  }
}

function buildEmail(title: string, message: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0158B7; padding: 20px; color: white; text-align: center;">
        <h2 style="margin:0;">Bwenge Institution Research Portal</h2>
      </div>
      <div style="padding: 25px; background: #ffffff; border: 1px solid #e5e7eb;">
        <h3 style="color:#111827; margin-top:0;">${title}</h3>
        <div style="color:#374151; line-height:1.6; font-size:15px;">${message}</div>
      </div>
      <div style="padding:15px; background:#f9fafb; color:#6b7280; font-size:12px; text-align:center;">
        Bwenge Platform · Institution Research Portal
      </div>
    </div>
  `;
}

/**
 * Returns true when the given caller is allowed to read the project.
 *
 * Access is granted when the caller is:
 *   1. The institution account that owns the project (account_type = INSTITUTION and id matches)
 *   2. An institution-portal admin whose primary_institution_id or institution_ids array
 *      contains the owning institution's id
 *   3. Explicitly assigned as a student, instructor, or industrial supervisor on the project
 *
 * The caller object is optional for backward-compat; when omitted only rule 1 and 3 apply.
 */
async function canUserSeeProject(
  userId: string,
  project: InstitutionResearchProject,
  caller?: User | null
): Promise<boolean> {
  if (!project) return false;

  // Rule 1 – Institution account that owns the project via FK
  if (project.institution?.id === userId) return true;

  // Rule 3 – Explicit role assignment on the project
  if ((project.students || []).some((s) => s.id === userId)) return true;
  if ((project.instructors || []).some((i) => i.id === userId)) return true;
  if ((project.industrial_supervisors || []).some((s) => s.id === userId)) return true;

  // Rule 2 – Institution admin access (including when institution FK is null/mismatched)
  // Covers the case where a student's primary_institution_id differs from the project's
  // institution_id, so the FK is null or points elsewhere — but the student is registered
  // in this institution's portal.
  if (caller) {
    const isInstitutionAdmin =
      caller.account_type === AccountType.INSTITUTION ||
      caller.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN;

    if (isInstitutionAdmin) {
      // Determine which institution this caller administers
      const adminInstId =
        caller.account_type === AccountType.INSTITUTION
          ? caller.id  // the institution entity itself
          : caller.primary_institution_id || (caller.institution_ids || [])[0];

      if (adminInstId) {
        // Direct FK match
        if (project.institution?.id === adminInstId) return true;

        // Membership fallback: check if any student on the project is a
        // portal member of this institution
        const projectStudentIds = (project.students || []).map((s) => s.id).filter(Boolean);
        if (projectStudentIds.length > 0) {
          const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
          const matchCount = await instructorStudentRepo
            .createQueryBuilder("link")
            .where("link.institution_id = :instId", { instId: adminInstId })
            .andWhere("link.is_institution_portal_member = true")
            .andWhere("link.student_id IN (:...sids)", { sids: projectStudentIds })
            .getCount();
          if (matchCount > 0) return true;
        }
      }
    }
  }

  return false;
}

async function uploadFileIfPresent(file: any): Promise<string | null> {
  if (!file) return null;
  try {
    const uploaded = await UploadToCloud(file);
    return uploaded.secure_url;
  } catch (e) {
    console.error("Upload failed:", e);
    return null;
  }
}

// ---------- Controller ----------

export class InstitutionResearchController {
  // --- CREATE ---
  static async createProject(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const userRepo = dbConnection.getRepository(User);
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const fileRepo = dbConnection.getRepository(InstitutionProjectFile);
      const insRepo = dbConnection.getRepository(InstructorStudent);

      const creator = await userRepo.findOne({
        where: { id: userId },
        relations: ["profile"],
      });

      if (!creator) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const {
        title,
        abstract,
        full_description,
        project_type,
        field_of_study,
        academic_year,
        semester,
        keywords,
        doi,
        is_multi_student,
        max_students,
      } = req.body;

      if (!title || !abstract || !project_type) {
        return res.status(400).json({
          success: false,
          message: "title, abstract and project_type are required",
        });
      }

      if (!Object.values(InstitutionProjectType).includes(project_type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project_type. Must be BACHELORS, MASTERS_THESIS, DISSERTATION, or FUNDS",
        });
      }

      // Determine institution for this creator
      let institutionId: string | null = creator.primary_institution_id || null;
      if (!institutionId && creator.institution_ids && creator.institution_ids.length > 0) {
        institutionId = creator.institution_ids[0];
      }

      if (!institutionId) {
        return res.status(403).json({
          success: false,
          message: "You must be an institution member to create an institution research project",
        });
      }

      const institution = await userRepo.findOne({ where: { id: institutionId } });

      const files = (req.files as any) || {};
      const cover = files.cover_image?.[0];
      const main = files.project_file?.[0];
      const additional = files.additional_files || [];

      const cover_image_url = await uploadFileIfPresent(cover);
      const project_file_url = await uploadFileIfPresent(main);

      let kw: string[] = [];
      if (typeof keywords === "string") kw = keywords.split(",").map((k) => k.trim()).filter(Boolean);
      else if (Array.isArray(keywords)) kw = keywords;

      const project = projectRepo.create({
        title,
        abstract,
        full_description,
        project_type,
        field_of_study,
        academic_year,
        semester: semester && Object.values(AcademicSemester).includes(semester) ? semester : null,
        keywords: kw,
        doi,
        is_multi_student: is_multi_student === true || is_multi_student === "true",
        max_students: parseInt(max_students) || 1,
        cover_image_url,
        project_file_url,
        institution: institution as any,
        students: [creator],
        status: InstitutionProjectStatus.DRAFT,
      });

      // Auto-assign instructors: creator's linked instructors (if any)
      const instructorLinks = await insRepo.find({
        where: { student: { id: userId } },
        relations: ["instructor"],
      });
      const instructors = instructorLinks.map((l) => l.instructor).filter(Boolean);
      if (instructors.length) project.instructors = instructors;

      // Auto-assign industrial supervisors assigned to this student
      const supervisorIds = instructorLinks
        .filter((l) => l.industrial_supervisor_id)
        .map((l) => l.industrial_supervisor_id);
      if (supervisorIds.length) {
        const supervisors = await userRepo.find({ where: { id: In(supervisorIds) } });
        project.industrial_supervisors = supervisors;
      }

      const saved = await projectRepo.save(project);

      // Save additional files as version 1
      const allFiles = [
        ...(main ? [{ file: main, url: project_file_url }] : []),
        ...additional.map((f: any) => ({ file: f, url: null })),
      ];
      for (const f of allFiles) {
        const url = f.url || (await uploadFileIfPresent(f.file));
        if (!url) continue;
        const rec = fileRepo.create({
          project: saved,
          file_url: url,
          file_name: f.file.originalname,
          file_type: f.file.mimetype,
          file_size: f.file.size,
          uploaded_by: creator,
          file_version: 1,
          is_latest_version: true,
        });
        await fileRepo.save(rec);
      }

      await logActivity(saved.id, userId, InstitutionActivityType.CREATED, `Project '${saved.title}' created`);

      return res.status(201).json({
        success: true,
        message: "Institution research project created",
        data: saved,
      });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

static async listProjects(req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const userRepo = dbConnection.getRepository(User);
    const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
    const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

    const user = await userRepo.findOne({ where: { id: userId }, relations: ["profile"] });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { status, project_type, student_id, page = 1, limit = 20 } = req.query;
    const qb = projectRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.institution", "institution")
      .leftJoinAndSelect("p.students", "students")
      .leftJoinAndSelect("p.instructors", "instructors")
      .leftJoinAndSelect("p.industrial_supervisors", "supervisors")
      .leftJoinAndSelect("p.files", "files");

    // ── Role-based visibility ──────────────────────────────────────────────

    if (user.account_type === AccountType.INSTITUTION) {
      // The institution sees:
      //   (a) projects explicitly linked to it via institution_id FK
      //   (b) projects where any of its portal students appear in the students list
      // This covers the case where the project's institution_id points to a
      // different/deleted institution but the student belongs to this portal.
      const studentLinks = await instructorStudentRepo.find({
        where: { institution_id: userId, is_institution_portal_member: true },
        relations: ["student"],
      });
      const portalStudentIds = studentLinks
        .map((l) => l.student?.id)
        .filter(Boolean) as string[];

      if (portalStudentIds.length > 0) {
        qb.andWhere(
          "(institution.id = :instId OR students.id IN (:...sids))",
          { instId: userId, sids: portalStudentIds }
        );
      } else {
        qb.andWhere("institution.id = :instId", { instId: userId });
      }

    } else if (user.account_type === AccountType.ADMIN) {
      // Platform admin – full visibility (no extra filter)

    } else if (user.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN) {
      // A portal-admin user (non-Institution account type) — same breadth as above
      const instId = user.primary_institution_id || (user.institution_ids || [])[0];
      if (instId) {
        const studentLinks = await instructorStudentRepo.find({
          where: { institution_id: instId, is_institution_portal_member: true },
          relations: ["student"],
        });
        const portalStudentIds = studentLinks
          .map((l) => l.student?.id)
          .filter(Boolean) as string[];

        if (portalStudentIds.length > 0) {
          qb.andWhere(
            "(institution.id = :instId OR students.id IN (:...sids))",
            { instId, sids: portalStudentIds }
          );
        } else {
          qb.andWhere("institution.id = :instId", { instId });
        }
      } else {
        qb.andWhere("1 = 0");
      }

    } else if (user.is_industrial_supervisor) {
      qb.andWhere("supervisors.id = :uid", { uid: userId });

    } else {
      // Student or instructor – only explicitly assigned projects
      qb.andWhere(
        "(students.id = :uid OR instructors.id = :uid OR supervisors.id = :uid)",
        { uid: userId }
      );
    }

    if (status) qb.andWhere("p.status = :status", { status });
    if (project_type) qb.andWhere("p.project_type = :project_type", { project_type });
    if (student_id) qb.andWhere("students.id = :student_id", { student_id });

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    qb.orderBy("p.created_at", "DESC").skip(skip).take(parseInt(limit as string));

    const [projects, total] = await qb.getManyAndCount();

    return res.json({
      success: true,
      data: {
        projects,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
  static async getProject(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const userRepo = dbConnection.getRepository(User);

      // Load project and caller in parallel
      const [project, caller] = await Promise.all([
        projectRepo.findOne({
          where: { id },
          relations: [
            "institution",
            "students",
            "instructors",
            "industrial_supervisors",
            "files",
            "files.uploaded_by",
            "reviews",
            "reviews.reviewer",
            "comments",
            "comments.author",
            "activities",
            "activities.actor",
          ],
        }),
        userRepo.findOne({ where: { id: userId } }),
      ]);

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const allowed = await canUserSeeProject(userId, project, caller);
      if (!allowed) {
        return res.status(403).json({ success: false, message: "You do not have access to this project" });
      }

      project.view_count += 1;
      await projectRepo.save(project);

      return res.json({ success: true, data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- UPDATE / REWORK RESUBMIT ---
  static async updateProject(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const fileRepo = dbConnection.getRepository(InstitutionProjectFile);

      const project = await projectRepo.findOne({
        where: { id },
        relations: ["students", "instructors", "industrial_supervisors", "institution", "files"],
      });
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const isOwner = (project.students || []).some((s) => s.id === userId);
      if (!isOwner)
        return res.status(403).json({ success: false, message: "Only an assigned student can edit this project" });

      if (
        project.status !== InstitutionProjectStatus.DRAFT &&
        project.status !== InstitutionProjectStatus.REWORK_REQUESTED
      ) {
        return res.status(400).json({
          success: false,
          message: "Project cannot be edited in its current status",
        });
      }

      const wasRework = project.status === InstitutionProjectStatus.REWORK_REQUESTED;

      const fields = [
        "title", "abstract", "full_description", "project_type", "field_of_study",
        "academic_year", "semester", "doi", "is_multi_student", "max_students",
      ];
      for (const f of fields) {
        if (req.body[f] !== undefined) project[f] = req.body[f];
      }
      if (req.body.keywords !== undefined) {
        if (typeof req.body.keywords === "string") {
          project.keywords = req.body.keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(req.body.keywords)) {
          project.keywords = req.body.keywords;
        }
      }

      const files = (req.files as any) || {};
      const cover = files.cover_image?.[0];
      const main = files.project_file?.[0];
      const additional = files.additional_files || [];

      if (cover) {
        const url = await uploadFileIfPresent(cover);
        if (url) project.cover_image_url = url;
      }
      if (main) {
        await fileRepo.update({ project: { id } as any, is_latest_version: true }, { is_latest_version: false });
        const url = await uploadFileIfPresent(main);
        if (url) {
          project.project_file_url = url;
          const latest = await fileRepo.find({ where: { project: { id } as any }, order: { file_version: "DESC" } });
          const nextVersion = latest.length ? latest[0].file_version + 1 : 1;
          const rec = fileRepo.create({
            project,
            file_url: url,
            file_name: main.originalname,
            file_type: main.mimetype,
            file_size: main.size,
            uploaded_by: { id: userId } as any,
            file_version: nextVersion,
            is_latest_version: true,
          });
          await fileRepo.save(rec);
          await logActivity(id, userId, InstitutionActivityType.FILE_REPLACED, `Main file replaced — version ${nextVersion}`);
        }
      }

      for (const f of additional) {
        const url = await uploadFileIfPresent(f);
        if (url) {
          const rec = fileRepo.create({
            project,
            file_url: url,
            file_name: f.originalname,
            file_type: f.mimetype,
            file_size: f.size,
            uploaded_by: { id: userId } as any,
            file_version: 1,
            is_latest_version: true,
          });
          await fileRepo.save(rec);
          await logActivity(id, userId, InstitutionActivityType.FILE_UPLOADED, `Additional file added: ${f.originalname}`);
        }
      }

      if (wasRework) {
        const hasSupervisors = (project.industrial_supervisors || []).length > 0;

        project.status = hasSupervisors
          ? InstitutionProjectStatus.SUBMITTED
          : InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW;
        project.submission_date = new Date();
        project.rework_count += 1;
        await logActivity(
          id,
          userId,
          InstitutionActivityType.REWORK_SUBMITTED,
          hasSupervisors
            ? `Rework cycle #${project.rework_count} submitted`
            : `Rework cycle #${project.rework_count} submitted — forwarded directly to instructor review (no supervisor assigned)`
        );

        const reworkTargets = hasSupervisors
          ? [...(project.industrial_supervisors || []), ...(project.instructors || [])]
          : [...(project.instructors || [])];
        await notifyUsers(
          reworkTargets,
          "Rework submitted — please re-review",
          buildEmail(
            "Student has resubmitted after rework",
            `The student has addressed feedback and resubmitted '<b>${project.title}</b>'. Please review the updated version.`
          )
        );
      } else {
        await logActivity(id, userId, InstitutionActivityType.UPDATED, `Project updated`);
      }

      await projectRepo.save(project);

      return res.json({ success: true, message: "Project updated", data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- SUBMIT ---
  static async submitProject(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);

      const project = await projectRepo.findOne({
        where: { id },
        relations: ["students", "instructors", "industrial_supervisors", "files"],
      });
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const isOwner = (project.students || []).some((s) => s.id === userId);
      if (!isOwner) return res.status(403).json({ success: false, message: "Only owning student can submit" });

      if (project.status !== InstitutionProjectStatus.DRAFT) {
        return res.status(400).json({ success: false, message: "Only DRAFT projects can be submitted" });
      }

      if (!project.title || !project.abstract || !project.project_type) {
        return res.status(400).json({ success: false, message: "Missing required fields for submission" });
      }

      if (!project.files || project.files.length === 0) {
        return res.status(400).json({ success: false, message: "At least one file is required to submit" });
      }

      const hasSupervisors = (project.industrial_supervisors || []).length > 0;

      // Industrial supervisor stage is optional: when no supervisors are assigned,
      // skip Stage 2 and go directly to instructor review.
      project.status = hasSupervisors
        ? InstitutionProjectStatus.SUBMITTED
        : InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW;
      project.submission_date = new Date();
      await projectRepo.save(project);

      await logActivity(
        id,
        userId,
        InstitutionActivityType.SUBMITTED,
        hasSupervisors
          ? `Project submitted for review`
          : `Project submitted — no industrial supervisor assigned, forwarded directly to instructor review`
      );

      const targets = hasSupervisors
        ? [...(project.industrial_supervisors || []), ...(project.instructors || [])]
        : [...(project.instructors || [])];
      await notifyUsers(
        targets,
        hasSupervisors
          ? "New Institution Research Project Submitted"
          : "New Institution Research Project Awaiting Instructor Review",
        buildEmail(
          hasSupervisors ? "A new project awaits your review" : "A new project awaits instructor review",
          `A student has submitted '<b>${project.title}</b>'${
            hasSupervisors
              ? ` for your review`
              : ` for instructor review (no industrial supervisor was assigned to this project)`
          }. Please check the Institution Research Portal.`
        )
      );

      return res.json({ success: true, message: "Project submitted", data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- SUPERVISOR REVIEW (Stage 2) ---
  static async supervisorReview(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { action, feedback } = req.body;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const reviewRepo = dbConnection.getRepository(InstitutionProjectReview);

      if (!["APPROVED", "REWORK_REQUESTED", "REJECTED"].includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid action" });
      }

      const project = await projectRepo.findOne({
        where: { id },
        relations: ["students", "instructors", "industrial_supervisors", "institution"],
      });
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      // Supervisor-only gate: never widened — assigned supervisors only
      const isSupervisor = (project.industrial_supervisors || []).some((s) => s.id === userId);
      if (!isSupervisor) {
        return res.status(403).json({ success: false, message: "You are not an assigned supervisor" });
      }

      if (
        project.status !== InstitutionProjectStatus.SUBMITTED &&
        project.status !== InstitutionProjectStatus.UNDER_SUPERVISOR_REVIEW
      ) {
        return res.status(400).json({ success: false, message: "Project not in supervisor review stage" });
      }

      if ((action === "REWORK_REQUESTED" || action === "REJECTED") && (!feedback || feedback.trim().length < 10)) {
        return res.status(400).json({ success: false, message: "Detailed feedback required" });
      }

      const review = reviewRepo.create({
        project,
        reviewer: { id: userId } as any,
        reviewer_role: InstitutionReviewerRole.INDUSTRIAL_SUPERVISOR,
        action: action as InstitutionReviewAction,
        feedback,
        stage: InstitutionReviewStage.SUPERVISOR_STAGE,
        is_final: false,
      });
      await reviewRepo.save(review);

      if (action === "APPROVED") {
        project.status = InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW;
        await logActivity(id, userId, InstitutionActivityType.SUPERVISOR_APPROVED, `Supervisor approved — forwarded to instructor review`);
        await notifyUsers(
          [...(project.instructors || []), ...(project.students || [])],
          "Project approved by supervisor — now with instructor",
          buildEmail(
            "Stage 2 approved",
            `The industrial supervisor approved '<b>${project.title}</b>'. It has been forwarded to Stage 3 (instructor review).`
          )
        );
      } else if (action === "REWORK_REQUESTED") {
        project.status = InstitutionProjectStatus.REWORK_REQUESTED;
        project.rework_reason = feedback;
        project.requires_rework = true;
        await logActivity(id, userId, InstitutionActivityType.SUPERVISOR_REWORK, `Supervisor requested rework`);
        await notifyUsers(
          project.students || [],
          "Rework requested on your project",
          buildEmail(
            "Rework required",
            `The industrial supervisor has requested rework on '<b>${project.title}</b>'.<br/><br/><b>Reason:</b> ${feedback}`
          )
        );
      } else {
        project.status = InstitutionProjectStatus.REJECTED;
        project.rejection_reason = feedback;
        await logActivity(id, userId, InstitutionActivityType.SUPERVISOR_REJECTED, `Supervisor rejected project`);
        await notifyUsers(
          [...(project.students || []), ...(project.instructors || [])],
          "Project rejected by supervisor",
          buildEmail(
            "Project rejected",
            `'<b>${project.title}</b>' has been rejected.<br/><br/><b>Reason:</b> ${feedback}`
          )
        );
      }

      await projectRepo.save(project);
      return res.json({ success: true, message: "Supervisor review recorded", data: { project, review } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- INSTRUCTOR REVIEW (Stage 3) ---
  static async instructorReview(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { action, feedback } = req.body;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const reviewRepo = dbConnection.getRepository(InstitutionProjectReview);

      if (!["APPROVED", "REWORK_REQUESTED", "REJECTED"].includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid action" });
      }

      const project = await projectRepo.findOne({
        where: { id },
        relations: ["students", "instructors", "industrial_supervisors", "institution"],
      });
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      // Instructor-only gate: assigned instructors only — not widened
      const isInstructor = (project.instructors || []).some((i) => i.id === userId);
      if (!isInstructor) return res.status(403).json({ success: false, message: "You are not an assigned instructor" });

      const hasSupervisors = (project.industrial_supervisors || []).length > 0;

      const inInstructorStage = project.status === InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW;
      const submittedWithoutSupervisor =
        project.status === InstitutionProjectStatus.SUBMITTED && !hasSupervisors;

      if (!inInstructorStage && !submittedWithoutSupervisor) {
        return res.status(400).json({ success: false, message: "Project not in instructor review stage" });
      }

      // Normalise status so activity log and notifications are consistent.
      if (submittedWithoutSupervisor) {
        project.status = InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW;
      }

      if ((action === "REWORK_REQUESTED" || action === "REJECTED") && (!feedback || feedback.trim().length < 10)) {
        return res.status(400).json({ success: false, message: "Detailed feedback required" });
      }

      const review = reviewRepo.create({
        project,
        reviewer: { id: userId } as any,
        reviewer_role: InstitutionReviewerRole.INSTRUCTOR,
        action: action as InstitutionReviewAction,
        feedback,
        stage: InstitutionReviewStage.INSTRUCTOR_STAGE,
        is_final: false,
      });
      await reviewRepo.save(review);

      if (action === "APPROVED") {
        project.status = InstitutionProjectStatus.APPROVED;
        await logActivity(id, userId, InstitutionActivityType.INSTRUCTOR_APPROVED, `Instructor approved — awaiting institution publication`);
        await notifyUsers(
          [project.institution, ...(project.students || [])],
          "Project approved — awaiting publication decision",
          buildEmail(
            "Stage 3 approved",
            `The instructor approved '<b>${project.title}</b>'. It is now awaiting the institution admin's publication decision.`
          )
        );
      } else if (action === "REWORK_REQUESTED") {
        project.status = InstitutionProjectStatus.REWORK_REQUESTED;
        project.rework_reason = feedback;
        project.requires_rework = true;
        await logActivity(id, userId, InstitutionActivityType.INSTRUCTOR_REWORK, `Instructor requested rework`);
        await notifyUsers(
          project.students || [],
          "Instructor requested rework",
          buildEmail(
            "Rework required",
            `The instructor has requested rework on '<b>${project.title}</b>'.<br/><br/><b>Reason:</b> ${feedback}`
          )
        );
      } else {
        project.status = InstitutionProjectStatus.REJECTED;
        project.rejection_reason = feedback;
        await logActivity(id, userId, InstitutionActivityType.INSTRUCTOR_REJECTED, `Instructor rejected project`);
        await notifyUsers(
          [...(project.students || []), ...(project.industrial_supervisors || [])],
          "Project rejected by instructor",
          buildEmail(
            "Project rejected",
            `'<b>${project.title}</b>' has been rejected.<br/><br/><b>Reason:</b> ${feedback}`
          )
        );
      }

      await projectRepo.save(project);
      return res.json({ success: true, message: "Instructor review recorded", data: { project, review } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- PUBLISH (Stage 4 / Institution Admin) ---
  static async publishProject(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { action, visibility, notes } = req.body;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const reviewRepo = dbConnection.getRepository(InstitutionProjectReview);
      const researchRepo = dbConnection.getRepository(ResearchProject);
      const userRepo = dbConnection.getRepository(User);

      const [project, caller] = await Promise.all([
        projectRepo.findOne({
          where: { id },
          relations: ["students", "instructors", "industrial_supervisors", "institution"],
        }),
        userRepo.findOne({ where: { id: userId } }),
      ]);

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      // Publish gate: institution account that owns the project, OR an institution-portal
      // admin whose institution matches the owning institution.
      const isOwningInstitution = project.institution?.id === userId;
      const isInstitutionPortalAdmin =
        caller?.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN &&
        project.institution?.id &&
        (
          caller.primary_institution_id === project.institution.id ||
          (caller.institution_ids || []).includes(project.institution.id)
        );

      if (!isOwningInstitution && !isInstitutionPortalAdmin) {
        return res.status(403).json({ success: false, message: "Only the owning institution admin can publish" });
      }

      if (project.status !== InstitutionProjectStatus.APPROVED) {
        return res.status(400).json({ success: false, message: "Only APPROVED projects can be published" });
      }

      if (!["PUBLISH", "REJECT"].includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid action" });
      }

      if (action === "REJECT") {
        project.status = InstitutionProjectStatus.REJECTED;
        project.rejection_reason = notes || "Rejected at final publication stage";

        const review = reviewRepo.create({
          project,
          reviewer: { id: userId } as any,
          reviewer_role: InstitutionReviewerRole.INSTITUTION_ADMIN,
          action: InstitutionReviewAction.REJECTED,
          feedback: notes,
          stage: InstitutionReviewStage.INSTITUTION_STAGE,
          is_final: true,
        });
        await reviewRepo.save(review);

        await logActivity(id, userId, InstitutionActivityType.ADMIN_REJECTED, `Institution admin rejected project`);
        await notifyUsers(
          [...(project.students || []), ...(project.instructors || []), ...(project.industrial_supervisors || [])],
          "Project rejected at final stage",
          buildEmail(
            "Project rejected",
            `'<b>${project.title}</b>' was rejected by the institution admin.<br/><br/><b>Notes:</b> ${notes || "—"}`
          )
        );

        await projectRepo.save(project);
        return res.json({ success: true, message: "Project rejected", data: project });
      }

      // PUBLISH
      if (!visibility || !["INSTITUTION_ONLY", "PUBLIC"].includes(visibility)) {
        return res.status(400).json({
          success: false,
          message: "visibility must be INSTITUTION_ONLY or PUBLIC",
        });
      }

      project.status = InstitutionProjectStatus.PUBLISHED;
      project.visibility_after_publish = visibility as InstitutionPublishVisibility;
      project.publication_date = new Date();
      project.final_approval_date = new Date();

      const review = reviewRepo.create({
        project,
        reviewer: { id: userId } as any,
        reviewer_role: InstitutionReviewerRole.INSTITUTION_ADMIN,
        action:
          visibility === "PUBLIC"
            ? InstitutionReviewAction.PUBLISHED_PUBLIC
            : InstitutionReviewAction.PUBLISHED_PRIVATE,
        feedback: notes,
        stage: InstitutionReviewStage.INSTITUTION_STAGE,
        is_final: true,
      });
      await reviewRepo.save(review);

      await logActivity(
        id,
        userId,
        visibility === "PUBLIC" ? InstitutionActivityType.PUBLISHED_PUBLIC : InstitutionActivityType.PUBLISHED_PRIVATE,
        `Published as ${visibility}`
      );

      // If PUBLIC — create a linked read-only ResearchProject for public discoverability
      if (visibility === "PUBLIC") {
        try {
          const author = (project.students || [])[0];
          if (author) {
            const linked = researchRepo.create({
              author,
              title: project.title,
              abstract: project.abstract,
              full_description: project.full_description,
              project_file_url: project.project_file_url,
              cover_image_url: project.cover_image_url,
              status: ProjectStatus.PUBLISHED,
              visibility: Visibility.PUBLIC,
              field_of_study: project.field_of_study,
              doi: project.doi,
              publication_date: new Date(),
              research_type:
                project.project_type === InstitutionProjectType.FUNDS
                  ? ResearchType.PROJECT
                  : ResearchType.THESIS,
              academic_level:
                project.project_type === InstitutionProjectType.BACHELORS
                  ? AcademicLevel.UNDERGRADUATE
                  : project.project_type === InstitutionProjectType.MASTERS_THESIS
                  ? AcademicLevel.MASTERS
                  : project.project_type === InstitutionProjectType.DISSERTATION
                  ? AcademicLevel.PHD
                  : AcademicLevel.INSTITUTION,
            });
            await researchRepo.save(linked);
          }
        } catch (e) {
          console.error("Failed to create linked public ResearchProject:", e);
        }
      }

      await projectRepo.save(project);
      await notifyUsers(
        [...(project.students || []), ...(project.instructors || []), ...(project.industrial_supervisors || [])],
        visibility === "PUBLIC" ? "Project published publicly" : "Project published privately",
        buildEmail(
          "Project published",
          `Your research project '<b>${project.title}</b>' has been published as <b>${
            visibility === "PUBLIC" ? "PUBLIC (visible across Bwenge)" : "PRIVATE (institution space only)"
          }</b>.`
        )
      );

      return res.json({ success: true, message: "Project published", data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // --- ACTIVITY ---
  static async getActivity(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const actRepo = dbConnection.getRepository(InstitutionProjectActivity);
      const userRepo = dbConnection.getRepository(User);

      const [project, caller] = await Promise.all([
        projectRepo.findOne({
          where: { id },
          relations: ["students", "instructors", "industrial_supervisors", "institution"],
        }),
        userRepo.findOne({ where: { id: userId } }),
      ]);

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const allowed = await canUserSeeProject(userId, project, caller);
      if (!allowed) return res.status(403).json({ success: false, message: "No access" });

      const activities = await actRepo.find({
        where: { project: { id } as any },
        relations: ["actor"],
        order: { created_at: "DESC" },
      });

      return res.json({ success: true, data: activities });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

static async dashboard(req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const userRepo = dbConnection.getRepository(User);
    const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
    const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

    const user = await userRepo.findOne({ where: { id: userId }, relations: ["profile"] });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ── Shared helper: fetch all institution projects including portal-student projects ──
    const fetchInstitutionProjects = async (instId: string) => {
      const studentLinks = await instructorStudentRepo.find({
        where: { institution_id: instId, is_institution_portal_member: true },
        relations: ["student"],
      });
      const portalStudentIds = studentLinks
        .map((l) => l.student?.id)
        .filter(Boolean) as string[];

      const qb = projectRepo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.institution", "institution")
        .leftJoinAndSelect("p.students", "students")
        .leftJoinAndSelect("p.instructors", "instructors")
        .leftJoinAndSelect("p.industrial_supervisors", "supervisors");

      if (portalStudentIds.length > 0) {
        qb.where(
          "(institution.id = :instId OR students.id IN (:...sids))",
          { instId, sids: portalStudentIds }
        );
      } else {
        qb.where("institution.id = :instId", { instId });
      }

      return qb.getMany();
    };

    if (user.account_type === AccountType.INSTITUTION) {
      const all = await fetchInstitutionProjects(userId);

      const countByStatus: Record<string, number> = {};
      const countByType: Record<string, number> = {};
      all.forEach((p) => {
        countByStatus[p.status] = (countByStatus[p.status] || 0) + 1;
        countByType[p.project_type] = (countByType[p.project_type] || 0) + 1;
      });

      return res.json({
        success: true,
        data: {
          role: "INSTITUTION_ADMIN",
          total: all.length,
          countByStatus,
          countByType,
          awaitingPublication: all.filter((p) => p.status === InstitutionProjectStatus.APPROVED),
          pendingSupervisor: all.filter(
            (p) =>
              [InstitutionProjectStatus.SUBMITTED, InstitutionProjectStatus.UNDER_SUPERVISOR_REVIEW].includes(p.status) &&
              (p.industrial_supervisors || []).length > 0
          ).length,
          pendingInstructor: all.filter(
            (p) =>
              p.status === InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW ||
              (p.status === InstitutionProjectStatus.SUBMITTED &&
                (p.industrial_supervisors || []).length === 0)
          ).length,
        },
      });
    }

    // Institution-portal admin (non-Institution account type)
    if (user.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN) {
      const instId = user.primary_institution_id || (user.institution_ids || [])[0];
      const all = instId ? await fetchInstitutionProjects(instId) : [];

      const countByStatus: Record<string, number> = {};
      const countByType: Record<string, number> = {};
      all.forEach((p) => {
        countByStatus[p.status] = (countByStatus[p.status] || 0) + 1;
        countByType[p.project_type] = (countByType[p.project_type] || 0) + 1;
      });

      return res.json({
        success: true,
        data: {
          role: "INSTITUTION_ADMIN",
          total: all.length,
          countByStatus,
          countByType,
          awaitingPublication: all.filter((p) => p.status === InstitutionProjectStatus.APPROVED),
          pendingSupervisor: all.filter(
            (p) =>
              [InstitutionProjectStatus.SUBMITTED, InstitutionProjectStatus.UNDER_SUPERVISOR_REVIEW].includes(p.status) &&
              (p.industrial_supervisors || []).length > 0
          ).length,
          pendingInstructor: all.filter(
            (p) =>
              p.status === InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW ||
              (p.status === InstitutionProjectStatus.SUBMITTED &&
                (p.industrial_supervisors || []).length === 0)
          ).length,
        },
      });
    }

    if (user.is_industrial_supervisor) {
      const list = await projectRepo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.students", "students")
        .leftJoinAndSelect("p.industrial_supervisors", "supervisors")
        .where("supervisors.id = :uid", { uid: userId })
        .getMany();
      return res.json({
        success: true,
        data: {
          role: "INDUSTRIAL_SUPERVISOR",
          reviewQueue: list.filter((p) =>
            [InstitutionProjectStatus.SUBMITTED, InstitutionProjectStatus.UNDER_SUPERVISOR_REVIEW].includes(p.status)
          ),
          total: list.length,
        },
      });
    }

    // Student / instructor
    const asStudent = await projectRepo
      .createQueryBuilder("p")
      .leftJoinAndSelect("p.students", "students")
      .leftJoinAndSelect("p.instructors", "instructors")
      .leftJoinAndSelect("p.industrial_supervisors", "supervisors")
      .where("students.id = :uid", { uid: userId })
      .orWhere("instructors.id = :uid", { uid: userId })
      .getMany();

    const myStudent = asStudent.filter((p) => (p.students || []).some((s) => s.id === userId));
    const myInstructor = asStudent.filter((p) => (p.instructors || []).some((i) => i.id === userId));

    return res.json({
      success: true,
      data: {
        role: user.institution_portal_role || (myInstructor.length ? "INSTRUCTOR" : "STUDENT"),
        myProjects: myStudent,
        instructorQueue: myInstructor.filter((p) => p.status === InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW),
        allInstructorProjects: myInstructor,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
}