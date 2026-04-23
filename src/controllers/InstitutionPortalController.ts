// @ts-nocheck
import { Request, Response } from "express";
import { IsNull, In } from "typeorm";
import dbConnection from '../database/db';
import { User, AccountType, BwengeRole, InstitutionRole } from "../database/models/User";
import { ResearchProject, ProjectApprovalStatus } from "../database/models/ResearchProject";
import { InstructorStudent } from "../database/models/InstructorStudent";
import { ProjectApproval, ApprovalStatus } from "../database/models/ProjectApproval";
import {
  InstitutionResearchProject,
  InstitutionProjectStatus,
} from "../database/models/InstitutionResearchProject";
import {
  IndustrialSupervisor,
  SupervisorInvitationStatus,
} from "../database/models/IndustrialSupervisor";
import { InstitutionProjectActivity, InstitutionActivityType } from "../database/models/InstitutionProjectActivity";
import { sendEmail } from "../helpers/utils";

// ---------- Shared portal email template ----------
function buildPortalEmail(title: string, body: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0158B7; padding: 20px; color: white; text-align: center;">
        <h2 style="margin:0;">Bwenge Institution Portal</h2>
      </div>
      <div style="padding: 25px; background: #ffffff; border: 1px solid #e5e7eb;">
        <h3 style="color:#111827; margin-top:0;">${title}</h3>
        <div style="color:#374151; line-height:1.6; font-size:15px;">${body}</div>
      </div>
      <div style="padding:15px; background:#f9fafb; color:#6b7280; font-size:12px; text-align:center;">
        Bwenge Platform · Institution Portal
      </div>
    </div>
  `;
}

function institutionDisplayName(institution: User | null | undefined): string {
  if (!institution) return "your institution";
  return (
    (institution as any).profile?.institution_name ||
    `${institution.first_name || ""} ${institution.last_name || ""}`.trim() ||
    institution.username ||
    "your institution"
  );
}

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

      const instructorsByName = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .leftJoin("bulk_user_creations", "bulk", "bulk.creator_id = :institutionId", { institutionId })
        .where("user.account_type = :type", { type: AccountType.RESEARCHER })
        .andWhere("profile.institution_name = :name", {
          name: institution.profile?.institution_name || institution.first_name
        })
        .getMany();

      const studentsByName = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("user.account_type = :type", { type: AccountType.STUDENT })
        .andWhere("profile.institution_name = :name", {
          name: institution.profile?.institution_name || institution.first_name
        })
        .getMany();

      // Enhancement: also fetch via FK-based institution_id for portal members
      const fkStudentLinks = await instructorStudentRepo.find({
        where: { institution_id: institutionId, is_institution_portal_member: true },
        relations: ["student", "student.profile", "instructor", "instructor.profile"]
      });

      const fkStudents = fkStudentLinks.map(link => link.student).filter(Boolean);
      const fkInstructorIdSet = new Set(fkStudentLinks.map(link => link.instructor?.id).filter(Boolean));

      // Also fetch instructors by institution_ids array (FK)
      const fkInstructors = await userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("user.is_institution_member = true")
        .andWhere("user.institution_role = :role", { role: InstitutionRole.INSTRUCTOR })
        .andWhere("user.institution_ids LIKE :id", { id: `%${institutionId}%` })
        .getMany();

      // Merge and deduplicate by id
      const instructorMap = new Map<string, User>();
      [...instructorsByName, ...fkInstructors].forEach(u => instructorMap.set(u.id, u));
      fkStudentLinks.forEach(link => {
        if (link.instructor && !instructorMap.has(link.instructor.id)) {
          instructorMap.set(link.instructor.id, link.instructor);
        }
      });
      const instructors = Array.from(instructorMap.values());

      const studentMap = new Map<string, User>();
      [...studentsByName, ...fkStudents].forEach(u => studentMap.set(u.id, u));
      const students = Array.from(studentMap.values());

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

      // ============= INSTITUTION RESEARCH PORTAL ADDITIONS =============
      const instResearchRepo = dbConnection.getRepository(InstitutionResearchProject);
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const actRepo = dbConnection.getRepository(InstitutionProjectActivity);

      const institutionProjects = await instResearchRepo.find({
        where: { institution: { id: institutionId } as any },
        relations: ["industrial_supervisors"],
      });
      const institutionProjectsByStatus: Record<string, number> = {};
      const institutionProjectsByType: Record<string, number> = {};
      institutionProjects.forEach((p) => {
        institutionProjectsByStatus[p.status] = (institutionProjectsByStatus[p.status] || 0) + 1;
        institutionProjectsByType[p.project_type] = (institutionProjectsByType[p.project_type] || 0) + 1;
      });

      const industrialSupervisors = await supRepo.find({
        where: { institution: { id: institutionId } as any },
        relations: ["user", "user.profile"],
      });

      // Supervisor stage is optional: only count projects that actually have
      // supervisors assigned. Projects submitted without a supervisor skip
      // Stage 2 and land directly in the instructor queue.
      const pendingSupervisorReviews = institutionProjects.filter(
        (p) =>
          [InstitutionProjectStatus.SUBMITTED, InstitutionProjectStatus.UNDER_SUPERVISOR_REVIEW].includes(p.status) &&
          (p.industrial_supervisors || []).length > 0
      ).length;
      const pendingInstructorReviews = institutionProjects.filter(
        (p) =>
          p.status === InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW ||
          (p.status === InstitutionProjectStatus.SUBMITTED &&
            (p.industrial_supervisors || []).length === 0)
      ).length;
      const awaitingPublication = institutionProjects.filter(
        (p) => p.status === InstitutionProjectStatus.APPROVED
      ).length;

      const recentActivity = await actRepo
        .createQueryBuilder("a")
        .leftJoinAndSelect("a.actor", "actor")
        .leftJoinAndSelect("a.project", "project")
        .where("project.institution_id = :id", { id: institutionId })
        .orderBy("a.created_at", "DESC")
        .take(10)
        .getMany();

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
          })),
          industrial_supervisors: {
            count: industrialSupervisors.length,
            active: industrialSupervisors.filter((s) => s.invitation_status === SupervisorInvitationStatus.ACCEPTED && s.is_active).length,
            pending: industrialSupervisors.filter((s) => s.invitation_status === SupervisorInvitationStatus.PENDING).length,
            list: industrialSupervisors.map((s) => ({
              id: s.id,
              user_id: s.user?.id,
              name: s.user ? `${s.user.first_name} ${s.user.last_name || ""}` : "",
              email: s.user?.email,
              organization: s.organization,
              expertise_area: s.expertise_area,
              invitation_status: s.invitation_status,
              is_active: s.is_active,
            })),
          },
          institution_research_projects: {
            total: institutionProjects.length,
            by_status: institutionProjectsByStatus,
            by_type: institutionProjectsByType,
          },
          pending_supervisor_reviews: pendingSupervisorReviews,
          pending_instructor_reviews: pendingInstructorReviews,
          awaiting_publication: awaitingPublication,
          recent_activity: recentActivity.map((a) => ({
            id: a.id,
            action_type: a.action_type,
            description: a.description,
            actor_name: a.actor ? `${a.actor.first_name} ${a.actor.last_name || ""}` : "System",
            created_at: a.created_at,
          })),
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

      // Old Instructor Portal: only old-style assignments (no institution_id FK)
      const studentLinks = await instructorStudentRepo.find({
        where: { instructor: { id: instructorId }, institution_id: IsNull() },
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

  // ==================== NEW: Institution Portal Member Management ====================

  /**
   * POST /api/institution-portal/members/add-student
   * Institution registers a Bwenge user as a portal student assigned to an instructor
   */
  static async addStudentToInstitutionPortal(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const {
        student_email,
        instructor_id,
        academic_year,
        semester,
        department,
        registration_number,
      } = req.body;

      if (!student_email || !instructor_id) {
        return res.status(400).json({
          success: false,
          message: "student_email and instructor_id are required"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const institution = await userRepo.findOne({
        where: { id: institutionId, account_type: AccountType.INSTITUTION },
        relations: ["profile"],
      });
      if (!institution) {
        return res.status(403).json({
          success: false,
          message: "Only institution accounts can add portal members"
        });
      }

      const student = await userRepo.findOne({ where: { email: student_email } });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "No Bwenge user found with this email. The student must register on Bwenge first."
        });
      }

      const instructor = await userRepo.findOne({ where: { id: instructor_id } });
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: "Instructor not found"
        });
      }

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

      const existing = await instructorStudentRepo.findOne({
        where: {
          instructor: { id: instructor_id },
          student: { id: student.id },
          institution_id: institutionId
        }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "This student is already assigned to this instructor in your portal"
        });
      }

      const link = instructorStudentRepo.create({
        instructor: { id: instructor_id } as any,
        student: { id: student.id } as any,
        institution_id: institutionId,
        academic_year,
        semester,
        department: department || null,
        registration_number: registration_number || null,
        is_institution_portal_member: true,
        assigned_at: new Date()
      });
      await instructorStudentRepo.save(link);

      // Update student user record
      student.is_institution_member = true;
      if (!student.primary_institution_id) {
        student.primary_institution_id = institutionId;
      }
      const existingIds = student.institution_ids || [];
      if (!existingIds.includes(institutionId)) {
        student.institution_ids = [...existingIds, institutionId];
      }
      student.institution_role = InstitutionRole.MEMBER;
      await userRepo.save(student);

      // Email the student that they were added to this institution's portal
      try {
        const instName = institutionDisplayName(institution);
        const instructorName = `${instructor.first_name || ""} ${instructor.last_name || ""}`.trim() || instructor.email;
        const detailRows: string[] = [];
        if (instructorName) detailRows.push(`<li><b>Instructor:</b> ${instructorName}</li>`);
        if (academic_year) detailRows.push(`<li><b>Academic year:</b> ${academic_year}</li>`);
        if (semester) detailRows.push(`<li><b>Semester:</b> ${semester}</li>`);
        if (department) detailRows.push(`<li><b>Department:</b> ${department}</li>`);
        if (registration_number) detailRows.push(`<li><b>Registration number:</b> ${registration_number}</li>`);
        const studentName = student.first_name || "there";

        await sendEmail({
          to: student.email,
          subject: `You've been added to ${instName} on Bwenge`,
          html: buildPortalEmail(
            `Welcome to ${instName}'s portal`,
            `<p>Hi ${studentName},</p>
             <p><b>${instName}</b> has added you as a portal student. You can now collaborate on institution research projects under their academic supervision.</p>
             ${detailRows.length ? `<ul>${detailRows.join("")}</ul>` : ""}
             <p>Sign in to your Bwenge dashboard to view your institution portal.</p>`
          ),
        });
      } catch (e) {
        console.error("Add-student email failed:", e);
      }

      return res.status(201).json({
        success: true,
        message: "Student added to institution portal",
        data: { link, student: { id: student.id, email: student.email, first_name: student.first_name, last_name: student.last_name } }
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to add student to institution portal",
        error: error.message
      });
    }
  }

  /**
   * POST /api/institution-portal/members/add-instructor
   * Institution registers an existing Researcher account as portal instructor
   */
  static async addInstructorToInstitutionPortal(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { instructor_email } = req.body;

      if (!instructor_email) {
        return res.status(400).json({
          success: false,
          message: "instructor_email is required"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const institution = await userRepo.findOne({
        where: { id: institutionId, account_type: AccountType.INSTITUTION },
        relations: ["profile"],
      });
      if (!institution) {
        return res.status(403).json({
          success: false,
          message: "Only institution accounts can add portal members"
        });
      }

      const instructor = await userRepo.findOne({ where: { email: instructor_email } });
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: "No Researcher account found with this email"
        });
      }
      if (instructor.account_type !== AccountType.RESEARCHER) {
        return res.status(400).json({
          success: false,
          message: "Only Researcher account types can be added as instructors"
        });
      }

      const existingIds = instructor.institution_ids || [];
      if (existingIds.includes(institutionId) && instructor.institution_role === InstitutionRole.INSTRUCTOR) {
        return res.status(409).json({
          success: false,
          message: "This instructor is already registered in your institution portal"
        });
      }

      instructor.is_institution_member = true;
      if (!instructor.primary_institution_id) {
        instructor.primary_institution_id = institutionId;
      }
      if (!existingIds.includes(institutionId)) {
        instructor.institution_ids = [...existingIds, institutionId];
      }
      instructor.institution_role = InstitutionRole.INSTRUCTOR;
      if (
        instructor.bwenge_role !== BwengeRole.INSTITUTION_ADMIN &&
        instructor.bwenge_role !== BwengeRole.SYSTEM_ADMIN
      ) {
        instructor.bwenge_role = BwengeRole.INSTRUCTOR;
      }
      await userRepo.save(instructor);

      // Email the instructor about being added to this institution's portal
      try {
        const instName = institutionDisplayName(institution);
        const name = instructor.first_name || "there";
        await sendEmail({
          to: instructor.email,
          subject: `You've been added as an instructor at ${instName} on Bwenge`,
          html: buildPortalEmail(
            `Welcome to ${instName}'s portal`,
            `<p>Hi ${name},</p>
             <p><b>${instName}</b> has added you as an instructor in their institution portal. You can now supervise students and review their research projects.</p>
             <p>Sign in to your Bwenge dashboard to access your institution portal.</p>`
          ),
        });
      } catch (e) {
        console.error("Add-instructor email failed:", e);
      }

      return res.status(201).json({
        success: true,
        message: "Instructor added to institution portal",
        data: {
          instructor: {
            id: instructor.id,
            email: instructor.email,
            first_name: instructor.first_name,
            last_name: instructor.last_name
          }
        }
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to add instructor to institution portal",
        error: error.message
      });
    }
  }

  /**
   * GET /api/institution-portal/portal/students
   * List all students in this institution's portal (FK-based)
   */
  static async getInstitutionPortalStudents(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { page = 1, limit = 20, search, instructor_id, academic_year } = req.query;

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

      let qb = instructorStudentRepo
        .createQueryBuilder("link")
        .leftJoinAndSelect("link.student", "student")
        .leftJoinAndSelect("student.profile", "sprofile")
        .leftJoinAndSelect("link.instructor", "instructor")
        .leftJoinAndSelect("instructor.profile", "iprofile")
        .where("link.institution_id = :institutionId", { institutionId })
        .andWhere("link.is_institution_portal_member = true");

      if (instructor_id) {
        qb = qb.andWhere("link.instructor_id = :instructor_id", { instructor_id });
      }
      if (academic_year) {
        qb = qb.andWhere("link.academic_year = :academic_year", { academic_year });
      }
      if (search) {
        qb = qb.andWhere(
          "(student.first_name ILIKE :s OR student.last_name ILIKE :s OR student.email ILIKE :s)",
          { s: `%${search}%` }
        );
      }

      const total = await qb.getCount();
      const skip = (Number(page) - 1) * Number(limit);
      const links = await qb
        .orderBy("link.assigned_at", "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

      return res.json({
        success: true,
        data: {
          students: links.map(l => ({
            link_id: l.id,
            student: l.student,
            instructor: l.instructor,
            academic_year: l.academic_year,
            semester: l.semester,
            department: l.department,
            registration_number: l.registration_number,
            assigned_at: l.assigned_at,
            is_institution_portal_member: l.is_institution_portal_member
          })),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to get portal students",
        error: error.message
      });
    }
  }

  /**
   * GET /api/institution-portal/portal/instructors
   * List all instructors registered in this institution's portal (FK-based)
   */
  static async getInstitutionPortalInstructors(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { page = 1, limit = 20, search } = req.query;

      const userRepo = dbConnection.getRepository(User);
      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);

      let qb = userRepo
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.profile", "profile")
        .where("user.is_institution_member = true")
        .andWhere("user.institution_role = :role", { role: InstitutionRole.INSTRUCTOR })
        .andWhere("user.institution_ids LIKE :id", { id: `%${institutionId}%` });

      if (search) {
        qb = qb.andWhere(
          "(user.first_name ILIKE :s OR user.last_name ILIKE :s OR user.email ILIKE :s)",
          { s: `%${search}%` }
        );
      }

      const total = await qb.getCount();
      const skip = (Number(page) - 1) * Number(limit);
      const instructors = await qb
        .orderBy("user.date_joined", "DESC")
        .skip(skip)
        .take(Number(limit))
        .getMany();

      const results = await Promise.all(
        instructors.map(async (ins) => {
          const studentCount = await instructorStudentRepo.count({
            where: {
              instructor: { id: ins.id },
              institution_id: institutionId,
              is_institution_portal_member: true
            }
          });
          return {
            id: ins.id,
            email: ins.email,
            first_name: ins.first_name,
            last_name: ins.last_name,
            name: `${ins.first_name || ""} ${ins.last_name || ""}`.trim(),
            department: ins.profile?.department,
            profile: ins.profile,
            student_count: studentCount
          };
        })
      );

      return res.json({
        success: true,
        data: {
          instructors: results,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to get portal instructors",
        error: error.message
      });
    }
  }

/**
 * GET /api/institution-portal/portal/dashboard
 * Role-specific dashboard payload for the institution portal home
 */
static async getInstitutionPortalDashboard(req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const userRepo = dbConnection.getRepository(User);
    const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
    const instResearchRepo = dbConnection.getRepository(InstitutionResearchProject);
    const actRepo = dbConnection.getRepository(InstitutionProjectActivity);

    const user = await userRepo.findOne({
      where: { id: userId },
      relations: ["profile"]
    });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ── INSTITUTION ADMIN (the institution account itself) ────────────────────
    if (user.account_type === AccountType.INSTITUTION) {
      const institutionId = userId;

      const studentCountRaw = await instructorStudentRepo
        .createQueryBuilder("link")
        .select("COUNT(DISTINCT link.student_id)", "cnt")
        .where("link.institution_id = :id", { id: institutionId })
        .andWhere("link.is_institution_portal_member = true")
        .getRawOne();
      const totalStudents = Number(studentCountRaw?.cnt || 0);

      const totalInstructors = await userRepo
        .createQueryBuilder("user")
        .where("user.is_institution_member = true")
        .andWhere("user.institution_role = :role", { role: InstitutionRole.INSTRUCTOR })
        .andWhere("user.institution_ids LIKE :id", { id: `%${institutionId}%` })
        .getCount();

      // CORRECT: find() with nested relation filter works in TypeORM >= 0.3
      const institutionProjects = await instResearchRepo.find({
        where: { institution: { id: institutionId } as any }
      });

      const projectsByStatus: Record<string, number> = {};
      institutionProjects.forEach(p => {
        projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
      });

      const pendingReviews = institutionProjects.filter(p =>
        [
          InstitutionProjectStatus.SUBMITTED,
          InstitutionProjectStatus.UNDER_SUPERVISOR_REVIEW,
          InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW
        ].includes(p.status)
      ).length;

      // FIXED: join through institution relation, not raw institution_id column
      const recentActivity = await actRepo
        .createQueryBuilder("a")
        .leftJoinAndSelect("a.actor", "actor")
        .leftJoinAndSelect("a.project", "project")
        .leftJoin("project.institution", "inst")
        .where("inst.id = :id", { id: institutionId })
        .orderBy("a.created_at", "DESC")
        .take(10)
        .getMany();

      return res.json({
        success: true,
        data: {
          role: "INSTITUTION_ADMIN",
          stats: {
            totalStudents,
            totalInstructors,
            totalProjects: institutionProjects.length,
            pendingReviews,
            projectsByStatus
          },
          recent_activity: recentActivity.map(a => ({
            id: a.id,
            action_type: a.action_type,
            description: a.description,
            actor_name: a.actor
              ? `${a.actor.first_name} ${a.actor.last_name || ""}`.trim()
              : "System",
            created_at: a.created_at
          }))
        }
      });
    }

    // ── INSTRUCTOR in an institution portal ───────────────────────────────────
    if (user.institution_role === InstitutionRole.INSTRUCTOR) {
      const institutionId = user.primary_institution_id;

      const myStudentLinks = await instructorStudentRepo.find({
        where: {
          instructor: { id: userId },
          institution_id: institutionId,
          is_institution_portal_member: true
        },
        relations: ["student", "student.profile"]
      });

      const studentIds = myStudentLinks
        .map(l => l.student?.id)
        .filter(Boolean) as string[];

      let pendingReviews: InstitutionResearchProject[] = [];
      let approvedCount = 0;

      if (studentIds.length > 0) {
        // FIXED: InstitutionResearchProject has "students" (ManyToMany, plural)
        // Use innerJoin on "p.students" to filter by student membership
        // Use relation path "p.institution" for institution filter
        pendingReviews = await instResearchRepo
          .createQueryBuilder("p")
          .innerJoin("p.students", "student")
          .innerJoin("p.institution", "inst")
          .where("inst.id = :id", { id: institutionId })
          .andWhere("student.id IN (:...sids)", { sids: studentIds })
          .andWhere("p.status = :s", { s: InstitutionProjectStatus.UNDER_INSTRUCTOR_REVIEW })
          .getMany();

        approvedCount = await instResearchRepo
          .createQueryBuilder("p")
          .innerJoin("p.students", "student")
          .innerJoin("p.institution", "inst")
          .where("inst.id = :id", { id: institutionId })
          .andWhere("student.id IN (:...sids)", { sids: studentIds })
          .andWhere("p.status = :s", { s: InstitutionProjectStatus.APPROVED })
          .getCount();
      }

      return res.json({
        success: true,
        data: {
          role: "INSTRUCTOR",
          my_students: myStudentLinks.map(l => ({
            link_id: l.id,
            student: l.student,
            academic_year: l.academic_year,
            semester: l.semester
          })),
          pending_reviews: pendingReviews,
          approved_count: approvedCount
        }
      });
    }

    // ── MEMBER (student) in an institution portal ─────────────────────────────
    if (user.is_institution_member && user.institution_role === InstitutionRole.MEMBER) {
      const institutionId = user.primary_institution_id;

      // FIXED: InstitutionResearchProject has "students" (ManyToMany, plural)
      // innerJoin on "p.students" filters to projects this user is a member of
      // innerJoin on "p.institution" filters to this institution
      const myProjects = await instResearchRepo
        .createQueryBuilder("p")
        .innerJoin("p.students", "student")
        .innerJoin("p.institution", "inst")
        .where("inst.id = :id", { id: institutionId })
        .andWhere("student.id = :uid", { uid: userId })
        .orderBy("p.created_at", "DESC")
        .getMany();

      const pendingReworks = myProjects.filter(
        p => p.status === InstitutionProjectStatus.REWORK_REQUESTED
      );

      return res.json({
        success: true,
        data: {
          role: "MEMBER",
          my_projects: myProjects,
          pending_reworks: pendingReworks,
          unresolved_comments: []
        }
      });
    }

    // ── No institution portal role ────────────────────────────────────────────
    return res.json({
      success: true,
      data: { role: "NONE", message: "You are not a member of any institution portal" }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: "Failed to get portal dashboard",
      error: error.message
    });
  }
}
  static async removeStudentFromInstitutionPortal(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { studentId } = req.params;

      const userRepo = dbConnection.getRepository(User);
      const institution = await userRepo.findOne({
        where: { id: institutionId, account_type: AccountType.INSTITUTION }
      });
      if (!institution) {
        return res.status(403).json({
          success: false,
          message: "Only institution accounts can manage portal members"
        });
      }

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const links = await instructorStudentRepo.find({
        where: { student: { id: studentId }, institution_id: institutionId },
        relations: ["student"]
      });

      if (links.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student is not registered in your portal"
        });
      }

      await instructorStudentRepo.remove(links);

      const student = await userRepo.findOne({ where: { id: studentId } });
      if (student) {
        const otherIds = (student.institution_ids || []).filter(id => id !== institutionId);
        student.institution_ids = otherIds;
        if (otherIds.length === 0) {
          student.is_institution_member = false;
          student.primary_institution_id = null;
          student.institution_role = null;
        } else if (student.primary_institution_id === institutionId) {
          student.primary_institution_id = otherIds[0];
        }
        await userRepo.save(student);
      }

      return res.json({
        success: true,
        message: "Student removed from institution portal"
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to remove student from portal",
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/institution-portal/members/instructors/:instructorId
   */
  static async removeInstructorFromInstitutionPortal(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { instructorId } = req.params;

      const userRepo = dbConnection.getRepository(User);
      const institution = await userRepo.findOne({
        where: { id: institutionId, account_type: AccountType.INSTITUTION }
      });
      if (!institution) {
        return res.status(403).json({
          success: false,
          message: "Only institution accounts can manage portal members"
        });
      }

      const instructor = await userRepo.findOne({ where: { id: instructorId } });
      if (!instructor) {
        return res.status(404).json({
          success: false,
          message: "Instructor not found"
        });
      }

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const links = await instructorStudentRepo.find({
        where: { instructor: { id: instructorId }, institution_id: institutionId }
      });
      if (links.length > 0) {
        await instructorStudentRepo.remove(links);
      }

      const otherIds = (instructor.institution_ids || []).filter(id => id !== institutionId);
      instructor.institution_ids = otherIds;
      if (otherIds.length === 0) {
        instructor.is_institution_member = false;
        instructor.primary_institution_id = null;
        instructor.institution_role = null;
      } else if (instructor.primary_institution_id === institutionId) {
        instructor.primary_institution_id = otherIds[0];
      }
      await userRepo.save(instructor);

      return res.json({
        success: true,
        message: "Instructor removed from institution portal"
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to remove instructor from portal",
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/institution-portal/members/students/:studentId/reassign
   */
  static async reassignStudentInstructor(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { studentId } = req.params;
      const { new_instructor_id } = req.body;

      if (!new_instructor_id) {
        return res.status(400).json({
          success: false,
          message: "new_instructor_id is required"
        });
      }

      const userRepo = dbConnection.getRepository(User);
      const newInstructor = await userRepo.findOne({ where: { id: new_instructor_id } });
      if (!newInstructor) {
        return res.status(404).json({
          success: false,
          message: "New instructor not found"
        });
      }

      const instructorStudentRepo = dbConnection.getRepository(InstructorStudent);
      const links = await instructorStudentRepo.find({
        where: { student: { id: studentId }, institution_id: institutionId },
        relations: ["instructor", "student"]
      });

      if (links.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Student is not registered in your portal"
        });
      }

      for (const link of links) {
        link.instructor = { id: new_instructor_id } as any;
      }
      await instructorStudentRepo.save(links);

      return res.json({
        success: true,
        message: "Student reassigned to new instructor",
        data: { student_id: studentId, new_instructor_id }
      });

    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to reassign student",
        error: error.message
      });
    }
  }

  // ====================================================================
  // ITEM 3 — Supervisor ↔ Project explicit assignment
  // (Replaces the old "supervisor sees every project of their institution"
  //  philosophy. Assignment is always explicit, made via the institution-
  //  portal supervisors page.)
  // ====================================================================

  /**
   * GET /api/institution-portal/supervisors/:supervisorId/projects
   * List the institution-research projects this supervisor is currently
   * assigned to (M2M institution_project_supervisors).
   * Caller must be the institution that invited the supervisor.
   */
  static async getSupervisorAssignedProjects(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { supervisorId } = req.params;

      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);

      const inv = await supRepo.findOne({
        where: { id: supervisorId, institution: { id: institutionId } as any },
        relations: ["user"],
      });
      if (!inv) {
        return res.status(404).json({ success: false, message: "Supervisor invitation not found for your institution" });
      }

      // Show only the supervisor's currently-assigned projects. The institution
      // boundary is implicit because a supervisor invitation is per-institution
      // and the Manage-Projects modal can only assign projects from this
      // institution's portal in the first place.
      const projects = await projectRepo
        .createQueryBuilder("p")
        .leftJoinAndSelect("p.institution", "institution")
        .leftJoinAndSelect("p.students", "students")
        .leftJoinAndSelect("p.industrial_supervisors", "supervisors")
        .where("supervisors.id = :uid", { uid: inv.user.id })
        .orderBy("p.created_at", "DESC")
        .getMany();

      return res.json({ success: true, data: projects });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * POST /api/institution-portal/supervisors/:supervisorId/projects
   * Body: { project_ids: string[] }
   * Assigns this supervisor to the listed projects (idempotent — already
   * assigned projects are silently skipped). Sends one email summarising
   * the new assignments.
   */
  static async assignProjectsToSupervisor(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { supervisorId } = req.params;
      const { project_ids } = req.body || {};

      if (!Array.isArray(project_ids) || project_ids.length === 0) {
        return res.status(400).json({ success: false, message: "project_ids must be a non-empty array" });
      }

      const userRepo = dbConnection.getRepository(User);
      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);

      const institution = await userRepo.findOne({ where: { id: institutionId }, relations: ["profile"] });
      if (!institution || institution.account_type !== AccountType.INSTITUTION) {
        return res.status(403).json({ success: false, message: "Only institution accounts can assign supervisor projects" });
      }

      const inv = await supRepo.findOne({
        where: {
          id: supervisorId,
          institution: { id: institutionId } as any,
          invitation_status: SupervisorInvitationStatus.ACCEPTED,
          is_active: true,
        },
        relations: ["user"],
      });
      if (!inv || !inv.user) {
        return res.status(404).json({ success: false, message: "Active supervisor not found for your institution" });
      }

      const projects = await projectRepo.find({
        where: { id: In(project_ids) },
        relations: ["industrial_supervisors", "students"],
      });

      const newlyAssigned: InstitutionResearchProject[] = [];
      for (const p of projects) {
        const already = (p.industrial_supervisors || []).some((s) => s.id === inv.user.id);
        if (!already) {
          p.industrial_supervisors = [...(p.industrial_supervisors || []), inv.user];
          await projectRepo.save(p);
          newlyAssigned.push(p);
        }
      }

      // Email the supervisor about the new assignments (single digest mail)
      if (newlyAssigned.length > 0) {
        try {
          const instName = institutionDisplayName(institution);
          const list = newlyAssigned.map((p) => `<li>${p.title}</li>`).join("");
          await sendEmail({
            to: inv.user.email,
            subject: `New supervisor assignments at ${instName}`,
            html: buildPortalEmail(
              `You have new project assignments`,
              `<p>${instName} has assigned ${newlyAssigned.length} project${newlyAssigned.length === 1 ? "" : "s"} to you for advisory supervision:</p>
               <ul>${list}</ul>
               <p>Sign in to your Bwenge dashboard to review these projects. Your reviews are advisory and run independently of the instructor review.</p>`
            ),
          });
        } catch (e) {
          console.error("Supervisor assignment email failed:", e);
        }
      }

      return res.json({
        success: true,
        message: `${newlyAssigned.length} project${newlyAssigned.length === 1 ? "" : "s"} assigned`,
        data: { assigned: newlyAssigned.map((p) => p.id), already_assigned: project_ids.filter((id) => !newlyAssigned.find((p) => p.id === id)) },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * DELETE /api/institution-portal/supervisors/:supervisorId/projects/:projectId
   * Removes this supervisor from the project's M2M.
   */
  static async unassignProjectFromSupervisor(req: Request, res: Response) {
    try {
      const institutionId = req.user.userId;
      const { supervisorId, projectId } = req.params;

      const supRepo = dbConnection.getRepository(IndustrialSupervisor);
      const projectRepo = dbConnection.getRepository(InstitutionResearchProject);

      const inv = await supRepo.findOne({
        where: { id: supervisorId, institution: { id: institutionId } as any },
        relations: ["user"],
      });
      if (!inv || !inv.user) {
        return res.status(404).json({ success: false, message: "Supervisor invitation not found for your institution" });
      }

      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["industrial_supervisors"],
      });
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      project.industrial_supervisors = (project.industrial_supervisors || []).filter((s) => s.id !== inv.user.id);
      await projectRepo.save(project);

      return res.json({ success: true, message: "Supervisor unassigned from project" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ====================================================================
  // ITEM 5 — Multi-student collaborator picker support
  // ====================================================================

  /**
   * GET /api/institution-portal/portal/all-students
   * Returns every student registered as a portal member of the caller's
   * institution. Used by the create-project page to populate the
   * collaborator multi-select. Includes their existing department /
   * registration_number from InstructorStudent so the form can pre-fill.
   */
  static async getAllPortalStudents(req: Request, res: Response) {
    try {
      const callerId = req.user.userId;
      const userRepo = dbConnection.getRepository(User);
      const insRepo = dbConnection.getRepository(InstructorStudent);

      const caller = await userRepo.findOne({ where: { id: callerId } });
      if (!caller) return res.status(404).json({ success: false, message: "User not found" });

      const institutionId =
        caller.account_type === AccountType.INSTITUTION
          ? caller.id
          : caller.primary_institution_id || (caller.institution_ids || [])[0];

      if (!institutionId) {
        return res.status(400).json({ success: false, message: "No institution context for this user" });
      }

      const links = await insRepo.find({
        where: { institution_id: institutionId, is_institution_portal_member: true },
        relations: ["student"],
        order: { assigned_at: "DESC" },
      });

      // Dedupe by student id (a student may have multiple instructor links)
      const byId = new Map<string, any>();
      for (const l of links) {
        if (!l.student?.id) continue;
        if (byId.has(l.student.id)) continue;
        byId.set(l.student.id, {
          student: l.student,
          department: l.department,
          registration_number: l.registration_number,
          academic_year: l.academic_year,
          semester: l.semester,
        });
      }

      // Exclude the caller themselves so they aren't listed as their own collaborator
      byId.delete(callerId);

      return res.json({ success: true, data: Array.from(byId.values()) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}