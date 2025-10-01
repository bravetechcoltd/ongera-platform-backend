// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from '../database/db';
import { ResearchProject, ProjectStatus } from "../database/models/ResearchProject";
import { ProjectFile } from "../database/models/ProjectFile";
import { ProjectTag } from "../database/models/ProjectTag";
import { Community } from "../database/models/Community";
import { UploadToCloud, validateFileForUpload } from "../helpers/cloud";
import { sendEmail } from '../helpers/utils';
import { NewsProjectCreatedTemplate } from '../helpers/NewsProjectCreatedTemplate';
import { CommunityPost } from "../database/models/CommunityPost";
import { SubscribeController } from './SubscribeController';
export class CommunityProjectController {

static async getCommunityProjects(req: Request, res: Response) {
  try {
    const { communityId } = req.params;
    const { page = 1, limit = 10, research_type, status } = req.query;

    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id: communityId }
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    const projectRepo = dbConnection.getRepository(ResearchProject);
    
    const directProjectsQuery = projectRepo.createQueryBuilder("project")
      .leftJoinAndSelect("project.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("project.tags", "tags")
      .leftJoinAndSelect("project.files", "files")
      .leftJoinAndSelect("project.community", "community")
      .where("project.community_id = :communityId", { communityId })
      .andWhere("project.status = :status", { status: ProjectStatus.PUBLISHED });

    if (status) {
      directProjectsQuery.andWhere("project.status = :status", { status });
    }

    if (research_type) {
      directProjectsQuery.andWhere("project.research_type = :research_type", { research_type });
    }

    const directProjects = await directProjectsQuery.getMany();

    const postRepo = dbConnection.getRepository(CommunityPost);
    
    const linkedPostsQuery = postRepo.createQueryBuilder("post")
      .leftJoinAndSelect("post.linked_project", "linked_project")
      .leftJoinAndSelect("linked_project.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("linked_project.tags", "tags")
      .leftJoinAndSelect("linked_project.files", "files")
      .leftJoinAndSelect("linked_project.community", "project_community")
      .where("post.community_id = :communityId", { communityId })
      .andWhere("post.post_type = :postType", { postType: "LinkedProject" })
      .andWhere("linked_project.id IS NOT NULL")
      .andWhere("linked_project.status = :status", { status: ProjectStatus.PUBLISHED });

    if (status) {
      linkedPostsQuery.andWhere("linked_project.status = :status", { status });
    }

    if (research_type) {
      linkedPostsQuery.andWhere("linked_project.research_type = :research_type", { research_type });
    }

    const linkedPosts = await linkedPostsQuery.getMany();
    const linkedProjects = linkedPosts
      .map(post => post.linked_project)
      .filter(project => project !== null);

    const projectMap = new Map<string, ResearchProject>();

    directProjects.forEach(project => {
      projectMap.set(project.id, project);
    });

    linkedProjects.forEach(project => {
      if (!projectMap.has(project.id)) {
        projectMap.set(project.id, project);
      }
    });

    const allProjects = Array.from(projectMap.values());

    allProjects.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const total = allProjects.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedProjects = allProjects.slice(skip, skip + Number(limit));

    res.json({
      success: true,
      data: {
        projects: paginatedProjects,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        metadata: {
          directProjects: directProjects.length,
          linkedProjects: linkedProjects.length,
          totalUnique: allProjects.length
        }
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch community projects",
      error: error.message
    });
  }
}

static async createCommunityProject(req: Request, res: Response) {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;
    const {
      title, abstract, full_description, research_type,
      visibility, collaboration_status, tags, field_of_study,
      publication_date, doi,
      academic_level 
    } = req.body;

    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id: communityId },
      relations: ["members", "creator", "members.profile"]
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    const isMember = community.members?.some(m => m.id === userId) || 
                    community.creator.id === userId;
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Only community members can create projects"
      });
    }

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
      status: ProjectStatus.PUBLISHED,
      author: { id: userId },
      community: { id: communityId },
      publication_date: publication_date || new Date(),
      field_of_study,
      doi,
    });

    if (academic_level) project.academic_level = academic_level;
   
    if (req.files && (req.files as any).project_file) {
      const projectFile = (req.files as any).project_file[0];
      const validation = validateFileForUpload(projectFile);
      if (!validation.isValid) {
        return res.status(400).json({ success: false, message: validation.error });
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
      if (validation.isValid) {
        const uploadResult = await UploadToCloud(coverImage);
        project.cover_image_url = uploadResult.secure_url;
      }
    }

    const savedProject = await projectRepo.save(project);

    const verifyProject = await projectRepo
      .createQueryBuilder("project")
      .where("project.id = :id", { id: savedProject.id })
      .getOne();

    if (tags) {
      const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      
      if (Array.isArray(tagArray) && tagArray.length > 0) {
        const tagRepo = dbConnection.getRepository(ProjectTag);
        const projectTags = [];

        for (const tagName of tagArray) {
          const slug = tagName.toLowerCase().replace(/\s+/g, '-');
          let tag = await tagRepo.findOne({ where: { slug } });
          
          if (!tag) {
            tag = await tagRepo.findOne({ where: { name: tagName } });
          }
          
          if (!tag) {
            tag = tagRepo.create({
              name: tagName,
              slug: slug,
              category: 'Topic'
            });
            await tagRepo.save(tag);
          } else {
            tag.usage_count += 1;
            await tagRepo.save(tag);
          }
          
          projectTags.push(tag);
        }

        savedProject.tags = projectTags;
        await projectRepo.save(savedProject);
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

        const uploadResult = await UploadToCloud(file);
        const projectFile = fileRepo.create({
          project: savedProject,
          file_url: uploadResult.secure_url,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
        });
        await fileRepo.save(projectFile);
      }
    }

    const completeProject = await projectRepo.findOne({
      where: { id: savedProject.id },
      relations: ["author", "author.profile", "tags", "files", "community"]
    });

    try {
      const membersToNotify = community.members.filter(member => member.id !== userId);
      
      if (membersToNotify.length === 0) {
      } else {
        let emailsSent = 0;
        let emailsFailed = 0;
        const failedEmails: Array<{ email: string; error: string }> = [];

        for (let i = 0; i < membersToNotify.length; i++) {
          const member = membersToNotify[i];

          try {
            const projectData = {
              title: completeProject!.title,
              abstract: completeProject!.abstract,
              research_type: completeProject!.research_type,
              status: completeProject!.status,
              created_at: completeProject!.created_at,
              author: {
                first_name: completeProject!.author.first_name,
                last_name: completeProject!.author.last_name,
                profile: completeProject!.author.profile
              },
              community: {
                name: completeProject!.community.name,
                member_count: completeProject!.community.member_count
              },
              tags: completeProject!.tags,
              view_count: completeProject!.view_count,
              download_count: completeProject!.download_count,
              project_id: completeProject!.id
            };

            const memberData = {
              first_name: member.first_name
            };

            const emailHtml = NewsProjectCreatedTemplate.getProjectCreatedTemplate(
              projectData,
              memberData
            );

            await sendEmail({
              to: member.email,
              subject: `🔬 New Research: ${completeProject!.title}`,
              html: emailHtml
            });

            emailsSent++;

            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (emailError: any) {
            emailsFailed++;
            const errorMsg = emailError.message || 'Unknown error';
            
            failedEmails.push({
              email: member.email,
              error: errorMsg
            });
          }
        }
      }

    } catch (emailSystemError: any) {
    }

    try {
      const subscriberNotificationData = {
        title: completeProject!.title,
        abstract: completeProject!.abstract,
        research_type: completeProject!.research_type,
        author: {
          first_name: completeProject!.author.first_name,
          last_name: completeProject!.author.last_name
        },
        community: {
          name: completeProject!.community.name
        },
        project_id: completeProject!.id,
        created_at: completeProject!.created_at
      };

      SubscribeController.notifyNewProject(subscriberNotificationData)
        .catch(err => {
        });

    } catch (subscriberError: any) {
    }

    res.status(201).json({
      success: true,
      message: "Community project created successfully and notifications sent",
      data: { project: completeProject },
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create community project",
      error: error.message
    });
  }
}
}