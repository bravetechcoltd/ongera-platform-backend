// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from '../database/db';
import { ResearchProject, ProjectApprovalStatus } from "../database/models/ResearchProject";
import { ProjectApproval, ApprovalStatus } from "../database/models/ProjectApproval";
import { InstructorStudent } from "../database/models/InstructorStudent";

export class ProjectApprovalController {
  
  static async getPendingProjects(req: Request, res: Response) {
    try {
      const instructorId = req.user.userId;
      const { page = 1, limit = 10 } = req.query;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      
      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const studentLinks = await instructorStudentRepo.find({
        where: { instructor: { id: instructorId } },
        relations: ["student"]
      });

      const studentIds = studentLinks.map(link => link.student.id);

      if (studentIds.length === 0) {
        return res.json({
          success: true,
          data: {
            projects: [],
            pagination: { page: 1, limit: Number(limit), total: 0, totalPages: 0 }
          }
        });
      }

      const queryBuilder = projectRepo.createQueryBuilder("project")
        .leftJoinAndSelect("project.author", "author")
        .leftJoinAndSelect("author.profile", "profile")
        .leftJoinAndSelect("project.tags", "tags")
        .leftJoinAndSelect("project.files", "files")
        .leftJoinAndSelect("project.approvals", "approvals")
        .where("author.id IN (:...studentIds)", { studentIds })
        .andWhere("project.approval_status IN (:...statuses)", {
          statuses: [ProjectApprovalStatus.PENDING_REVIEW, ProjectApprovalStatus.RETURNED]
        })
        .orderBy("project.created_at", "DESC");

      const total = await queryBuilder.getCount();
      const skip = (Number(page) - 1) * Number(limit);
      const projects = await queryBuilder.skip(skip).take(Number(limit)).getMany();

      res.json({
        success: true,
        data: {
          projects,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get pending projects",
        error: error.message
      });
    }
  }

  static async approveProject(req: Request, res: Response) {
    try {
      const instructorId = req.user.userId;
      const { projectId } = req.params;
      const { feedback } = req.body;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const approvalRepo = dbConnection.getRepository(ProjectApproval);

      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["author", "assigned_instructor"]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const link = await instructorStudentRepo.findOne({
        where: {
          instructor: { id: instructorId },
          student: { id: project.author.id }
        }
      });

      if (!link) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this student"
        });
      }

      project.approval_status = ProjectApprovalStatus.APPROVED;
      await projectRepo.save(project);

      const approval = approvalRepo.create({
        project,
        instructor: { id: instructorId },
        status: ApprovalStatus.APPROVED,
        feedback,
        reviewed_at: new Date()
      });
      await approvalRepo.save(approval);

      res.json({
        success: true,
        message: "Project approved successfully",
        data: { project }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to approve project",
        error: error.message
      });
    }
  }

  static async rejectProject(req: Request, res: Response) {
    try {
      const instructorId = req.user.userId;
      const { projectId } = req.params;
      const { feedback } = req.body;

      if (!feedback || feedback.trim().length < 20) {
        return res.status(400).json({
          success: false,
          message: "Feedback is required (minimum 20 characters)"
        });
      }

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const approvalRepo = dbConnection.getRepository(ProjectApproval);

      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["author"]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const link = await instructorStudentRepo.findOne({
        where: {
          instructor: { id: instructorId },
          student: { id: project.author.id }
        }
      });

      if (!link) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this student"
        });
      }

      project.approval_status = ProjectApprovalStatus.REJECTED;
      await projectRepo.save(project);

      const approval = approvalRepo.create({
        project,
        instructor: { id: instructorId },
        status: ApprovalStatus.REJECTED,
        feedback,
        reviewed_at: new Date()
      });
      await approvalRepo.save(approval);

      res.json({
        success: true,
        message: "Project rejected",
        data: { project }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to reject project",
        error: error.message
      });
    }
  }

  static async returnProject(req: Request, res: Response) {
    try {
      const instructorId = req.user.userId;
      const { projectId } = req.params;
      const { feedback } = req.body;

      if (!feedback || feedback.trim().length < 20) {
        return res.status(400).json({
          success: false,
          message: "Feedback is required (minimum 20 characters)"
        });
      }

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const approvalRepo = dbConnection.getRepository(ProjectApproval);

      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["author"]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const link = await instructorStudentRepo.findOne({
        where: {
          instructor: { id: instructorId },
          student: { id: project.author.id }
        }
      });

      if (!link) {
        return res.status(403).json({
          success: false,
          message: "You are not assigned to this student"
        });
      }

      project.approval_status = ProjectApprovalStatus.RETURNED;
      await projectRepo.save(project);

      const approval = approvalRepo.create({
        project,
        instructor: { id: instructorId },
        status: ApprovalStatus.RETURNED,
        feedback,
        reviewed_at: new Date()
      });
      await approvalRepo.save(approval);

      res.json({
        success: true,
        message: "Project returned for revision",
        data: { project }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to return project",
        error: error.message
      });
    }
  }

  static async getProjectApprovalHistory(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      const approvalRepo = dbConnection.getRepository(ProjectApproval);
      const approvals = await approvalRepo.find({
        where: { project: { id: projectId } },
        relations: ["instructor"],
        order: { created_at: "DESC" }
      });

      res.json({
        success: true,
        data: { approvals }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get approval history",
        error: error.message
      });
    }
  }
}