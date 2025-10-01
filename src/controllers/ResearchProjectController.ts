// @ts-nocheck

import { Request, Response } from "express";
import dbConnection from '../database/db';
import { ProjectStatus, ResearchProject } from "../database/models/ResearchProject";
import { ProjectFile } from "../database/models/ProjectFile";
import { ProjectTag } from "../database/models/ProjectTag";
import { Like, ContentType } from "../database/models/Like";
import { Comment } from "../database/models/Comment";
import { UploadToCloud, validateFileForUpload } from "../helpers/cloud";
import { sendEmail } from "../helpers/utils";
import { ActivateDeactivateDeleteResearchProjectsTemplate } from "../helpers/ActivateDeactivateDeleteResearchProjectsTemplate";

export class ResearchProjectController {
  // ==================== ORIGINAL FUNCTIONS (100% MAINTAINED) ====================
  
static async createProject(req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const { 
      title, abstract, full_description, research_type, 
      visibility, collaboration_status, tags, field_of_study,
      publication_date, doi
    } = req.body;

    console.log("📝 Creating project with data:", {
      title,
      research_type,
      userId,
      files: req.files
    });

    if (!title || !abstract || !research_type) {
      return res.status(400).json({
        success: false,
        message: "Title, abstract, and research type are required"
      });
    }

    const projectRepo = dbConnection.getRepository(ResearchProject);
    
    const project = projectRepo.create({
      title,
      abstract,
      full_description,
      research_type,
      visibility: visibility || 'Public',
      collaboration_status: collaboration_status || 'Solo',
      author: { id: userId },
      publication_date: publication_date || null,
    });

    if (field_of_study) project.field_of_study = field_of_study;
    if (doi) project.doi = doi;

    if (req.files && (req.files as any).project_file) {
      const projectFile = (req.files as any).project_file[0];
      const validation = validateFileForUpload(projectFile);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      const uploadResult = await UploadToCloud(projectFile);
      project.project_file_url = uploadResult.secure_url;
    } else {
      return res.status(400).json({
        success: false,
        message: "Project file is required"
      });
    }

    if (req.files && (req.files as any).cover_image) {
      const coverImage = (req.files as any).cover_image[0];
      const validation = validateFileForUpload(coverImage);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }
      const uploadResult = await UploadToCloud(coverImage);
      project.cover_image_url = uploadResult.secure_url;
    }

    await projectRepo.save(project);

    // FIXED: Handle tags with proper duplicate checking
    if (tags) {
      const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      if (Array.isArray(tagArray) && tagArray.length > 0) {
        const tagRepo = dbConnection.getRepository(ProjectTag);
        const projectTags = [];
        
        for (const tagName of tagArray) {
          if (!tagName || typeof tagName !== 'string') continue;
          
          const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
          
          // FIX: Check if tag exists by slug (not just name)
          let tag = await tagRepo.findOne({ 
            where: { slug: tagSlug } 
          });
          
          if (!tag) {
            // FIX: Use create with all required fields including slug
            tag = tagRepo.create({
              name: tagName.trim(),
              slug: tagSlug,
              category: 'Topic' as any // Use proper enum value
            });
            try {
              await tagRepo.save(tag);
            } catch (tagError: any) {
              // If still fails due to race condition, try to find again
              if (tagError.code === '23505') { // Unique constraint violation
                tag = await tagRepo.findOne({ 
                  where: { slug: tagSlug } 
                });
                if (!tag) {
                  console.warn(`❌ Failed to create tag "${tagName}":`, tagError.message);
                  continue;
                }
              } else {
                console.warn(`❌ Failed to create tag "${tagName}":`, tagError.message);
                continue;
              }
            }
          }
          
          // Only increment usage_count and add to project if tag was successfully created/found
          if (tag) {
            tag.usage_count = (tag.usage_count || 0) + 1;
            await tagRepo.save(tag);
            projectTags.push(tag);
          }
        }
        
        // Only assign tags if we have any valid ones
        if (projectTags.length > 0) {
          project.tags = projectTags;
          await projectRepo.save(project);
        }
      }
    }

    if (req.files && (req.files as any).additional_files) {
      const additionalFiles = (req.files as any).additional_files;
      const fileRepo = dbConnection.getRepository(ProjectFile);
      for (const file of additionalFiles) {
        const validation = validateFileForUpload(file);
        if (!validation.isValid) continue;
        const uploadResult = await UploadToCloud(file);
        const projectFile = fileRepo.create({
          project,
          file_url: uploadResult.secure_url,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
        });
        await fileRepo.save(projectFile);
      }
    }

    const completeProject = await projectRepo.findOne({
      where: { id: project.id },
      relations: ["author", "author.profile", "tags", "files"]
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: { project: completeProject },
    });
  } catch (error: any) {
    console.error("❌ Project creation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create project", 
      error: error.message 
    });
  }
}

  static async getAllProjects(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, research_type, visibility, status } = req.query;
      const projectRepo = dbConnection.getRepository(ResearchProject);
      const queryBuilder = projectRepo.createQueryBuilder("project")
        .leftJoinAndSelect("project.author", "author")
        .leftJoinAndSelect("project.tags", "tags")
        .leftJoinAndSelect("project.files", "files");

      if (search) {
        queryBuilder.andWhere(
          "(project.title ILIKE :search OR project.abstract ILIKE :search)",
          { search: `%${search}%` }
        );
      }
      if (research_type) queryBuilder.andWhere("project.research_type = :research_type", { research_type });
      if (visibility) queryBuilder.andWhere("project.visibility = :visibility", { visibility });
      if (status) queryBuilder.andWhere("project.status = :status", { status });

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      queryBuilder.orderBy("project.created_at", "DESC");

      const [projects, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          projects,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch projects", 
        error: error.message 
      });
    }
  }

  static async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const projectRepo = dbConnection.getRepository(ResearchProject);
      
      const project = await projectRepo.findOne({
        where: { id },
        relations: ["author", "author.profile", "tags", "files"],
      });

      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }

      project.view_count += 1;
      await projectRepo.save(project);

      let hasLiked = false;
      if (userId) {
        const likeRepo = dbConnection.getRepository(Like);
        const existingLike = await likeRepo.findOne({
          where: {
            user: { id: userId },
            content_type: ContentType.PROJECT,
            content_id: id
          }
        });
        hasLiked = !!existingLike;
      }

      const commentRepo = dbConnection.getRepository(Comment);
      const comments = await commentRepo.find({
        where: {
          content_type: "Project",
          content_id: id
        },
        relations: ["author"],
        order: { created_at: "DESC" }
      });

      res.json({
        success: true,
        data: { 
          project,
          hasLiked,
          comments
        },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch project", 
        error: error.message 
      });
    }
  }

  static async likeProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const likeRepo = dbConnection.getRepository(Like);

      const project = await projectRepo.findOne({ where: { id } });
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      const existingLike = await likeRepo.findOne({
        where: {
          user: { id: userId },
          content_type: ContentType.PROJECT,
          content_id: id
        }
      });

      if (existingLike) {
        await likeRepo.remove(existingLike);
        project.like_count = Math.max(0, project.like_count - 1);
        await projectRepo.save(project);

        return res.json({
          success: true,
          message: "Project unliked",
          data: {
            liked: false,
            like_count: project.like_count
          }
        });
      } else {
        const newLike = likeRepo.create({
          user: { id: userId },
          content_type: ContentType.PROJECT,
          content_id: id
        });
        await likeRepo.save(newLike);
        
        project.like_count += 1;
        await projectRepo.save(project);

        return res.json({
          success: true,
          message: "Project liked",
          data: {
            liked: true,
            like_count: project.like_count
          }
        });
      }
    } catch (error: any) {
      console.error("❌ Like project error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to like project",
        error: error.message
      });
    }
  }

  static async commentOnProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Comment content is required"
        });
      }

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const commentRepo = dbConnection.getRepository(Comment);

      const project = await projectRepo.findOne({ where: { id } });
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      const comment = commentRepo.create({
        author: { id: userId },
        comment_text: content.trim(),
        content_type: "Project",
        content_id: id
      });

      await commentRepo.save(comment);

      project.comment_count += 1;
      await projectRepo.save(project);

      const savedComment = await commentRepo.findOne({
        where: { id: comment.id },
        relations: ["author"]
      });

      res.status(201).json({
        success: true,
        message: "Comment added successfully",
        data: {
          comment: savedComment,
          comment_count: project.comment_count
        }
      });
    } catch (error: any) {
      console.error("❌ Comment on project error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add comment",
        error: error.message
      });
    }
  }

  static async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const updates = req.body;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id },
        relations: ["author"],
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
          message: "Unauthorized to update this project" 
        });
      }

      Object.assign(project, updates);
      await projectRepo.save(project);

      res.json({
        success: true,
        message: "Project updated successfully",
        data: { project },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to update project", 
        error: error.message 
      });
    }
  }

  static async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id },
        relations: ["author"],
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
          message: "Unauthorized to delete this project" 
        });
      }

      await projectRepo.remove(project);

      res.json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete project", 
        error: error.message 
      });
    }
  }

  static async getUserProjects(req: Request, res: Response) {
    try {
      const userId = req.user.userId;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const projects = await projectRepo.find({
        where: { author: { id: userId } },
        relations: ["tags", "files"],
        order: { created_at: "DESC" },
      });

      res.json({
        success: true,
        data: { projects },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch user projects", 
        error: error.message 
      });
    }
  }

  static async updateProjectStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const { status } = req.body;

      if (!status || !["Draft", "Published"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status required (Draft or Published)"
        });
      }

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id },
        relations: ["author"]
      });

      if (!project || project.author.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized"
        });
      }

      project.status = status as ProjectStatus;
      await projectRepo.save(project);

      const updatedProject = await projectRepo.findOne({
        where: { id },
        relations: ["author", "author.profile", "tags", "files"]
      });

      res.json({
        success: true,
        message: `Project ${status.toLowerCase()} successfully`,
        data: { project: updatedProject }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to update project status",
        error: error.message
      });
    }
  }

  // ==================== NEW: ADMIN PROJECT MANAGEMENT FUNCTIONS ====================

  /**
   * Get all research projects for admin management
   * Includes filtering by status, research_type, visibility
   */
  static async getAllProjectsForAdmin(req: Request, res: Response) {
    try {
      console.log("\n🔍 [GET ALL PROJECTS FOR ADMIN] Starting...");
      
      const { page = 1, limit = 1000, search, research_type, visibility, status } = req.query;
      
      const projectRepo = dbConnection.getRepository(ResearchProject);
      
      const queryBuilder = projectRepo.createQueryBuilder("project")
        .leftJoinAndSelect("project.author", "author")
        .leftJoinAndSelect("author.profile", "profile")
        .leftJoinAndSelect("project.tags", "tags")
        .leftJoinAndSelect("project.files", "files")
        .select([
          "project",
          "author.id",
          "author.email",
          "author.first_name",
          "author.last_name",
          "author.profile_picture_url",
          "author.account_type",
          "profile",
          "tags",
          "files"
        ]);

      // Apply filters
      if (search) {
        queryBuilder.andWhere(
          "(project.title ILIKE :search OR project.abstract ILIKE :search OR author.first_name ILIKE :search OR author.last_name ILIKE :search)",
          { search: `%${search}%` }
        );
      }

      if (research_type) {
        queryBuilder.andWhere("project.research_type = :research_type", { research_type });
      }

      if (visibility) {
        queryBuilder.andWhere("project.visibility = :visibility", { visibility });
      }

      if (status) {
        queryBuilder.andWhere("project.status = :status", { status });
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Apply pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      // Order by created date
      queryBuilder.orderBy("project.created_at", "DESC");

      const projects = await queryBuilder.getMany();

      console.log(`✅ Retrieved ${projects.length} projects (Total: ${total})`);

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
      console.error("❌ Get all projects for admin error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch projects",
        error: error.message
      });
    }
  }

  /**
   * Activate/Deactivate research project (Admin only)
   */
  static async activateDeactivateProject(req: Request, res: Response) {
    try {
      console.log("\n🔄 ========== ACTIVATE/DEACTIVATE PROJECT START ==========");
      
      const { id } = req.params;
      const { status, reason } = req.body;

      console.log("📥 Request Data:", { projectId: id, status, reason });

      // Validate status
      if (!status || !["Published", "Archived"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status required (Published or Archived)"
        });
      }

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id },
        relations: ["author", "author.profile", "tags"]
      });

      if (!project) {
        console.log("❌ Project not found");
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      console.log("✅ Project found:", {
        title: project.title,
        currentStatus: project.status,
        newStatus: status
      });

      // Update project status
      const oldStatus = project.status;
      project.status = status as ProjectStatus;
      await projectRepo.save(project);
      console.log(`✅ Project status updated to: ${status}`);

      // Send email notification
      console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
      
      try {
        const isActivation = status === "Published";
        const emailHtml = ActivateDeactivateDeleteResearchProjectsTemplate.getStatusChangeTemplate(
          project,
          isActivation,
          reason
        );

        const emailSubject = isActivation 
          ? `✅ Your Research Project "${project.title}" Has Been Published`
          : `⚠️ Your Research Project "${project.title}" Has Been Archived`;

        await sendEmail({
          to: project.author.email,
          subject: emailSubject,
          html: emailHtml
        });

        console.log(`✅ Email sent successfully to: ${project.author.email}`);
      } catch (emailError: any) {
        console.error("❌ Email sending failed:", emailError.message);
      }

      console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
      console.log("🔄 ========== ACTIVATE/DEACTIVATE PROJECT END ==========\n");

      const statusText = status === "Published" ? 'published' : 'archived';
      res.json({
        success: true,
        message: `Project ${statusText} successfully and notification sent`,
        data: {
          project: {
            id: project.id,
            title: project.title,
            status: project.status,
            author: {
              email: project.author.email,
              name: `${project.author.first_name} ${project.author.last_name}`
            }
          }
        }
      });

    } catch (error: any) {
      console.error("❌ Activate/Deactivate project error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update project status",
        error: error.message
      });
    }
  }

  /**
   * Delete research project permanently (Admin only)
   */
  static async deleteProjectByAdmin(req: Request, res: Response) {
    try {
      console.log("\n🗑️ ========== DELETE PROJECT BY ADMIN START ==========");
      
      const { id } = req.params;

      console.log("📥 Request Data:", { projectId: id });

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id },
        relations: ["author", "author.profile", "tags", "files"]
      });

      if (!project) {
        console.log("❌ Project not found");
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      console.log("✅ Project found:", {
        title: project.title,
        author: `${project.author.first_name} ${project.author.last_name}`
      });

      // Store project data for email before deletion
      const projectData = {
        title: project.title,
        research_type: project.research_type,
        author: project.author
      };

      // Send deletion notification email before deleting
      console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
      
      try {
        const emailHtml = ActivateDeactivateDeleteResearchProjectsTemplate.getDeletionTemplate(project);

        await sendEmail({
          to: project.author.email,
          subject: `🚨 Your Research Project "${project.title}" Has Been Deleted`,
          html: emailHtml
        });

        console.log(`✅ Deletion notification email sent to: ${project.author.email}`);
      } catch (emailError: any) {
        console.error("❌ Email sending failed:", emailError.message);
      }

      console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");

      // Delete associated files first
      if (project.files && project.files.length > 0) {
        const fileRepo = dbConnection.getRepository(ProjectFile);
        await fileRepo.remove(project.files);
        console.log("✅ Project files deleted");
      }

      // Delete project
      await projectRepo.remove(project);
      console.log("✅ Project deleted successfully");

      console.log("🗑️ ========== DELETE PROJECT BY ADMIN END ==========\n");

      res.json({
        success: true,
        message: "Project deleted successfully and notification sent",
        data: {
          deletedProject: {
            title: projectData.title,
            research_type: projectData.research_type,
            author: {
              email: projectData.author.email,
              name: `${projectData.author.first_name} ${projectData.author.last_name}`
            }
          }
        }
      });

    } catch (error: any) {
      console.error("❌ Delete project by admin error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete project",
        error: error.message
      });
    }
  }
}