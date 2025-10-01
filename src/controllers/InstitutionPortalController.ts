// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from '../database/db';
import { User, AccountType } from "../database/models/User";
import { ResearchProject, ProjectApprovalStatus } from "../database/models/ResearchProject";
import { InstructorStudent } from "../database/models/InstructorStudent";
import { ProjectApproval, ApprovalStatus } from "../database/models/ProjectApproval";

export class InstitutionPortalController {
  
  static async getInstitutionOverview(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;

      const userRepo = dbConnection.getRepository(User);
      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const projectRepo = dbConnection.getRepository(ResearchProject);

      const institution = await userRepo.findOne({
        where: { id: institutionId, account_type: AccountType.INSTITUTION },
        relations: ["profile"]
      });

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution not found"
        });
      }

      const instructors = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .leftJoin("bulk_user_creations", "bulk", "bulk.creator_id = :institutionId", { institutionId })
        .where("user.account_type = :type", { type: AccountType.RESEARCHER })
        .andWhere("profile.institution_name = :name", { 
          name: institution.profile?.institution_name || institution.first_name 
        })
        .getMany();

      const students = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("user.account_type = :type", { type: AccountType.STUDENT })
        .andWhere("profile.institution_name = :name", { 
          name: institution.profile?.institution_name || institution.first_name 
        })
        .getMany();

      const allProjects = await projectRepo
        .createQueryBuilder("project")
        .leftJoinAndSelect("project.author", "author")
        .where("author.id IN (:...studentIds)", { 
          studentIds: students.length > 0 ? students.map(s => s.id) : [''] 
        })
        .getMany();

      const projectStats = {
        total: allProjects.length,
        pending: allProjects.filter(p => p.approval_status === ProjectApprovalStatus.PENDING_REVIEW).length,
        approved: allProjects.filter(p => p.approval_status === ProjectApprovalStatus.APPROVED).length,
        rejected: allProjects.filter(p => p.approval_status === ProjectApprovalStatus.REJECTED).length,
        returned: allProjects.filter(p => p.approval_status === ProjectApprovalStatus.RETURNED).length,
        draft: allProjects.filter(p => p.approval_status === ProjectApprovalStatus.DRAFT).length
      };

      res.json({
        success: true,
        data: {
          institution: {
            id: institution.id,
            name: institution.profile?.institution_name || institution.first_name,
            email: institution.email,
            phone: institution.phone_number,
            profile: institution.profile
          },
          stats: {
            totalInstructors: instructors.length,
            totalStudents: students.length,
            totalProjects: allProjects.length,
            projectStats
          },
          instructors: instructors.map(i => ({
            id: i.id,
            name: `${i.first_name} ${i.last_name}`,
            email: i.email,
            department: i.profile?.department,
            profile: i.profile
          })),
          students: students.map(s => ({
            id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            email: s.email,
            profile: s.profile
          }))
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to get institution overview",
        error: error.message
      });
    }
  }

  static async getInstitutionMembers(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { type, page = 1, limit = 20, search } = req.query;

      const userRepo = dbConnection.getRepository(User);

      const institution = await userRepo.findOne({
        where: { id: institutionId, account_type: AccountType.INSTITUTION },
        relations: ["profile"]
      });

      if (!institution) {
        return res.status(404).json({
          success: false,
          message: "Institution not found"
        });
      }

      const institutionName = institution.profile?.institution_name || institution.first_name;

      let query = userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("profile.institution_name = :name", { name: institutionName });

      if (type === 'instructor') {
        query = query.andWhere("user.account_type = :type", { type: AccountType.RESEARCHER });
      } else if (type === 'student') {
        query = query.andWhere("user.account_type = :type", { type: AccountType.STUDENT });
      } else {
        query = query.andWhere("user.account_type IN (:...types)", { 
          types: [AccountType.RESEARCHER, AccountType.STUDENT] 
        });
      }

      if (search) {
        query = query.andWhere(
          "(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      const total = await query.getCount();

      const skip = (Number(page) - 1) * Number(limit);
      const members = await query
        .orderBy("user.date_joined", "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

      res.json({
        success: true,
        data: {
          members,
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
        message: "Failed to get institution members",
        error: error.message
      });
    }
  }

  static async getInstructorStudents(req: Request, res: Response) {
    try {
      const instructorId = req.user.userId;
      const { page = 1, limit = 20 } = req.query;

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

      const total = await instructorStudentRepo.count({
        where: { instructor: { id: instructorId } }
      });

      const skip = (Number(page) - 1) * Number(limit);
      const links = await instructorStudentRepo.find({
        where: { instructor: { id: instructorId } },
        relations: ["student", "student.profile"],
        order: { created_at: "DESC" },
        skip,
        take: Number(limit)
      });

      res.json({
        success: true,
        data: {
          students: links.map(link => link.student),
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
        message: "Failed to get instructor students",
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
      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

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
      project.status = 'Published';
      await projectRepo.save(project);

      const approval = approvalRepo.create({
        project,
        instructor: { id: instructorId },
        status: ApprovalStatus.APPROVED,
        feedback: feedback || "Project approved",
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
      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

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
      project.status = 'Archived';
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
      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

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
      project.status = 'Draft';
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

  static async getPendingProjectsForInstructor(req: Request, res: Response) {
    try {
      const instructorId = req.user.userId;
      const { page = 1, limit = 10, status } = req.query;

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const projectRepo = dbConnection.getRepository(ResearchProject);

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

      const skip = (Number(page) - 1) * Number(limit);
      
      let queryBuilder = projectRepo
        .createQueryBuilder("project")
        .leftJoinAndSelect("project.author", "author")
        .leftJoinAndSelect("author.profile", "profile")
        .leftJoinAndSelect("project.tags", "tags")
        .leftJoinAndSelect("project.files", "files")
        .where("author.id IN (:...studentIds)", { studentIds });

      if (status) {
        queryBuilder = queryBuilder.andWhere("project.approval_status = :status", { status });
      } else {
        queryBuilder = queryBuilder.andWhere(
          "project.approval_status IN (:...statuses)", 
          { 
            statuses: [
              ProjectApprovalStatus.DRAFT,
              ProjectApprovalStatus.PENDING_REVIEW, 
              ProjectApprovalStatus.RETURNED
            ] 
          }
        );
      }

      const [projects, total] = await queryBuilder
        .orderBy("project.created_at", "DESC")
        .skip(skip)
        .take(Number(limit))
        .getManyAndCount();

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
}