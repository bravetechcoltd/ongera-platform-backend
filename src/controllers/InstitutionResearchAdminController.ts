// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from "../database/db";
import {
  InstitutionResearchProject,
} from "../database/models/InstitutionResearchProject";
import {
  IndustrialSupervisor,
  SupervisorInvitationStatus,
} from "../database/models/IndustrialSupervisor";
import { User } from "../database/models/User";

export class InstitutionResearchAdminController {
  static async listAllProjects(req: Request, res: Response) {
    try {
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const { institution_id, project_type, status, academic_year, page = 1, limit = 50 } = req.query;

      const qb = projectRepo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.institution", "institution")
        .leftJoinAndSelect("p.students", "students")
        .leftJoinAndSelect("p.instructors", "instructors")
        .leftJoinAndSelect("p.industrial_supervisors", "supervisors");

      if (institution_id) qb.andWhere("institution.id = :iid", { iid: institution_id });
      if (project_type) qb.andWhere("p.project_type = :pt", { pt: project_type });
      if (status) qb.andWhere("p.status = :st", { st: status });
      if (academic_year) qb.andWhere("p.academic_year = :ay", { ay: academic_year });

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
      const { id } = req.params;
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);
      const project = await projectRepo.findOne({
        where: { id },
        relations: [
          "institution",
          "students",
          "instructors",
          "industrial_supervisors",
          "files",
          "reviews",
          "reviews.reviewer",
          "comments",
          "activities",
          "activities.actor",
        ],
      });
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });
      return res.json({ success: true, data: project });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async revokeSupervisor(req: Request, res: Response) {
    try {
      const { supervisorId } = req.params;
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const userRepo = dbConnection.getRepository(User);

      const inv = await supRepo.findOne({ where: { id: supervisorId }, relations: ["user", "institution"] });
      if (!inv) return res.status(404).json({ success: false, message: "Invitation not found" });

      inv.invitation_status = SupervisorInvitationStatus.REVOKED;
      inv.is_active = false;
      await supRepo.save(inv);

      const u = inv.user;
      if (u) {
        const filtered = (u.industrial_supervisor_institutions || []).filter((i) => i !== inv.institution.id);
        u.industrial_supervisor_institutions = filtered;
        if (filtered.length === 0) u.is_industrial_supervisor = false;
        await userRepo.save(u);
      }
      return res.json({ success: true, message: "Supervisor revoked" });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
