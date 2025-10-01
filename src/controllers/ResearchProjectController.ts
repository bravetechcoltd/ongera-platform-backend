//@ts-nocheck

import { Request, Response } from "express";
import dbConnection from '../database/db';
import { CollaborationInfoStatus, CollaborationStatus, ProjectStatus, ResearchProject } from "../database/models/ResearchProject";
import { ProjectFile } from "../database/models/ProjectFile";
import { ProjectTag } from "../database/models/ProjectTag";
import { Like, ContentType } from "../database/models/Like";
import { Comment } from "../database/models/Comment";
import { UploadToCloud, validateFileForUpload, DeleteFromCloud } from "../helpers/cloud";
import { sendEmail } from "../helpers/utils";
import { ActivateDeactivateDeleteResearchProjectsTemplate } from "../helpers/ActivateDeactivateDeleteResearchProjectsTemplate";
import { User } from "../database/models/User";
import { In } from "typeorm";
import { CollaborationRequest, CollaborationRequestStatus } from "../database/models/CollaborationRequest";
import { ProjectContribution } from "../database/models/ProjectContribution";
import { CommunityPost } from "../database/models/CommunityPost";
import { ProjectApproval } from "../database/models/ProjectApproval";

export class ResearchProjectController {

static async searchProjects(req: Request, res: Response) {
  try {
    const { 
      q = "", 
      page = 1, 
      limit = 10,
      research_type,
      field_of_study,
      academic_level,
      visibility,
      status,
      sort_by = "relevance"
    } = req.query;

    const projectRepo = dbConnection.getRepository(ResearchProject);
    
    const queryBuilder = projectRepo.createQueryBuilder("project")
      .leftJoinAndSelect("project.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("author.assignedInstructor", "assignedInstructor")
      .leftJoinAndSelect("assignedInstructor.instructor", "instructor")
      .leftJoinAndSelect("instructor.profile", "instructorProfile")
      .leftJoinAndSelect("project.tags", "tags")
      .leftJoinAndSelect("project.files", "files")
      .where("project.status = :publishedStatus", { publishedStatus: ProjectStatus.PUBLISHED });

    if (q && q !== "") {
      queryBuilder.andWhere(
        "(project.title ILIKE :q OR project.abstract ILIKE :q OR project.full_description ILIKE :q)",
        { q: `%${q}%` }
      );
    }

    if (research_type) {
      queryBuilder.andWhere("project.research_type = :research_type", { research_type });
    }

    if (field_of_study) {
      queryBuilder.andWhere("project.field_of_study ILIKE :field", { 
        field: `%${field_of_study}%` 
      });
    }

    if (academic_level) {
      queryBuilder.andWhere("project.academic_level = :academic_level", { academic_level });
    }

    if (visibility) {
      queryBuilder.andWhere("project.visibility = :visibility", { visibility });
    }

    if (status) {
      queryBuilder.andWhere("project.status = :status", { status });
    }

    if (sort_by === "newest") {
      queryBuilder.orderBy("project.created_at", "DESC");
    } else if (sort_by === "most_viewed") {
      queryBuilder.orderBy("project.view_count", "DESC");
    } else if (sort_by === "most_downloaded") {
      queryBuilder.orderBy("project.download_count", "DESC");
    } else if (sort_by === "relevance" && q && q !== "") {
      const allMatchingProjects = await queryBuilder.getMany();
      
      const searchTerm = q.toString().toLowerCase();
      const sortedProjects = allMatchingProjects.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const aAbstract = a.abstract.toLowerCase();
        const bAbstract = b.abstract.toLowerCase();
        
        const aExactTitle = aTitle === searchTerm ? 0 : 1;
        const bExactTitle = bTitle === searchTerm ? 0 : 1;
        
        if (aExactTitle !== bExactTitle) {
          return aExactTitle - bExactTitle;
        }
        
        const aStartsWith = aTitle.startsWith(searchTerm) ? 0 : 1;
        const bStartsWith = bTitle.startsWith(searchTerm) ? 0 : 1;
        
        if (aStartsWith !== bStartsWith) {
          return aStartsWith - bStartsWith;
        }
        
        const aContains = aTitle.includes(searchTerm) ? 0 : 1;
        const bContains = bTitle.includes(searchTerm) ? 0 : 1;
        
        if (aContains !== bContains) {
          return aContains - bContains;
        }
        
        const aAbstractContains = aAbstract.includes(searchTerm) ? 0 : 1;
        const bAbstractContains = bAbstract.includes(searchTerm) ? 0 : 1;
        
        if (aAbstractContains !== bAbstractContains) {
          return aAbstractContains - bAbstractContains;
        }
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      const skip = (Number(page) - 1) * Number(limit);
      const paginatedProjects = sortedProjects.slice(skip, skip + Number(limit));
      
      const formattedProjects = paginatedProjects.map(project => {
        const hasInstructor = project.author.assignedInstructor && 
                             project.author.assignedInstructor.length > 0 &&
                             project.author.assignedInstructor[0].instructor?.profile;
        
        const institutionData = hasInstructor 
          ? {
              name: project.author.assignedInstructor[0].instructor.profile.institution_name,
              department: project.author.assignedInstructor[0].instructor.profile.department,
              source: 'instructor'
            }
          : project.author.profile ? {
              name: project.author.profile.institution_name,
              department: project.author.profile.department,
              source: 'self'
            } : null;

        return {
          id: project.id,
          title: project.title,
          abstract: project.abstract,
          research_type: project.research_type,
          field_of_study: project.field_of_study,
          academic_level: project.academic_level,
          visibility: project.visibility,
          status: project.status,
          view_count: project.view_count,
          download_count: project.download_count,
          like_count: project.like_count,
          comment_count: project.comment_count,
          collaborator_count: project.collaborator_count,
          created_at: project.created_at,
          updated_at: project.updated_at,
          cover_image_url: project.cover_image_url,
          author: {
            id: project.author.id,
            first_name: project.author.first_name,
            last_name: project.author.last_name,
            full_name: `${project.author.first_name} ${project.author.last_name}`,
            profile_picture_url: project.author.profile_picture_url,
            account_type: project.author.account_type,
            institution: institutionData
          },
          tags: project.tags?.map(tag => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug
          })) || []
        };
      });

      return res.json({
        success: true,
        data: {
          projects: formattedProjects,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: sortedProjects.length,
            totalPages: Math.ceil(sortedProjects.length / Number(limit))
          },
          query: q
        }
      });
    } else {
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      
      if (!sort_by || sort_by === "relevance") {
        queryBuilder.orderBy("project.created_at", "DESC");
      }

      const [projects, total] = await queryBuilder.getManyAndCount();

      const formattedProjects = projects.map(project => {
        const hasInstructor = project.author.assignedInstructor && 
                             project.author.assignedInstructor.length > 0 &&
                             project.author.assignedInstructor[0].instructor?.profile;
        
        const institutionData = hasInstructor 
          ? {
              name: project.author.assignedInstructor[0].instructor.profile.institution_name,
              department: project.author.assignedInstructor[0].instructor.profile.department,
              source: 'instructor'
            }
          : project.author.profile ? {
              name: project.author.profile.institution_name,
              department: project.author.profile.department,
              source: 'self'
            } : null;

        return {
          id: project.id,
          title: project.title,
          abstract: project.abstract,
          research_type: project.research_type,
          field_of_study: project.field_of_study,
          academic_level: project.academic_level,
          visibility: project.visibility,
          status: project.status,
          view_count: project.view_count,
          download_count: project.download_count,
          like_count: project.like_count,
          comment_count: project.comment_count,
          collaborator_count: project.collaborator_count,
          created_at: project.created_at,
          updated_at: project.updated_at,
          cover_image_url: project.cover_image_url,
          author: {
            id: project.author.id,
            first_name: project.author.first_name,
            last_name: project.author.last_name,
            full_name: `${project.author.first_name} ${project.author.last_name}`,
            profile_picture_url: project.author.profile_picture_url,
            account_type: project.author.account_type,
            institution: institutionData
          },
          tags: project.tags?.map(tag => ({
            id: tag.id,
            name: tag.name,
            slug: tag.slug
          })) || []
        };
      });

      res.json({
        success: true,
        data: {
          projects: formattedProjects,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          },
          query: q
        }
      });
    }

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to search projects",
      error: error.message
    });
  }
}

static async createProject(req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const { 
      title, abstract, full_description, research_type, 
      visibility, collaboration_status, tags, field_of_study,
      publication_date, doi,
      academic_level
    } = req.body;

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
    if (academic_level) project.academic_level = academic_level;

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

    if (tags) {
      const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      if (Array.isArray(tagArray) && tagArray.length > 0) {
        const tagRepo = dbConnection.getRepository(ProjectTag);
        const projectTags = [];
        
        for (const tagName of tagArray) {
          if (!tagName || typeof tagName !== 'string') continue;
          
          const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
          
          let tag = await tagRepo.findOne({ 
            where: { slug: tagSlug } 
          });
          
          if (!tag) {
            tag = tagRepo.create({
              name: tagName.trim(),
              slug: tagSlug,
              category: 'Topic' as any
            });
            try {
              await tagRepo.save(tag);
            } catch (tagError: any) {
              if (tagError.code === '23505') {
                tag = await tagRepo.findOne({ 
                  where: { slug: tagSlug } 
                });
                if (!tag) {
                  continue;
                }
              } else {
                continue;
              }
            }
          }
          
          if (tag) {
            tag.usage_count = (tag.usage_count || 0) + 1;
            await tagRepo.save(tag);
            projectTags.push(tag);
          }
        }
        
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
    res.status(500).json({ 
      success: false, 
      message: "Failed to create project", 
      error: error.message 
    });
  }
}

static async getAllProjects(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      research_type, 
      visibility, 
      status,
      academic_level
    } = req.query;
    
    const projectRepo = dbConnection.getRepository(ResearchProject);
    
    const queryBuilder = projectRepo.createQueryBuilder("project")
      .leftJoinAndSelect("project.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("author.assignedInstructor", "assignedInstructor")
      .leftJoinAndSelect("assignedInstructor.instructor", "instructor")
      .leftJoinAndSelect("instructor.profile", "instructorProfile")
      .leftJoinAndSelect("project.tags", "tags")
      .leftJoinAndSelect("project.files", "files");

    if (search) {
      queryBuilder.andWhere(
        "(project.title ILIKE :search OR project.abstract ILIKE :search)",
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
    
    if (academic_level) {
      queryBuilder.andWhere("project.academic_level = :academic_level", { academic_level });
    }

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    queryBuilder.orderBy("project.created_at", "DESC");

    const [projects, total] = await queryBuilder.getManyAndCount();

    const formattedProjects = projects.map(project => {
      const hasInstructor = project.author.assignedInstructor && 
                           project.author.assignedInstructor.length > 0 &&
                           project.author.assignedInstructor[0].instructor?.profile;
      
      const institutionData = hasInstructor 
        ? {
            name: project.author.assignedInstructor[0].instructor.profile.institution_name,
            department: project.author.assignedInstructor[0].instructor.profile.department,
            academic_level: project.author.profile?.academic_level,
            research_interests: project.author.profile?.research_interests,
            current_position: project.author.profile?.current_position,
            orcid_id: project.author.profile?.orcid_id,
            google_scholar_url: project.author.profile?.google_scholar_url,
            linkedin_url: project.author.profile?.linkedin_url,
            source: 'instructor'
          }
        : project.author.profile ? {
            name: project.author.profile.institution_name,
            department: project.author.profile.department,
            academic_level: project.author.profile.academic_level,
            research_interests: project.author.profile.research_interests,
            current_position: project.author.profile.current_position,
            orcid_id: project.author.profile.orcid_id,
            google_scholar_url: project.author.profile.google_scholar_url,
            linkedin_url: project.author.profile.linkedin_url,
            source: 'self'
          } : null;

      return {
        ...project,
        author: {
          id: project.author.id,
          email: project.author.email,
          first_name: project.author.first_name,
          last_name: project.author.last_name,
          full_name: `${project.author.first_name} ${project.author.last_name}`,
          profile_picture_url: project.author.profile_picture_url,
          account_type: project.author.account_type,
          institution: institutionData,
          instructor: hasInstructor ? {
            id: project.author.assignedInstructor[0].instructor.id,
            name: `${project.author.assignedInstructor[0].instructor.first_name} ${project.author.assignedInstructor[0].instructor.last_name}`,
            email: project.author.assignedInstructor[0].instructor.email,
            profile_picture_url: project.author.assignedInstructor[0].instructor.profile_picture_url,
            assigned_at: project.author.assignedInstructor[0].assigned_at,
            profile: {
              institution_name: project.author.assignedInstructor[0].instructor.profile.institution_name,
              department: project.author.assignedInstructor[0].instructor.profile.department,
              current_position: project.author.assignedInstructor[0].instructor.profile.current_position,
              research_interests: project.author.assignedInstructor[0].instructor.profile.research_interests,
              google_scholar_url: project.author.assignedInstructor[0].instructor.profile.google_scholar_url
            }
          } : null
        }
      };
    });

    res.json({
      success: true,
      data: {
        projects: formattedProjects,
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
        relations: ["author", "tags", "files"],
      });

      if (!project) {
        return res.status(404).json({ 
          success: false, 
          message: "Project not found" 
        });
      }
      
      const extractPublicId = (url: string): string | null => {
        if (!url) return null;
        try {
          const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
          return matches ? matches[1] : null;
        } catch (error) {
          return null;
        }
      };

      const getResourceType = (url: string): "image" | "video" | "raw" => {
        if (!url) return "raw";
        if (url.includes("/image/")) return "image";
        if (url.includes("/video/")) return "video";
        return "raw";
      };

      if (req.files && (req.files as any).cover_image) {
        const newCoverImage = (req.files as any).cover_image[0];

        const validation = validateFileForUpload(newCoverImage);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }

        if (project.cover_image_url) {
          const oldPublicId = extractPublicId(project.cover_image_url);
          if (oldPublicId) {
            try {
              await DeleteFromCloud(oldPublicId, "image");
            } catch (deleteError: any) {
            }
          }
        }

        try {
          const uploadResult = await UploadToCloud(newCoverImage);
          project.cover_image_url = uploadResult.secure_url;
        } catch (uploadError: any) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload new cover image"
          });
        }
      }

      if (req.files && (req.files as any).project_file) {
        const newProjectFile = (req.files as any).project_file[0];

        const validation = validateFileForUpload(newProjectFile);
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }

        if (project.project_file_url) {
          const oldPublicId = extractPublicId(project.project_file_url);
          const resourceType = getResourceType(project.project_file_url);
          
          if (oldPublicId) {
            try {
              await DeleteFromCloud(oldPublicId, resourceType);
            } catch (deleteError: any) {
            }
          }
        }

        try {
          const uploadResult = await UploadToCloud(newProjectFile);
          project.project_file_url = uploadResult.secure_url;
        } catch (uploadError: any) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload new project file"
          });
        }
      }

      if (req.files && (req.files as any).additional_files) {
        const additionalFiles = (req.files as any).additional_files;
        const fileRepo = dbConnection.getRepository(ProjectFile);
        for (const file of additionalFiles) {
          const validation = validateFileForUpload(file);
          if (!validation.isValid) {
            continue;
          }

          try {
            const uploadResult = await UploadToCloud(file);
            const projectFile = fileRepo.create({
              project,
              file_url: uploadResult.secure_url,
              file_name: file.originalname,
              file_type: file.mimetype,
              file_size: file.size,
            });
            await fileRepo.save(projectFile);
          } catch (uploadError: any) {
          }
        }
      }
      
      if (updates.tags) {
        const tagArray = typeof updates.tags === 'string' ? JSON.parse(updates.tags) : updates.tags;

        if (Array.isArray(tagArray)) {
          const tagRepo = dbConnection.getRepository(ProjectTag);
          
          if (project.tags && project.tags.length > 0) {
            for (const oldTag of project.tags) {
              oldTag.usage_count = Math.max(0, (oldTag.usage_count || 0) - 1);
              await tagRepo.save(oldTag);
            }
          }

          const newProjectTags = [];
          for (const tagName of tagArray) {
            if (!tagName || typeof tagName !== 'string') continue;
            
            const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
            
            let tag = await tagRepo.findOne({ 
              where: { slug: tagSlug } 
            });
            
            if (!tag) {
              tag = tagRepo.create({
                name: tagName.trim(),
                slug: tagSlug,
                category: 'Topic' as any,
                usage_count: 0
              });
              
              try {
                await tagRepo.save(tag);
              } catch (tagError: any) {
                if (tagError.code === '23505') {
                  tag = await tagRepo.findOne({ 
                    where: { slug: tagSlug } 
                  });
                  if (!tag) {
                    continue;
                  }
                } else {
                  continue;
                }
              }
            } else {
            }
            
            if (tag) {
              tag.usage_count = (tag.usage_count || 0) + 1;
              await tagRepo.save(tag);
              newProjectTags.push(tag);
            }
          }
          
          project.tags = newProjectTags;
        }
      }
      
      const allowedUpdates = [
        'title', 'abstract', 'full_description', 'research_type',
        'visibility', 'collaboration_status', 'field_of_study',
        'publication_date', 'doi',
        'academic_level'
      ];

      for (const key of allowedUpdates) {
        if (updates[key] !== undefined && key !== 'tags') {
          project[key] = updates[key];
        }
      }

      await projectRepo.save(project);

      const updatedProject = await projectRepo.findOne({
        where: { id },
        relations: ["author", "author.profile", "tags", "files"]
      });

      res.json({
        success: true,
        message: "Project updated successfully",
        data: { project: updatedProject },
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

static async updateProjectStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { status, reason } = req.body;

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

    const statusChangeRecord = {
      from_status: project.status,
      to_status: status as ProjectStatus,
      changed_by: userId,
      changed_at: new Date(),
      reason: reason || null,
      notes: status === 'Published' ? 'Published by author' : 'Changed to draft by author'
    };

    if (!project.status_change_history) {
      project.status_change_history = [statusChangeRecord];
    } else {
      project.status_change_history.push(statusChangeRecord);
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
      data: { 
        project: updatedProject,
        status_change_reason: reason
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update project status",
      error: error.message
    });
  }
}

static async getAllProjectsForAdmin(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 1000, 
      search, 
      research_type, 
      visibility, 
      status,
      academic_level 
    } = req.query;
    
    const projectRepo = dbConnection.getRepository(ResearchProject);
    
    const queryBuilder = projectRepo.createQueryBuilder("project")
      .leftJoinAndSelect("project.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("author.assignedInstructor", "assignedInstructor")
      .leftJoinAndSelect("assignedInstructor.instructor", "instructor")
      .leftJoinAndSelect("instructor.profile", "instructorProfile")
      .leftJoinAndSelect("project.tags", "tags")
      .leftJoinAndSelect("project.files", "files");

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
    
    if (academic_level) {
      queryBuilder.andWhere("project.academic_level = :academic_level", { academic_level });
    }

    const total = await queryBuilder.getCount();

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    queryBuilder.orderBy("project.created_at", "DESC");

    const projects = await queryBuilder.getMany();

    const formattedProjects = projects.map(project => {
      const hasInstructor = project.author.assignedInstructor && 
                           project.author.assignedInstructor.length > 0 &&
                           project.author.assignedInstructor[0].instructor?.profile;
      
      const institutionData = hasInstructor 
        ? {
            name: project.author.assignedInstructor[0].instructor.profile.institution_name,
            department: project.author.assignedInstructor[0].instructor.profile.department,
            academic_level: project.author.profile?.academic_level,
            research_interests: project.author.profile?.research_interests,
            current_position: project.author.profile?.current_position,
            orcid_id: project.author.profile?.orcid_id,
            google_scholar_url: project.author.profile?.google_scholar_url,
            linkedin_url: project.author.profile?.linkedin_url,
            source: 'instructor'
          }
        : project.author.profile ? {
            name: project.author.profile.institution_name,
            department: project.author.profile.department,
            academic_level: project.author.profile.academic_level,
            research_interests: project.author.profile.research_interests,
            current_position: project.author.profile.current_position,
            orcid_id: project.author.profile.orcid_id,
            google_scholar_url: project.author.profile.google_scholar_url,
            linkedin_url: project.author.profile.linkedin_url,
            source: 'self'
          } : null;

      return {
        ...project,
        author: {
          id: project.author.id,
          email: project.author.email,
          first_name: project.author.first_name,
          last_name: project.author.last_name,
          full_name: `${project.author.first_name} ${project.author.last_name}`,
          profile_picture_url: project.author.profile_picture_url,
          account_type: project.author.account_type,
          institution: institutionData,
          instructor: hasInstructor ? {
            id: project.author.assignedInstructor[0].instructor.id,
            name: `${project.author.assignedInstructor[0].instructor.first_name} ${project.author.assignedInstructor[0].instructor.last_name}`,
            email: project.author.assignedInstructor[0].instructor.email,
            profile_picture_url: project.author.assignedInstructor[0].instructor.profile_picture_url,
            assigned_at: project.author.assignedInstructor[0].assigned_at,
            profile: {
              institution_name: project.author.assignedInstructor[0].instructor.profile.institution_name,
              department: project.author.assignedInstructor[0].instructor.profile.department,
              current_position: project.author.assignedInstructor[0].instructor.profile.current_position,
              research_interests: project.author.assignedInstructor[0].instructor.profile.research_interests,
              google_scholar_url: project.author.assignedInstructor[0].instructor.profile.google_scholar_url
            }
          } : null
        }
      };
    });

    res.json({
      success: true,
      data: {
        projects: formattedProjects,
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
      message: "Failed to fetch projects",
      error: error.message
    });
  }
}

static async activateDeactivateProject(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

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
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const userId = req.user?.userId || 'admin';
    const statusChangeRecord = {
      from_status: project.status,
      to_status: status as ProjectStatus,
      changed_by: userId,
      changed_at: new Date(),
      reason: reason || null,
      notes: status === 'Archived' ? 'Archived by administrator' : 'Published by administrator'
    };

    if (!project.status_change_history) {
      project.status_change_history = [statusChangeRecord];
    } else {
      project.status_change_history.push(statusChangeRecord);
    }

    const oldStatus = project.status;
    project.status = status as ProjectStatus;
    await projectRepo.save(project);

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
    } catch (emailError: any) {
    }

    const statusText = status === "Published" ? 'published' : 'archived';
    res.json({
      success: true,
      message: `Project ${statusText} successfully and notification sent`,
      data: {
        project: {
          id: project.id,
          title: project.title,
          status: project.status,
          status_change_reason: reason, 
          author: {
            email: project.author.email,
            name: `${project.author.first_name} ${project.author.last_name}`
          }
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update project status",
      error: error.message
    });
  }
}

static async deleteProjectByAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    if (!reason || reason.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "A detailed reason (minimum 20 characters) is required for project deletion"
      });
    }

    await dbConnection.transaction(async (transactionalEntityManager) => {
      const projectRepo = transactionalEntityManager.getRepository(ResearchProject);
      const likeRepo = transactionalEntityManager.getRepository(Like);
      const commentRepo = transactionalEntityManager.getRepository(Comment);
      const fileRepo = transactionalEntityManager.getRepository(ProjectFile);
      const collaborationRequestRepo = transactionalEntityManager.getRepository(CollaborationRequest);
      const contributionRepo = transactionalEntityManager.getRepository(ProjectContribution);
      const communityPostRepo = transactionalEntityManager.getRepository(CommunityPost);
      const userRepo = transactionalEntityManager.getRepository(User);
      const projectApprovalRepo = transactionalEntityManager.getRepository(ProjectApproval);

      const project = await projectRepo.findOne({
        where: { id },
        relations: ["author"]
      });

      if (!project) {
        throw new Error("Project not found");
      }

      const authorWithProfile = await userRepo.findOne({
        where: { id: project.author.id },
        relations: ["profile"]
      });

      if (authorWithProfile) {
        project.author = authorWithProfile;
      }

      const admin = await userRepo.findOne({
        where: { id: adminId },
        relations: ["profile"]
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      const projectData = {
        title: project.title,
        abstract: project.abstract,
        research_type: project.research_type,
        visibility: project.visibility,
        status: project.status,
        created_at: project.created_at,
        view_count: project.view_count,
        like_count: project.like_count,
        comment_count: project.comment_count,
        collaborator_count: project.collaborator_count,
        academic_level: project.academic_level,
        field_of_study: project.field_of_study
      };

      const authorData = {
        first_name: project.author.first_name,
        last_name: project.author.last_name,
        email: project.author.email,
        account_type: project.author.account_type
      };

      const adminInfo = {
        first_name: admin.first_name,
        last_name: admin.last_name,
        email: admin.email
      };

      await projectApprovalRepo
        .createQueryBuilder()
        .delete()
        .from(ProjectApproval)
        .where("project_id = :projectId", { projectId: id })
        .execute();

      await likeRepo.delete({ 
        content_type: ContentType.PROJECT,
        content_id: id 
      });

      await commentRepo.delete({ 
        content_type: ContentType.PROJECT,
        content_id: id 
      });

      await collaborationRequestRepo
        .createQueryBuilder()
        .delete()
        .from(CollaborationRequest)
        .where("project_id = :projectId", { projectId: id })
        .execute();

      await contributionRepo
        .createQueryBuilder()
        .delete()
        .from(ProjectContribution)
        .where("project_id = :projectId", { projectId: id })
        .execute();

      const projectFiles = await fileRepo.find({ where: { project: { id } } });
      if (projectFiles.length > 0) {
        const extractPublicId = (url: string): string | null => {
          if (!url) return null;
          try {
            const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
            return matches ? matches[1] : null;
          } catch (error) {
            return null;
          }
        };

        for (const file of projectFiles) {
          if (file.file_url) {
            try {
              const publicId = extractPublicId(file.file_url);
              if (publicId) {
                await DeleteFromCloud(publicId, "raw");
              }
            } catch (cloudError) {
            }
          }
        }

        await fileRepo
          .createQueryBuilder()
          .delete()
          .from(ProjectFile)
          .where("project_id = :projectId", { projectId: id })
          .execute();
      }

      if (project.project_file_url) {
        const extractPublicId = (url: string): string | null => {
          const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
          return matches ? matches[1] : null;
        };
        const publicId = extractPublicId(project.project_file_url);
        if (publicId) {
          try {
            await DeleteFromCloud(publicId, "raw");
          } catch (cloudError) {
          }
        }
      }

      if (project.cover_image_url) {
        const extractPublicId = (url: string): string | null => {
          const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
          return matches ? matches[1] : null;
        };
        const publicId = extractPublicId(project.cover_image_url);
        if (publicId) {
          try {
            await DeleteFromCloud(publicId, "image");
          } catch (cloudError) {
          }
        }
      }

      await communityPostRepo
        .createQueryBuilder()
        .update(CommunityPost)
        .set({ linked_project: null })
        .where("linked_project_id = :projectId", { projectId: id })
        .execute();

      try {
        await transactionalEntityManager.query(
          `DELETE FROM event_projects WHERE project_id = $1`,
          [id]
        );
      } catch (eventError) {
      }

      await transactionalEntityManager
        .createQueryBuilder()
        .delete()
        .from("project_tag_association")
        .where("project_id = :projectId", { projectId: id })
        .execute();

      await projectRepo
        .createQueryBuilder()
        .delete()
        .from(ResearchProject)
        .where("id = :id", { id })
        .execute();

      try {
        const { DeleteResearchProjectTemplate } = require('../helpers/DeleteResearchProjectTemplate');
        
        const emailHtml = DeleteResearchProjectTemplate.getDeletionTemplate(
          projectData,
          authorData,
          reason,
          adminInfo
        );

        await sendEmail({
          to: authorData.email,
          subject: `⚠️ Research Project Deleted: "${projectData.title}"`,
          html: emailHtml
        });
      } catch (emailError: any) {
      }

      res.json({
        success: true,
        message: "Project permanently deleted successfully and author notified",
        data: {
          id: project.id,
          title: project.title,
          author: authorData.email
        }
      });

    });

  } catch (error: any) {
    if (error.message === "Project not found") {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }
    
    if (error.message === "Admin not found") {
      return res.status(404).json({
        success: false,
        message: "Admin user not found"
      });
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete project", 
        error: error.message 
      });
    }
  }
}

static async getUserProjects(req: Request, res: Response) {
  try {
    const userId = req.user.userId;

    const projectRepo = dbConnection.getRepository(ResearchProject);
    
    try {
      const ownedProjects = await projectRepo.find({
        where: { author: { id: userId } },
        relations: ["tags", "files", "author"],
        order: { created_at: "DESC" },
      });
      
      let collaborativeProjects: ResearchProject[] = [];
      
      try {
        const tableInfo = await projectRepo.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'research_projects' 
            AND column_name = 'approved_collaborators'
        `);

        if (tableInfo && tableInfo.length > 0) {
          collaborativeProjects = await projectRepo
            .createQueryBuilder("project")
            .leftJoinAndSelect("project.author", "author")
            .leftJoinAndSelect("project.tags", "tags")
            .leftJoinAndSelect("project.files", "files")
            .where("project.approved_collaborators @> :collaborator", {
              collaborator: JSON.stringify([{ user_id: userId }])
            })
            .orderBy("project.updated_at", "DESC")
            .getMany();
        }
      } catch (collabError: any) {
      }

      const response = {
        success: true,
        data: { 
          owned_projects: ownedProjects,
          collaborative_projects: collaborativeProjects,
          total_owned: ownedProjects.length,
          total_collaborative: collaborativeProjects.length
        }
      };

      res.json(response);

    } catch (ownedError: any) {
      throw ownedError;
    }

  } catch (error: any) {
    let errorMessage = "Failed to fetch user projects";
    let helpfulTip = "";

    if (error.message.includes("approved_collaborators")) {
      errorMessage = "Database schema needs update";
      helpfulTip = "Please run the provided migration to add collaboration columns";
    } else if (error.code === "42P01") {
      errorMessage = "Table does not exist";
      helpfulTip = "Please ensure all database migrations have been run";
    } else if (error.code === "42703") {
      errorMessage = "Column does not exist";
      helpfulTip = "Please run the collaboration columns migration";
    }

    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: error.message,
      help: helpfulTip,
      details: {
        code: error.code,
        column: error.column,
        table: error.table
      }
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
    let collaborationInfo = null;

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

      const approvedCollaborators = project.approved_collaborators || [];
      const isCollaborator = approvedCollaborators.some(c => c.user_id === userId);
      const isOwner = project.author.id === userId;

      const userCollaborationInfo = (project.collaboration_info || []).find(
        info => info.user_id === userId
      );

      const requestRepo = dbConnection.getRepository(CollaborationRequest);
      const latestRequest = await requestRepo.findOne({
        where: {
          project: { id },
          requester: { id: userId }
        },
        order: { requested_at: "DESC" }
      });

      const canRequest = !isOwner && 
                        !isCollaborator && 
                        project.collaboration_status !== CollaborationStatus.SOLO &&
                        (!latestRequest || 
                         latestRequest.status === CollaborationRequestStatus.REJECTED);

      collaborationInfo = {
        can_request: canRequest,
        is_collaborator: isCollaborator,
        is_owner: isOwner,
        request_status: latestRequest?.status || null,
        collaborator_count: project.collaborator_count || 0,
        user_collaboration_status: userCollaborationInfo?.status || null,
        requested_at: userCollaborationInfo?.requested_at || latestRequest?.requested_at || null,
        approved_at: userCollaborationInfo?.status === CollaborationInfoStatus.APPROVED 
          ? userCollaborationInfo.updated_at 
          : null,
        rejected_at: userCollaborationInfo?.status === CollaborationInfoStatus.REJECTED 
          ? userCollaborationInfo.updated_at 
          : null
      };

      if (isOwner) {
        const collaborationTracking = project.collaboration_info || [];
        
        const pendingRequests = collaborationTracking.filter(
          info => info.status === CollaborationInfoStatus.PENDING
        );
        const approvedCollaboratorsList = collaborationTracking.filter(
          info => info.status === CollaborationInfoStatus.APPROVED
        );
        const rejectedRequests = collaborationTracking.filter(
          info => info.status === CollaborationInfoStatus.REJECTED
        );

        collaborationInfo.tracking = {
          pending: pendingRequests.map(info => ({
            user_id: info.user_id,
            user_name: info.user_name,
            user_email: info.user_email,
            requested_at: info.requested_at,
            reason: info.reason,
            expertise: info.expertise
          })),
          approved: approvedCollaboratorsList.map(info => ({
            user_id: info.user_id,
            user_name: info.user_name,
            user_email: info.user_email,
            requested_at: info.requested_at,
            approved_at: info.updated_at
          })),
          rejected: rejectedRequests.map(info => ({
            user_id: info.user_id,
            user_name: info.user_name,
            user_email: info.user_email,
            requested_at: info.requested_at,
            rejected_at: info.updated_at,
            rejection_reason: info.rejection_reason
          })),
          summary: {
            total_requests: collaborationTracking.length,
            pending_count: pendingRequests.length,
            approved_count: approvedCollaboratorsList.length,
            rejected_count: rejectedRequests.length
          }
        };
      }
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

    const contributionRepo = dbConnection.getRepository(ProjectContribution);
    const contributionsCount = await contributionRepo.count({
      where: {
        project: { id },
        is_approved: true
      }
    });

    res.json({
      success: true,
      data: { 
        project,
        hasLiked,
        comments,
        contributions_count: contributionsCount
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

static async getProjectsSeekingCollaborators(req: Request, res: Response) {
  try {
    const { page = 1, limit = 10, search, research_type, field_of_study } = req.query;
    
    const projectRepo = dbConnection.getRepository(ResearchProject);
    const queryBuilder = projectRepo.createQueryBuilder("project")
      .leftJoinAndSelect("project.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("project.tags", "tags")
      .where("project.collaboration_status = :status", { 
        status: CollaborationStatus.SEEKING_COLLABORATORS 
      })
      .andWhere("project.status = :projectStatus", { 
        projectStatus: ProjectStatus.PUBLISHED 
      });

    if (search) {
      queryBuilder.andWhere(
        "(project.title ILIKE :search OR project.abstract ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    if (research_type) {
      queryBuilder.andWhere("project.research_type = :research_type", { research_type });
    }

    if (field_of_study) {
      queryBuilder.andWhere("project.field_of_study ILIKE :field", { 
        field: `%${field_of_study}%` 
      });
    }

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
      message: "Failed to fetch projects seeking collaborators", 
      error: error.message 
    });
  }
}

static async getProjectCollaborators(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const projectRepo = dbConnection.getRepository(ResearchProject);
    const project = await projectRepo.findOne({
      where: { id },
      relations: ["author"]
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
    const updatedCollaborators = approvedCollaborators.filter(
      c => c.user_id !== collaboratorId
    );

    project.approved_collaborators = updatedCollaborators;
    project.collaborator_count = updatedCollaborators.length;

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

}