// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from '../database/db';
import { ResearchProject, CollaborationStatus, CollaborationInfoStatus } from "../database/models/ResearchProject";
import { CollaborationRequest, CollaborationRequestStatus } from "../database/models/CollaborationRequest";
import { ProjectContribution } from "../database/models/ProjectContribution";
import { User } from "../database/models/User";
import { sendEmail } from "../helpers/utils";
import { CollaborationEmailTemplates } from "../helpers/CollaborationEmailTemplates";
import { UploadToCloud, validateFileForUpload } from "../helpers/cloud";
import { In } from "typeorm";

export class CollaborationController {
  
  // ==================== REQUEST TO COLLABORATE (ENHANCED) ====================
  
  /**
   * Create a collaboration request to contribute to a project
   * POST /api/projects/:id/collaboration-request
   * ENHANCEMENT: Now updates collaboration_info with pending request
   */
  static async requestCollaboration(req: Request, res: Response) {
    try {
      console.log("\n📤 ========== REQUEST COLLABORATION START ==========");
      
      const { id: projectId } = req.params;
      const userId = req.user.userId;
      const { reason, expertise } = req.body;

      console.log("📥 Request Data:", { projectId, userId, reason, expertise });

      // Validate input
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide a reason for wanting to collaborate"
        });
      }

      // Get project with author details
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["author", "author.profile"]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      console.log("✅ Project found:", project.title);

      // Check if project allows collaboration
      if (project.collaboration_status === CollaborationStatus.SOLO) {
        return res.status(400).json({
          success: false,
          message: "This project is not open for collaboration"
        });
      }

      // Can't request to collaborate on own project
      if (project.author.id === userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot request to collaborate on your own project"
        });
      }

      // Check if already a collaborator
      const approvedCollaborators = project.approved_collaborators || [];
      if (approvedCollaborators.some(c => c.user_id === userId)) {
        return res.status(400).json({
          success: false,
          message: "You are already a collaborator on this project"
        });
      }

      // Check for existing pending request
      const requestRepo = dbConnection.getRepository(CollaborationRequest);
      const existingRequest = await requestRepo.findOne({
        where: {
          project: { id: projectId },
          requester: { id: userId },
          status: CollaborationRequestStatus.PENDING
        }
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending collaboration request for this project"
        });
      }

      // Get requester details
      const userRepo = dbConnection.getRepository(User);
      const requester = await userRepo.findOne({
        where: { id: userId },
        relations: ["profile"]
      });

      // Create collaboration request
      const collaborationRequest = requestRepo.create({
        project: { id: projectId },
        requester: { id: userId },
        reason: reason.trim(),
        expertise: expertise?.trim() || null,
        status: CollaborationRequestStatus.PENDING
      });

      await requestRepo.save(collaborationRequest);
      console.log("✅ Collaboration request created");

      // Load complete request with relations
      const savedRequest = await requestRepo.findOne({
        where: { id: collaborationRequest.id },
        relations: ["project", "requester", "requester.profile"]
      });

      // ==================== ENHANCEMENT: UPDATE COLLABORATION_INFO ====================
      console.log("\n📊 Updating collaboration_info...");

      const collaborationInfo = project.collaboration_info || [];
      
      // Add new pending request to collaboration_info
      const newCollaborationInfo = {
        user_id: userId,
        user_email: requester.email,
        user_name: `${requester.first_name} ${requester.last_name}`,
        status: CollaborationInfoStatus.PENDING,
        requested_at: new Date(),
        updated_at: new Date(),
        reason: reason.trim(),
        expertise: expertise?.trim() || null
      };

      collaborationInfo.push(newCollaborationInfo);
      project.collaboration_info = collaborationInfo;

      await projectRepo.save(project);
      console.log("✅ collaboration_info updated with pending request");
      // ==================== END ENHANCEMENT ====================

      // Send email notification to project creator
      console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
      
      try {
        const emailHtml = CollaborationEmailTemplates.getCollaborationRequestTemplate(
          project,
          requester,
          savedRequest
        );

        await sendEmail({
          to: project.author.email,
          subject: `🤝 New Collaboration Request for "${project.title}"`,
          html: emailHtml
        });

        console.log(`✅ Email sent to project creator: ${project.author.email}`);
      } catch (emailError: any) {
        console.error("❌ Email sending failed:", emailError.message);
        // Don't fail the request if email fails
      }

      console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
      console.log("📤 ========== REQUEST COLLABORATION END ==========\n");

      res.status(201).json({
        success: true,
        message: "Collaboration request submitted successfully. The project creator will review your request.",
        data: {
          request: {
            id: savedRequest.id,
            status: savedRequest.status,
            reason: savedRequest.reason,
            expertise: savedRequest.expertise,
            requested_at: savedRequest.requested_at,
            project: {
              id: project.id,
              title: project.title
            }
          }
        }
      });

    } catch (error: any) {
      console.error("❌ Request collaboration error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit collaboration request",
        error: error.message
      });
    }
  }

  // ==================== GET COLLABORATION REQUESTS FOR PROJECT (ORIGINAL) ====================
  
  /**
   * Get all collaboration requests for a specific project (creator only)
   * GET /api/projects/:id/collaboration-requests
   */
  static async getProjectCollaborationRequests(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = req.user.userId;
      const { status } = req.query;

      // Verify project ownership
      const projectRepo = dbConnection.getRepository(ResearchProject);
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

      if (project.author.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to view collaboration requests"
        });
      }

      // Get requests
      const requestRepo = dbConnection.getRepository(CollaborationRequest);
      const queryBuilder = requestRepo.createQueryBuilder("request")
        .leftJoinAndSelect("request.requester", "requester")
        .leftJoinAndSelect("requester.profile", "profile")
        .where("request.project_id = :projectId", { projectId });

      if (status) {
        queryBuilder.andWhere("request.status = :status", { status });
      }

      queryBuilder.orderBy("request.requested_at", "DESC");

      const requests = await queryBuilder.getMany();

      res.json({
        success: true,
        data: {
          requests,
          total: requests.length
        }
      });

    } catch (error: any) {
      console.error("❌ Get collaboration requests error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch collaboration requests",
        error: error.message
      });
    }
  }

  // ==================== APPROVE COLLABORATION REQUEST (ENHANCED) ====================
  
  /**
   * Approve a collaboration request (project creator only)
   * POST /api/collaboration-requests/:requestId/approve
   * ENHANCEMENT: Now updates collaboration_info with approved status
   */
  static async approveCollaborationRequest(req: Request, res: Response) {
    try {
      console.log("\n✅ ========== APPROVE COLLABORATION REQUEST START ==========");
      
      const { requestId } = req.params;
      const userId = req.user.userId;

      const requestRepo = dbConnection.getRepository(CollaborationRequest);
      const request = await requestRepo.findOne({
        where: { id: requestId },
        relations: ["project", "project.author", "requester", "requester.profile"]
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Collaboration request not found"
        });
      }

      // Verify project ownership
      if (request.project.author.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to approve this request"
        });
      }

      if (request.status !== CollaborationRequestStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Request has already been ${request.status.toLowerCase()}`
        });
      }

      // Update request status
      request.status = CollaborationRequestStatus.APPROVED;
      request.responded_at = new Date();
      await requestRepo.save(request);
      console.log("✅ Request approved");

      // Add to project's approved collaborators
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: request.project.id }
      });

      const approvedCollaborators = project.approved_collaborators || [];
      approvedCollaborators.push({
        user_id: request.requester.id,
        approved_at: new Date()
      });

      project.approved_collaborators = approvedCollaborators;
      project.collaborator_count = approvedCollaborators.length;

      // Update collaboration status if needed
      if (project.collaboration_status === CollaborationStatus.SEEKING_COLLABORATORS) {
        project.collaboration_status = CollaborationStatus.COLLABORATIVE;
      }

      // ==================== ENHANCEMENT: UPDATE COLLABORATION_INFO ====================
      console.log("\n📊 Updating collaboration_info...");

      const collaborationInfo = project.collaboration_info || [];
      
      // Find and update the user's collaboration info
      const userCollabIndex = collaborationInfo.findIndex(
        info => info.user_id === request.requester.id
      );

      if (userCollabIndex !== -1) {
        // Update existing entry
        collaborationInfo[userCollabIndex] = {
          ...collaborationInfo[userCollabIndex],
          status: CollaborationInfoStatus.APPROVED,
          updated_at: new Date()
        };
        console.log("✅ Updated existing collaboration_info entry");
      } else {
        // Add new entry (shouldn't happen, but handle it)
        collaborationInfo.push({
          user_id: request.requester.id,
          user_email: request.requester.email,
          user_name: `${request.requester.first_name} ${request.requester.last_name}`,
          status: CollaborationInfoStatus.APPROVED,
          requested_at: request.requested_at,
          updated_at: new Date(),
          reason: request.reason,
          expertise: request.expertise
        });
        console.log("✅ Added new collaboration_info entry");
      }

      project.collaboration_info = collaborationInfo;
      console.log("✅ collaboration_info updated with APPROVED status");
      // ==================== END ENHANCEMENT ====================

      await projectRepo.save(project);
      console.log("✅ Project collaborators updated");

      // Send approval email to requester
      console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
      
      try {
        const emailHtml = CollaborationEmailTemplates.getRequestApprovedTemplate(
          request.project,
          request.requester
        );

        await sendEmail({
          to: request.requester.email,
          subject: `🎉 Your Collaboration Request for "${request.project.title}" Has Been Approved!`,
          html: emailHtml
        });

        console.log(`✅ Approval email sent to: ${request.requester.email}`);
      } catch (emailError: any) {
        console.error("❌ Email sending failed:", emailError.message);
      }

      console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
      console.log("✅ ========== APPROVE COLLABORATION REQUEST END ==========\n");

      res.json({
        success: true,
        message: "Collaboration request approved successfully",
        data: {
          request: {
            id: request.id,
            status: request.status,
            responded_at: request.responded_at
          }
        }
      });

    } catch (error: any) {
      console.error("❌ Approve collaboration request error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve collaboration request",
        error: error.message
      });
    }
  }

  // ==================== REJECT COLLABORATION REQUEST (ENHANCED) ====================
  
  /**
   * Reject a collaboration request (project creator only)
   * POST /api/collaboration-requests/:requestId/reject
   * ENHANCEMENT: Now updates collaboration_info with rejected status
   */
  static async rejectCollaborationRequest(req: Request, res: Response) {
    try {
      console.log("\n❌ ========== REJECT COLLABORATION REQUEST START ==========");
      
      const { requestId } = req.params;
      const userId = req.user.userId;
      const { rejection_reason } = req.body;

      const requestRepo = dbConnection.getRepository(CollaborationRequest);
      const request = await requestRepo.findOne({
        where: { id: requestId },
        relations: ["project", "project.author", "requester", "requester.profile"]
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Collaboration request not found"
        });
      }

      // Verify project ownership
      if (request.project.author.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to reject this request"
        });
      }

      if (request.status !== CollaborationRequestStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: `Request has already been ${request.status.toLowerCase()}`
        });
      }

      // Update request status
      request.status = CollaborationRequestStatus.REJECTED;
      request.rejection_reason = rejection_reason?.trim() || null;
      request.responded_at = new Date();
      await requestRepo.save(request);
      console.log("✅ Request rejected");

      // ==================== ENHANCEMENT: UPDATE COLLABORATION_INFO ====================
      console.log("\n📊 Updating collaboration_info...");

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: request.project.id }
      });

      const collaborationInfo = project.collaboration_info || [];
      
      // Find and update the user's collaboration info
      const userCollabIndex = collaborationInfo.findIndex(
        info => info.user_id === request.requester.id
      );

      if (userCollabIndex !== -1) {
        // Update existing entry
        collaborationInfo[userCollabIndex] = {
          ...collaborationInfo[userCollabIndex],
          status: CollaborationInfoStatus.REJECTED,
          updated_at: new Date(),
          rejection_reason: rejection_reason?.trim() || null
        };
        console.log("✅ Updated existing collaboration_info entry");
      } else {
        // Add new entry (shouldn't happen, but handle it)
        collaborationInfo.push({
          user_id: request.requester.id,
          user_email: request.requester.email,
          user_name: `${request.requester.first_name} ${request.requester.last_name}`,
          status: CollaborationInfoStatus.REJECTED,
          requested_at: request.requested_at,
          updated_at: new Date(),
          reason: request.reason,
          expertise: request.expertise,
          rejection_reason: rejection_reason?.trim() || null
        });
        console.log("✅ Added new collaboration_info entry");
      }

      project.collaboration_info = collaborationInfo;
      await projectRepo.save(project);
      console.log("✅ collaboration_info updated with REJECTED status");
      // ==================== END ENHANCEMENT ====================

      // Send rejection email to requester
      console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
      
      try {
        const emailHtml = CollaborationEmailTemplates.getRequestRejectedTemplate(
          request.project,
          request.requester,
          request.rejection_reason
        );

        await sendEmail({
          to: request.requester.email,
          subject: `Collaboration Request Update for "${request.project.title}"`,
          html: emailHtml
        });

        console.log(`✅ Rejection email sent to: ${request.requester.email}`);
      } catch (emailError: any) {
        console.error("❌ Email sending failed:", emailError.message);
      }

      console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
      console.log("❌ ========== REJECT COLLABORATION REQUEST END ==========\n");

      res.json({
        success: true,
        message: "Collaboration request rejected",
        data: {
          request: {
            id: request.id,
            status: request.status,
            responded_at: request.responded_at
          }
        }
      });

    } catch (error: any) {
      console.error("❌ Reject collaboration request error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reject collaboration request",
        error: error.message
      });
    }
  }

  // ==================== GET USER'S COLLABORATION REQUESTS (ORIGINAL) ====================
  
  /**
   * Get all collaboration requests made by the current user
   * GET /api/my-collaboration-requests
   */
  static async getMyCollaborationRequests(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { status } = req.query;

      const requestRepo = dbConnection.getRepository(CollaborationRequest);
      const queryBuilder = requestRepo.createQueryBuilder("request")
        .leftJoinAndSelect("request.project", "project")
        .leftJoinAndSelect("project.author", "author")
        .where("request.requester_id = :userId", { userId });

      if (status) {
        queryBuilder.andWhere("request.status = :status", { status });
      }

      queryBuilder.orderBy("request.requested_at", "DESC");

      const requests = await queryBuilder.getMany();

      res.json({
        success: true,
        data: {
          requests,
          total: requests.length
        }
      });

    } catch (error: any) {
      console.error("❌ Get my collaboration requests error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch your collaboration requests",
        error: error.message
      });
    }
  }

  // ==================== GET PROJECTS USER CAN CONTRIBUTE TO (ORIGINAL) ====================
  
  /**
   * Get all projects the user is approved to contribute to
   * GET /api/my-projects/contributing
   */
  static async getProjectsUserCanContributeTo(req: Request, res: Response) {
    try {
      const userId = req.user.userId;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      
      // Find projects where user is an approved collaborator
      const projects = await projectRepo
        .createQueryBuilder("project")
        .leftJoinAndSelect("project.author", "author")
        .leftJoinAndSelect("project.tags", "tags")
        .where("project.approved_collaborators @> :collaborator", {
          collaborator: JSON.stringify([{ user_id: userId }])
        })
        .orderBy("project.updated_at", "DESC")
        .getMany();

      res.json({
        success: true,
        data: {
          projects,
          total: projects.length
        }
      });

    } catch (error: any) {
      console.error("❌ Get projects user can contribute to error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch projects you can contribute to",
        error: error.message
      });
    }
  }

  // ==================== ADD CONTRIBUTION (ORIGINAL) ====================
  
  /**
   * Add a contribution to a research project
   * POST /api/projects/:id/contributions
   */
// ==================== ADD CONTRIBUTION (FIXED) ====================
  
/**
 * Add a contribution to a research project
 * POST /api/projects/:id/contributions
 */
static async addContribution(req: Request, res: Response) {
  try {
    console.log("\n📝 ========== ADD CONTRIBUTION START ==========");
    
    const { id: projectId } = req.params;
    const userId = req.user.userId;
    const { contribution_title, contribution_content, contribution_section } = req.body;

    console.log("📥 Contribution Data:", { projectId, userId, contribution_title });

    // Validate input
    if (!contribution_title || !contribution_content) {
      return res.status(400).json({
        success: false,
        message: "Contribution title and content are required"
      });
    }

    // Get project
    const projectRepo = dbConnection.getRepository(ResearchProject);
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

    // Check if user is project owner or approved collaborator
    const isOwner = project.author.id === userId;
    const approvedCollaborators = project.approved_collaborators || [];
    const isCollaborator = approvedCollaborators.some(c => c.user_id === userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to contribute to this project"
      });
    }

    // ==================== FIXED: Handle file uploads with memoryStorage ====================
    let contributionFiles = [];
    if (req.files && (req.files as any).contribution_files) {
      const files = Array.isArray((req.files as any).contribution_files) 
        ? (req.files as any).contribution_files 
        : [(req.files as any).contribution_files];
      
      console.log(`📁 Processing ${files.length} file(s)...`);

      for (const file of files) {
        try {
          // Validate file
          const validation = validateFileForUpload(file);
          if (!validation.isValid) {
            console.warn(`⚠️ File validation failed: ${validation.error}`);
            continue;
          }

          // Create temporary file path for Cloudinary upload
          const fs = require('fs');
          const path = require('path');
          const os = require('os');
          
          const tempDir = path.join(os.tmpdir(), 'contribution-uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFilePath = path.join(
            tempDir, 
            `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.originalname}`
          );

          // Write buffer to temporary file
          fs.writeFileSync(tempFilePath, file.buffer);
          console.log(`✅ Temporary file created: ${tempFilePath}`);

          // Create file object with path for UploadToCloud
          const fileWithPath = {
            ...file,
            path: tempFilePath
          };

          // Upload to Cloudinary
          const uploadResult = await UploadToCloud(fileWithPath);
          console.log(`✅ File uploaded to Cloudinary: ${file.originalname}`);

          contributionFiles.push({
            file_url: uploadResult.secure_url,
            file_name: file.originalname,
            file_type: file.mimetype,
            file_size: file.size
          });

          // Clean up temporary file
          try {
            fs.unlinkSync(tempFilePath);
            console.log(`🗑️ Temporary file deleted: ${tempFilePath}`);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to delete temporary file: ${tempFilePath}`);
          }

        } catch (fileError: any) {
          console.error(`❌ Failed to upload file ${file.originalname}:`, fileError.message);
          // Continue with other files
        }
      }

      console.log(`✅ Successfully uploaded ${contributionFiles.length} file(s)`);
    }
    // ==================== END FIX ====================

    // Create contribution
    const contributionRepo = dbConnection.getRepository(ProjectContribution);
    const contribution = contributionRepo.create({
      project: { id: projectId },
      contributor: { id: userId },
      contribution_title: contribution_title.trim(),
      contribution_content: contribution_content.trim(),
      contribution_section: contribution_section?.trim() || null,
      contribution_files: contributionFiles.length > 0 ? contributionFiles : null,
      is_approved: isOwner // Auto-approve if owner
    });

    if (isOwner) {
      contribution.approved_at = new Date();
    }

    await contributionRepo.save(contribution);
    console.log("✅ Contribution saved");

    // Load complete contribution
    const savedContribution = await contributionRepo.findOne({
      where: { id: contribution.id },
      relations: ["contributor", "contributor.profile"]
    });

    console.log("📝 ========== ADD CONTRIBUTION END ==========\n");

    res.status(201).json({
      success: true,
      message: isOwner 
        ? "Contribution added successfully" 
        : "Contribution submitted for review",
      data: {
        contribution: savedContribution
      }
    });

  } catch (error: any) {
    console.error("❌ Add contribution error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add contribution",
      error: error.message
    });
  }
}

  // ==================== GET PROJECT CONTRIBUTIONS (ORIGINAL) ====================
  

static async getProjectContributions(req: Request, res: Response) {
  try {
    console.log("\n📋 ========== GET PROJECT CONTRIBUTIONS START ==========");
    
    const { id: projectId } = req.params;
    const { include_pending } = req.query;
    const userId = req.user?.userId;

    console.log("📥 Request Data:", { projectId, include_pending, userId });

    const projectRepo = dbConnection.getRepository(ResearchProject);
    const project = await projectRepo.findOne({
      where: { id: projectId },
      relations: ["author"]
    });

    if (!project) {
      console.log("❌ Project not found");
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    console.log("✅ Project found:", project.title);
    console.log("👤 Project author ID:", project.author.id);
    console.log("👤 Current user ID:", userId);

    const isOwner = userId && project.author.id === userId;
    console.log("🔐 Is owner:", isOwner);

    const contributionRepo = dbConnection.getRepository(ProjectContribution);
    const queryBuilder = contributionRepo.createQueryBuilder("contribution")
      .leftJoinAndSelect("contribution.contributor", "contributor")
      .leftJoinAndSelect("contributor.profile", "profile")
      .leftJoinAndSelect("contribution.project", "project")
      .where("contribution.project_id = :projectId", { projectId });

    // ==================== FIXED: Proper logic for showing contributions ====================
    
    if (isOwner) {
      // Owner can see all contributions
      if (include_pending === 'true') {
        console.log("✅ Owner requesting all contributions (including pending)");
        // No additional filter - show everything
      } else {
        console.log("✅ Owner requesting approved contributions only");
        queryBuilder.andWhere("contribution.is_approved = true");
      }
    } else {
      // Non-owners can only see approved contributions
      console.log("👥 Non-owner requesting contributions (approved only)");
      queryBuilder.andWhere("contribution.is_approved = true");
    }

    // ==================== END FIX ====================

    queryBuilder.orderBy("contribution.created_at", "DESC");

    console.log("🔍 Executing query...");
    const contributions = await queryBuilder.getMany();
    console.log(`✅ Found ${contributions.length} contribution(s)`);

    // Log each contribution for debugging
    contributions.forEach((contrib, idx) => {
      console.log(`📄 Contribution ${idx + 1}:`, {
        id: contrib.id,
        title: contrib.contribution_title,
        is_approved: contrib.is_approved,
        contributor: `${contrib.contributor.first_name} ${contrib.contributor.last_name}`,
        created_at: contrib.created_at
      });
    });

    console.log("📋 ========== GET PROJECT CONTRIBUTIONS END ==========\n");

    res.json({
      success: true,
      data: {
        contributions,
        total: contributions.length
      }
    });

  } catch (error: any) {
    console.error("❌ Get project contributions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contributions",
      error: error.message
    });
  }
}

static async updateContribution(req: Request, res: Response) {
  try {
    const { contributionId } = req.params;
    const userId = req.user.userId;
    const { contribution_title, contribution_content, contribution_section } = req.body;

    const contributionRepo = dbConnection.getRepository(ProjectContribution);
    const contribution = await contributionRepo.findOne({
      where: { id: contributionId },
      relations: ["contributor", "project"]
    });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: "Contribution not found"
      });
    }

    if (contribution.contributor.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this contribution"
      });
    }

    // Update fields
    if (contribution_title) contribution.contribution_title = contribution_title.trim();
    if (contribution_content) contribution.contribution_content = contribution_content.trim();
    if (contribution_section !== undefined) contribution.contribution_section = contribution_section?.trim() || null;

    // ==================== FIXED: Handle new file uploads ====================
    if (req.files && (req.files as any).contribution_files) {
      const files = Array.isArray((req.files as any).contribution_files) 
        ? (req.files as any).contribution_files 
        : [(req.files as any).contribution_files];
      
      const existingFiles = contribution.contribution_files || [];
      
      for (const file of files) {
        try {
          const validation = validateFileForUpload(file);
          if (!validation.isValid) continue;

          const fs = require('fs');
          const path = require('path');
          const os = require('os');
          
          const tempDir = path.join(os.tmpdir(), 'contribution-uploads');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          const tempFilePath = path.join(
            tempDir, 
            `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.originalname}`
          );

          fs.writeFileSync(tempFilePath, file.buffer);

          const fileWithPath = {
            ...file,
            path: tempFilePath
          };

          const uploadResult = await UploadToCloud(fileWithPath);
          
          existingFiles.push({
            file_url: uploadResult.secure_url,
            file_name: file.originalname,
            file_type: file.mimetype,
            file_size: file.size
          });

          try {
            fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to delete temporary file: ${tempFilePath}`);
          }

        } catch (fileError: any) {
          console.error(`❌ Failed to upload file ${file.originalname}:`, fileError.message);
        }
      }
      
      contribution.contribution_files = existingFiles;
    }
    // ==================== END FIX ====================

    await contributionRepo.save(contribution);

    const updatedContribution = await contributionRepo.findOne({
      where: { id: contributionId },
      relations: ["contributor", "contributor.profile"]
    });

    res.json({
      success: true,
      message: "Contribution updated successfully",
      data: {
        contribution: updatedContribution
      }
    });

  } catch (error: any) {
    console.error("❌ Update contribution error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contribution",
      error: error.message
    });
  }
}

  // ==================== DELETE CONTRIBUTION (ORIGINAL) ====================
  
  /**
   * Delete a contribution (contributor or project owner)
   * DELETE /api/contributions/:contributionId
   */
  static async deleteContribution(req: Request, res: Response) {
    try {
      const { contributionId } = req.params;
      const userId = req.user.userId;

      const contributionRepo = dbConnection.getRepository(ProjectContribution);
      const contribution = await contributionRepo.findOne({
        where: { id: contributionId },
        relations: ["contributor", "project", "project.author"]
      });

      if (!contribution) {
        return res.status(404).json({
          success: false,
          message: "Contribution not found"
        });
      }

      // Can delete if contributor or project owner
      const canDelete = contribution.contributor.id === userId || 
                       contribution.project.author.id === userId;

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to delete this contribution"
        });
      }

      await contributionRepo.remove(contribution);

      res.json({
        success: true,
        message: "Contribution deleted successfully"
      });

    } catch (error: any) {
      console.error("❌ Delete contribution error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete contribution",
        error: error.message
      });
    }
  }

  // ==================== GET PROJECT COLLABORATORS (ORIGINAL) ====================
  
  /**
   * Get all collaborators for a project (author + approved collaborators)
   * GET /api/projects/:id/collaborators
   */
  static async getProjectCollaborators(req: Request, res: Response) {
    try {
      console.log("\n👥 ========== GET PROJECT COLLABORATORS START ==========");
      
      const { id: projectId } = req.params;
      console.log("📥 Project ID:", projectId);

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["author", "author.profile"]
      });

      if (!project) {
        console.log("❌ Project not found");
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      console.log("✅ Project found:", project.title);

      // Get approved collaborators
      const approvedCollaborators = project.approved_collaborators || [];
      console.log("📊 Approved collaborators count:", approvedCollaborators.length);

      if (approvedCollaborators.length === 0) {
        console.log("ℹ️ No collaborators, returning only author");
        return res.json({
          success: true,
          data: {
            author: {
              id: project.author.id,
              first_name: project.author.first_name,
              last_name: project.author.last_name,
              email: project.author.email,
              profile_picture_url: project.author.profile_picture_url,
              institution: project.author.profile?.institution_name,
              role: 'Creator'
            },
            collaborators: [],
            total: 0
          }
        });
      }

      // Get collaborator details
      const userRepo = dbConnection.getRepository(User);
      const collaboratorIds = approvedCollaborators.map(c => c.user_id);
      
      console.log("🔍 Fetching collaborator details for IDs:", collaboratorIds);

      const collaborators = await userRepo.find({
        where: { id: In(collaboratorIds) },
        relations: ["profile"]
      });

      console.log("✅ Fetched", collaborators.length, "collaborators");

      // Add approval date to each collaborator
      const collaboratorsWithDetails = collaborators.map(collab => {
        const approvalInfo = approvedCollaborators.find(c => c.user_id === collab.id);
        return {
          id: collab.id,
          first_name: collab.first_name,
          last_name: collab.last_name,
          email: collab.email,
          profile_picture_url: collab.profile_picture_url,
          institution: collab.profile?.institution_name,
          approved_at: approvalInfo?.approved_at,
          role: 'Collaborator'
        };
      });

      console.log("👥 ========== GET PROJECT COLLABORATORS END ==========\n");

      res.json({
        success: true,
        data: {
          author: {
            id: project.author.id,
            first_name: project.author.first_name,
            last_name: project.author.last_name,
            email: project.author.email,
            profile_picture_url: project.author.profile_picture_url,
            institution: project.author.profile?.institution_name,
            role: 'Creator'
          },
          collaborators: collaboratorsWithDetails,
          total: collaboratorsWithDetails.length
        }
      });

    } catch (error: any) {
      console.error("❌ Get project collaborators error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch project collaborators",
        error: error.message
      });
    }
  }

  // ==================== REMOVE COLLABORATOR (ENHANCED) ====================
  
  /**
   * Remove a collaborator from project (creator only)
   * DELETE /api/projects/:id/collaborators/:userId
   * ENHANCEMENT: Now also removes from collaboration_info
   */
  static async removeCollaborator(req: Request, res: Response) {
    try {
      console.log("\n🗑️ ========== REMOVE COLLABORATOR START ==========");
      
      const { id: projectId, userId: collaboratorId } = req.params;
      const currentUserId = req.user.userId;

      console.log("📥 Request Data:", { projectId, collaboratorId, currentUserId });

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["author"]
      });

      if (!project) {
        console.log("❌ Project not found");
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Only project creator can remove collaborators
      if (project.author.id !== currentUserId) {
        console.log("❌ Unauthorized: User is not project creator");
        return res.status(403).json({
          success: false,
          message: "Only project creator can remove collaborators"
        });
      }

      // Remove from approved collaborators
      const approvedCollaborators = project.approved_collaborators || [];
      const initialCount = approvedCollaborators.length;
      
      const updatedCollaborators = approvedCollaborators.filter(
        c => c.user_id !== collaboratorId
      );

      if (updatedCollaborators.length === initialCount) {
        console.log("⚠️ Collaborator not found in approved list");
        return res.status(404).json({
          success: false,
          message: "Collaborator not found"
        });
      }

      project.approved_collaborators = updatedCollaborators;
      project.collaborator_count = updatedCollaborators.length;

      // ==================== ENHANCEMENT: UPDATE COLLABORATION_INFO ====================
      console.log("\n📊 Updating collaboration_info...");

      const collaborationInfo = project.collaboration_info || [];
      const updatedCollaborationInfo = collaborationInfo.filter(
        info => info.user_id !== collaboratorId
      );
      
      project.collaboration_info = updatedCollaborationInfo;
      console.log("✅ Removed user from collaboration_info");
      // ==================== END ENHANCEMENT ====================

      await projectRepo.save(project);
      console.log("✅ Collaborator removed successfully");

      console.log("🗑️ ========== REMOVE COLLABORATOR END ==========\n");

      res.json({
        success: true,
        message: "Collaborator removed successfully",
        data: {
          collaborator_count: project.collaborator_count
        }
      });

    } catch (error: any) {
      console.error("❌ Remove collaborator error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove collaborator",
        error: error.message
      });
    }
  }


  // Add to CollaborationController class

/**
 * Approve a project contribution (project owner only)
 * PATCH /api/contributions/:contributionId/approve
 */
static async approveContribution(req: Request, res: Response) {
  try {
    console.log("\n✅ ========== APPROVE CONTRIBUTION START ==========");
    
    const { contributionId } = req.params;
    const userId = req.user.userId;

    console.log("📥 Request Data:", { contributionId, userId });

    const contributionRepo = dbConnection.getRepository(ProjectContribution);
    const contribution = await contributionRepo.findOne({
      where: { id: contributionId },
      relations: ["project", "project.author", "contributor", "contributor.profile"]
    });

    if (!contribution) {
      console.log("❌ Contribution not found");
      return res.status(404).json({
        success: false,
        message: "Contribution not found"
      });
    }

    console.log("✅ Contribution found:", {
      title: contribution.contribution_title,
      project: contribution.project.title,
      projectOwner: contribution.project.author.id,
      currentUser: userId
    });

    // Verify project ownership
    if (contribution.project.author.id !== userId) {
      console.log("❌ Unauthorized: User is not project owner");
      return res.status(403).json({
        success: false,
        message: "Only project owner can approve contributions"
      });
    }

    // Check if already approved
    if (contribution.is_approved) {
      console.log("⚠️ Contribution already approved");
      return res.status(400).json({
        success: false,
        message: "Contribution is already approved"
      });
    }

    // Update contribution status
    contribution.is_approved = true;
    contribution.approved_at = new Date();
    await contributionRepo.save(contribution);
    console.log("✅ Contribution approved");

    // Send approval email to contributor
    console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
    
    try {
      const emailHtml = CollaborationEmailTemplates.getContributionApprovedTemplate(
        contribution.project,
        contribution.contributor,
        contribution
      );

      await sendEmail({
        to: contribution.contributor.email,
        subject: `🎉 Your Contribution to "${contribution.project.title}" Has Been Approved!`,
        html: emailHtml
      });

      console.log(`✅ Approval email sent to: ${contribution.contributor.email}`);
    } catch (emailError: any) {
      console.error("❌ Email sending failed:", emailError.message);
      // Don't fail the request if email fails
    }

    console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
    console.log("✅ ========== APPROVE CONTRIBUTION END ==========\n");

    res.json({
      success: true,
      message: "Contribution approved successfully",
      data: {
        contribution: {
          id: contribution.id,
          is_approved: contribution.is_approved,
          approved_at: contribution.approved_at
        }
      }
    });

  } catch (error: any) {
    console.error("❌ Approve contribution error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve contribution",
      error: error.message
    });
  }
}

}