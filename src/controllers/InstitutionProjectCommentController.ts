// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from "../database/db";
import { User, AccountType, InstitutionPortalRole } from "../database/models/User";
import { InstitutionResearchProject } from "../database/models/InstitutionResearchProject";
import {
  InstitutionProjectComment,
  InstitutionCommentType,
  InstitutionCommentPriority,
} from "../database/models/InstitutionProjectComment";
import {
  InstitutionProjectActivity,
  InstitutionActivityType,
} from "../database/models/InstitutionProjectActivity";
import { InstructorStudent } from "../database/models/InstructorStudent";

async function canAccess(
  userId: string,
  project: InstitutionResearchProject,
  caller?: User | null
): Promise<boolean> {
  if (!project) return false;

  // Direct FK owner
  if (project.institution?.id === userId) return true;

  // Explicit role assignment
  if ((project.students || []).some((s) => s.id === userId)) return true;
  if ((project.instructors || []).some((i) => i.id === userId)) return true;
  if ((project.industrial_supervisors || []).some((s) => s.id === userId)) return true;

  // Institution admin / portal-admin with membership fallback
  // (mirrors the Rule 2 block in canUserSeeProject)
  if (caller) {
    const isInstitutionAdmin =
      caller.account_type === AccountType.INSTITUTION ||
      caller.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN;

    if (isInstitutionAdmin) {
      const adminInstId =
        caller.account_type === AccountType.INSTITUTION
          ? caller.id
          : caller.primary_institution_id || (caller.institution_ids || [])[0];

      if (adminInstId) {
        // Direct FK match
        if (project.institution?.id === adminInstId) return true;

        // Portal-student membership fallback: project.institution is null but
        // one of the project's students belongs to this institution's portal
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

export class InstitutionProjectCommentController {
  static async create(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { content, comment_type, page_reference, priority, parent_comment_id } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: "Content is required" });
      }

      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const commentRepo = dbConnection.getRepository(InstitutionProjectComment);
      const activityRepo = dbConnection.getRepository(InstitutionProjectActivity);
      const userRepo = dbConnection.getRepository(User);

      const [project, caller] = await Promise.all([
        projectRepo.findOne({
          where: { id },
          relations: ["students", "instructors", "industrial_supervisors", "institution"],
        }),
        userRepo.findOne({ where: { id: userId } }),
      ]);

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      if (!(await canAccess(userId, project, caller))) {
        return res.status(403).json({ success: false, message: "No access" });
      }

      const comment = commentRepo.create({
        project,
        author: { id: userId } as any,
        content,
        comment_type: Object.values(InstitutionCommentType).includes(comment_type)
          ? comment_type
          : InstitutionCommentType.GENERAL,
        page_reference,
        priority: Object.values(InstitutionCommentPriority).includes(priority)
          ? priority
          : InstitutionCommentPriority.MEDIUM,
        parent_comment_id: parent_comment_id || null,
      });
      const saved = await commentRepo.save(comment);

      await activityRepo.save(
        activityRepo.create({
          project,
          actor: { id: userId } as any,
          action_type: InstitutionActivityType.COMMENT_ADDED,
          description: `New ${comment.comment_type} comment added`,
        })
      );

      return res.status(201).json({ success: true, data: saved });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const commentRepo = dbConnection.getRepository(InstitutionProjectComment);
      const userRepo = dbConnection.getRepository(User);

      const [project, caller] = await Promise.all([
        projectRepo.findOne({
          where: { id },
          relations: ["students", "instructors", "industrial_supervisors", "institution"],
        }),
        userRepo.findOne({ where: { id: userId } }),
      ]);

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      if (!(await canAccess(userId, project, caller))) {
        return res.status(403).json({ success: false, message: "No access" });
      }

      const comments = await commentRepo.find({
        where: { project: { id } as any },
        relations: ["author", "resolved_by"],
        order: { created_at: "ASC" },
      });

      // Build threaded structure
      const byId = new Map<string, any>();
      comments.forEach((c: any) => {
        c.replies = [];
        byId.set(c.id, c);
      });
      const roots: any[] = [];
      comments.forEach((c: any) => {
        if (c.parent_comment_id && byId.has(c.parent_comment_id)) {
          byId.get(c.parent_comment_id).replies.push(c);
        } else {
          roots.push(c);
        }
      });

      return res.json({ success: true, data: roots });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async resolve(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { id, commentId } = req.params;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const commentRepo = dbConnection.getRepository(InstitutionProjectComment);
      const activityRepo = dbConnection.getRepository(InstitutionProjectActivity);
      const userRepo = dbConnection.getRepository(User);

      const [project, caller] = await Promise.all([
        projectRepo.findOne({
          where: { id },
          relations: ["students", "instructors", "industrial_supervisors", "institution"],
        }),
        userRepo.findOne({ where: { id: userId } }),
      ]);

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const comment = await commentRepo.findOne({
        where: { id: commentId, project: { id } as any },
      });
      if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

      // Resolve gate: owning students OR institution admin (including portal-admin fallback)
      const isStudent = (project.students || []).some((s) => s.id === userId);
      const isDirectAdmin = project.institution?.id === userId;
      const isPortalAdmin =
        caller?.institution_portal_role === InstitutionPortalRole.INSTITUTION_ADMIN &&
        (await canAccess(userId, project, caller));

      if (!isStudent && !isDirectAdmin && !isPortalAdmin) {
        return res
          .status(403)
          .json({ success: false, message: "Only students or institution admin may resolve" });
      }

      comment.is_resolved = !comment.is_resolved;
      comment.resolved_by = comment.is_resolved ? ({ id: userId } as any) : null;
      comment.resolved_at = comment.is_resolved ? new Date() : null;
      await commentRepo.save(comment);

      await activityRepo.save(
        activityRepo.create({
          project,
          actor: { id: userId } as any,
          action_type: InstitutionActivityType.COMMENT_RESOLVED,
          description: `Comment ${comment.is_resolved ? "resolved" : "re-opened"}`,
        })
      );

      return res.json({ success: true, data: comment });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}