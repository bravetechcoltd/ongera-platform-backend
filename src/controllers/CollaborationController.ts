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
  
  static async requestCollaboration(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = req.user.userId;
      const { reason, expertise } = req.body;
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide a reason for wanting to collaborate"
        });
      }

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

      if (project.collaboration_status === CollaborationStatus.SOLO) {
        return res.status(400).json({
          success: false,
          message: "This project is not open for collaboration"
        });
      }

      if (project.author.id === userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot request to collaborate on your own project"
        });
      }

      const approvedCollaborators = project.approved_collaborators || [];
      if (approvedCollaborators.some(c => c.user_id === userId)) {
        return res.status(400).json({
          success: false,
          message: "You are already a collaborator on this project"
        });
      }

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

      const userRepo = dbConnection.getRepository(User);
      const requester = await userRepo.findOne({
        where: { id: userId },
        relations: ["profile"]
      });

      const collaborationRequest = requestRepo.create({
        project: { id: projectId },
        requester: { id: userId },
        reason: reason.trim(),
        expertise: expertise?.trim() || null,
        status: CollaborationRequestStatus.PENDING
      });

      await requestRepo.save(collaborationRequest);

      const savedRequest = await requestRepo.findOne({
        where: { id: collaborationRequest.id },
        relations: ["project", "requester", "requester.profile"]
      });

      const collaborationInfo = project.collaboration_info || [];
      
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
      } catch (emailError: any) {
      }

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
      res.status(500).json({
        success: false,
        message: "Failed to submit collaboration request",
        error: error.message
      });
    }
  }

  static async getProjectCollaborationRequests(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = req.user.userId;
      const { status } = req.query;

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
      res.status(500).json({
        success: false,
        message: "Failed to fetch collaboration requests",
        error: error.message
      });
    }
  }

  static async approveCollaborationRequest(req: Request, res: Response) {
    try {
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

      request.status = CollaborationRequestStatus.APPROVED;
      request.responded_at = new Date();
      await requestRepo.save(request);

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

      if (project.collaboration_status === CollaborationStatus.SEEKING_COLLABORATORS) {
        project.collaboration_status = CollaborationStatus.COLLABORATIVE;
      }

      const collaborationInfo = project.collaboration_info || [];
      
      const userCollabIndex = collaborationInfo.findIndex(
        info => info.user_id === request.requester.id
      );

      if (userCollabIndex !== -1) {
        collaborationInfo[userCollabIndex] = {
          ...collaborationInfo[userCollabIndex],
          status: CollaborationInfoStatus.APPROVED,
          updated_at: new Date()
        };
      } else {
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
      }

      project.collaboration_info = collaborationInfo;
      await projectRepo.save(project);

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
      } catch (emailError: any) {
      }

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
      res.status(500).json({
        success: false,
        message: "Failed to approve collaboration request",
        error: error.message
      });
    }
  }

  static async rejectCollaborationRequest(req: Request, res: Response) {
    try {
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

      request.status = CollaborationRequestStatus.REJECTED;
      request.rejection_reason = rejection_reason?.trim() || null;
      request.responded_at = new Date();
      await requestRepo.save(request);

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: request.project.id }
      });

      const collaborationInfo = project.collaboration_info || [];
      
      const userCollabIndex = collaborationInfo.findIndex(
        info => info.user_id === request.requester.id
      );

      if (userCollabIndex !== -1) {
        collaborationInfo[userCollabIndex] = {
          ...collaborationInfo[userCollabIndex],
          status: CollaborationInfoStatus.REJECTED,
          updated_at: new Date(),
          rejection_reason: rejection_reason?.trim() || null
        };
      } else {
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
      }

      project.collaboration_info = collaborationInfo;
      await projectRepo.save(project);

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
      } catch (emailError: any) {
      }

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
      res.status(500).json({
        success: false,
        message: "Failed to reject collaboration request",
        error: error.message
      });
    }
  }

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
      res.status(500).json({
        success: false,
        message: "Failed to fetch your collaboration requests",
        error: error.message
      });
    }
  }

  static async getProjectsUserCanContributeTo(req: Request, res: Response) {
    try {
      const userId = req.user.userId;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      
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
      res.status(500).json({
        success: false,
        message: "Failed to fetch projects you can contribute to",
        error: error.message
      });
    }
  }

  static async addContribution(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = req.user.userId;
      const { contribution_title, contribution_content, contribution_section } = req.body;

      if (!contribution_title || !contribution_content) {
        return res.status(400).json({
          success: false,
          message: "Contribution title and content are required"
        });
      }

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

      const isOwner = project.author.id === userId;
      const approvedCollaborators = project.approved_collaborators || [];
      const isCollaborator = approvedCollaborators.some(c => c.user_id === userId);

      if (!isOwner && !isCollaborator) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to contribute to this project"
        });
      }

      let contributionFiles = [];
      if (req.files && (req.files as any).contribution_files) {
        const files = Array.isArray((req.files as any).contribution_files) 
          ? (req.files as any).contribution_files 
          : [(req.files as any).contribution_files];
        
        for (const file of files) {
          try {
            const validation = validateFileForUpload(file);
            if (!validation.isValid) {
              continue;
            }

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

            contributionFiles.push({
              file_url: uploadResult.secure_url,
              file_name: file.originalname,
              file_type: file.mimetype,
              file_size: file.size
            });

            try {
              fs.unlinkSync(tempFilePath);
            } catch (cleanupError) {
            }

          } catch (fileError: any) {
          }
        }
      }

      const contributionRepo = dbConnection.getRepository(ProjectContribution);
      const contribution = contributionRepo.create({
        project: { id: projectId },
        contributor: { id: userId },
        contribution_title: contribution_title.trim(),
        contribution_content: contribution_content.trim(),
        contribution_section: contribution_section?.trim() || null,
        contribution_files: contributionFiles.length > 0 ? contributionFiles : null,
        is_approved: isOwner
      });

      if (isOwner) {
        contribution.approved_at = new Date();
      }

      await contributionRepo.save(contribution);

      const savedContribution = await contributionRepo.findOne({
        where: { id: contribution.id },
        relations: ["contributor", "contributor.profile"]
      });

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
      res.status(500).json({
        success: false,
        message: "Failed to add contribution",
        error: error.message
      });
    }
  }

  static async getProjectContributions(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const { include_pending } = req.query;
      const userId = req.user?.userId;

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

      const isOwner = userId && project.author.id === userId;

      const contributionRepo = dbConnection.getRepository(ProjectContribution);
      const queryBuilder = contributionRepo.createQueryBuilder("contribution")
        .leftJoinAndSelect("contribution.contributor", "contributor")
        .leftJoinAndSelect("contributor.profile", "profile")
        .leftJoinAndSelect("contribution.project", "project")
        .where("contribution.project_id = :projectId", { projectId });

      if (isOwner) {
        if (include_pending !== 'true') {
          queryBuilder.andWhere("contribution.is_approved = true");
        }
      } else {
        queryBuilder.andWhere("contribution.is_approved = true");
      }

      queryBuilder.orderBy("contribution.created_at", "DESC");

      const contributions = await queryBuilder.getMany();

      res.json({
        success: true,
        data: {
          contributions,
          total: contributions.length
        }
      });

    } catch (error: any) {
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

      if (contribution_title) contribution.contribution_title = contribution_title.trim();
      if (contribution_content) contribution.contribution_content = contribution_content.trim();
      if (contribution_section !== undefined) contribution.contribution_section = contribution_section?.trim() || null;

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
            }

          } catch (fileError: any) {
          }
        }
        
        contribution.contribution_files = existingFiles;
      }

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
      res.status(500).json({
        success: false,
        message: "Failed to update contribution",
        error: error.message
      });
    }
  }

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
      res.status(500).json({
        success: false,
        message: "Failed to delete contribution",
        error: error.message
      });
    }
  }

  static async getProjectCollaborators(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;

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

      const approvedCollaborators = project.approved_collaborators || [];

      if (approvedCollaborators.length === 0) {
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

      const userRepo = dbConnection.getRepository(User);
      const collaboratorIds = approvedCollaborators.map(c => c.user_id);
      
      const collaborators = await userRepo.find({
        where: { id: In(collaboratorIds) },
        relations: ["profile"]
      });

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
      res.status(500).json({
        success: false,
        message: "Failed to fetch project collaborators",
        error: error.message
      });
    }
  }

  static async removeCollaborator(req: Request, res: Response) {
    try {
      const { id: projectId, userId: collaboratorId } = req.params;
      const currentUserId = req.user.userId;

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

      if (project.author.id !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: "Only project creator can remove collaborators"
        });
      }

      const approvedCollaborators = project.approved_collaborators || [];
      const initialCount = approvedCollaborators.length;
      
      const updatedCollaborators = approvedCollaborators.filter(
        c => c.user_id !== collaboratorId
      );

      if (updatedCollaborators.length === initialCount) {
        return res.status(404).json({
          success: false,
          message: "Collaborator not found"
        });
      }

      project.approved_collaborators = updatedCollaborators;
      project.collaborator_count = updatedCollaborators.length;

      const collaborationInfo = project.collaboration_info || [];
      const updatedCollaborationInfo = collaborationInfo.filter(
        info => info.user_id !== collaboratorId
      );
      
      project.collaboration_info = updatedCollaborationInfo;

      await projectRepo.save(project);

      res.json({
        success: true,
        message: "Collaborator removed successfully",
        data: {
          collaborator_count: project.collaborator_count
        }
      });

    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to remove collaborator",
        error: error.message
      });
    }
  }

  static async approveContribution(req: Request, res: Response) {
    try {
      const { contributionId } = req.params;
      const userId = req.user.userId;

      const contributionRepo = dbConnection.getRepository(ProjectContribution);
      const contribution = await contributionRepo.findOne({
        where: { id: contributionId },
        relations: ["project", "project.author", "contributor", "contributor.profile"]
      });

      if (!contribution) {
        return res.status(404).json({
          success: false,
          message: "Contribution not found"
        });
      }

      if (contribution.project.author.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only project owner can approve contributions"
        });
      }

      if (contribution.is_approved) {
        return res.status(400).json({
          success: false,
          message: "Contribution is already approved"
        });
      }

      contribution.is_approved = true;
      contribution.approved_at = new Date();
      await contributionRepo.save(contribution);

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
      } catch (emailError: any) {
      }

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
      res.status(500).json({
        success: false,
        message: "Failed to approve contribution",
        error: error.message
      });
    }
  }

}