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

    console.log("🔍 ========== GET COMMUNITY PROJECTS DEBUG START ==========");
    console.log("📥 Request Parameters:", {
      communityId,
      page,
      limit,
      research_type,
      status,
      queryParams: req.query
    });

    // Step 1: Verify community exists
    console.log("📍 STEP 1: Verifying community exists...");
    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id: communityId }
    });

    console.log("✅ Community found:", {
      exists: !!community,
      id: community?.id,
      name: community?.name,
      post_count: community?.post_count
    });

    if (!community) {
      console.log("❌ Community not found, returning 404");
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    // ==================== ORIGINAL: Projects directly linked to community ====================
    console.log("📍 STEP 2: Fetching projects directly linked to community...");
    const projectRepo = dbConnection.getRepository(ResearchProject);
    
    const directProjectsQuery = projectRepo.createQueryBuilder("project")
      .leftJoinAndSelect("project.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("project.tags", "tags")
      .leftJoinAndSelect("project.files", "files")
      .leftJoinAndSelect("project.community", "community")
      .where("project.community_id = :communityId", { communityId })
      .andWhere("project.status = :status", { status: ProjectStatus.PUBLISHED });

    // Apply filters for direct projects
    if (status) {
      console.log(`🔍 Filtering by status: ${status}`);
      directProjectsQuery.andWhere("project.status = :status", { status });
    }

    if (research_type) {
      console.log(`🔍 Filtering by research_type: ${research_type}`);
      directProjectsQuery.andWhere("project.research_type = :research_type", { research_type });
    }

    const directProjects = await directProjectsQuery.getMany();
    console.log(`✅ Direct community projects found: ${directProjects.length}`);

    // ==================== NEW: Projects from LinkedProject posts ====================
    console.log("\n📍 STEP 3: Fetching projects from LinkedProject community posts...");
    const postRepo = dbConnection.getRepository(CommunityPost);
    
    // Get all LinkedProject posts from this community
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

    // Apply filters for linked projects
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

    console.log(`✅ Linked projects from posts found: ${linkedProjects.length}`);

    // ==================== STEP 4: Merge and deduplicate projects ====================
    console.log("\n📍 STEP 4: Merging and deduplicating projects...");
    
    // Create a Map to track unique projects by ID
    const projectMap = new Map<string, ResearchProject>();

    // Add direct projects first
    directProjects.forEach(project => {
      projectMap.set(project.id, project);
    });

    // Add linked projects (avoid duplicates)
    linkedProjects.forEach(project => {
      if (!projectMap.has(project.id)) {
        projectMap.set(project.id, project);
      }
    });

    // Convert Map to array
    const allProjects = Array.from(projectMap.values());

    console.log("📊 Project Merging Summary:", {
      directProjects: directProjects.length,
      linkedProjects: linkedProjects.length,
      duplicatesRemoved: (directProjects.length + linkedProjects.length) - allProjects.length,
      totalUniqueProjects: allProjects.length
    });

    // ==================== STEP 5: Sort by creation date ====================
    console.log("📍 STEP 5: Sorting projects by creation date...");
    allProjects.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // ==================== STEP 6: Apply pagination ====================
    console.log("📍 STEP 6: Applying pagination...");
    const total = allProjects.length;
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedProjects = allProjects.slice(skip, skip + Number(limit));

    console.log("✅ Pagination Results:", {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      projectsReturned: paginatedProjects.length
    });

    // ==================== STEP 7: Log project details ====================
    if (paginatedProjects.length > 0) {
      console.log("📋 Projects Retrieved:");
      paginatedProjects.forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.title}`);
        console.log(`     - ID: ${p.id}`);
        console.log(`     - Status: ${p.status}`);
        console.log(`     - Research Type: ${p.research_type}`);
        console.log(`     - Direct Link: ${directProjects.some(dp => dp.id === p.id) ? 'Yes' : 'No'}`);
        console.log(`     - From Post: ${linkedProjects.some(lp => lp.id === p.id) ? 'Yes' : 'No'}`);
        console.log(`     - Created: ${p.created_at}`);
      });
    } else {
      console.log("⚠️ No projects found matching criteria");
      console.log("🔍 Troubleshooting suggestions:");
      console.log("   1. Check if projects were saved with community_id");
      console.log("   2. Check if LinkedProject posts exist in this community");
      console.log("   3. Verify status filter (current:", status || "Published", ")");
    }

    console.log("🔍 ========== GET COMMUNITY PROJECTS DEBUG END ==========\n");

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
    console.error("❌ ========== ERROR IN GET COMMUNITY PROJECTS ==========");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.error("========================================================\n");
    
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

    console.log("🔍 ========== CREATE COMMUNITY PROJECT DEBUG START ==========");
    console.log("📥 Request Data:", {
      communityId,
      userId,
      title,
      research_type,
      visibility,
      collaboration_status,
      hasProjectFile: !!(req.files && (req.files as any).project_file),
      hasCoverImage: !!(req.files && (req.files as any).cover_image),
      hasAdditionalFiles: !!(req.files && (req.files as any).additional_files)
    });

    // Step 1: Verify community exists and get members
    console.log("📍 STEP 1: Verifying community and membership...");
    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id: communityId },
      relations: ["members", "creator", "members.profile"]
    });

    console.log("✅ Community verification:", {
      found: !!community,
      name: community?.name,
      creatorId: community?.creator?.id,
      memberCount: community?.members?.length
    });

    if (!community) {
      console.log("❌ Community not found");
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    // Step 2: Check membership
    console.log("📍 STEP 2: Checking user membership...");
    const isMember = community.members?.some(m => m.id === userId) || 
                    community.creator.id === userId;
    
    console.log("✅ Membership check:", {
      userId,
      isMember,
      isCreator: community.creator.id === userId
    });

    if (!isMember) {
      console.log("❌ User is not a community member");
      return res.status(403).json({
        success: false,
        message: "Only community members can create projects"
      });
    }

    // Step 3: Validate required fields
    console.log("📍 STEP 3: Validating required fields...");
    if (!title || !abstract || !research_type) {
      console.log("❌ Missing required fields:", {
        hasTitle: !!title,
        hasAbstract: !!abstract,
        hasResearchType: !!research_type
      });
      return res.status(400).json({
        success: false,
        message: "Title, abstract, and research type are required"
      });
    }

    // Step 4: Create project object
    console.log("📍 STEP 4: Creating project object...");
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

    console.log("✅ Project object created:", {
      title: project.title,
      status: project.status,
      hasCommunity: !!project.community,
      communityId: project.community?.id
    });

    // Step 5: Handle project file
    console.log("📍 STEP 5: Handling file uploads...");
    if (req.files && (req.files as any).project_file) {
      const projectFile = (req.files as any).project_file[0];
      console.log("📁 Uploading project file:", {
        filename: projectFile.originalname,
        size: projectFile.size,
        mimetype: projectFile.mimetype
      });

      const validation = validateFileForUpload(projectFile);
      if (!validation.isValid) {
        console.log("❌ File validation failed:", validation.error);
        return res.status(400).json({
          success: false,
          message: validation.error
        });
      }

      const uploadResult = await UploadToCloud(projectFile);
      project.project_file_url = uploadResult.secure_url;
      console.log("✅ Project file uploaded:", uploadResult.secure_url);
    } else {
      console.log("❌ No project file provided");
      return res.status(400).json({
        success: false,
        message: "Project file is required"
      });
    }
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
    console.log("✅ Project saved:", {
      id: savedProject.id,
      title: savedProject.title,
      status: savedProject.status,
      communityId: communityId
    });

    console.log("📍 STEP 7: Verifying community_id in database...");
    const verifyProject = await projectRepo
      .createQueryBuilder("project")
      .where("project.id = :id", { id: savedProject.id })
      .getOne();

    console.log("🔍 Database verification:", {
      projectId: verifyProject?.id,
      hasCommunityId: !!(verifyProject as any)?.community_id,
      communityIdValue: (verifyProject as any)?.community_id
    });

    // Step 8: Handle tags
    console.log("📍 STEP 8: Processing tags...");
    if (tags) {
      const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
      console.log("🏷️ Tags to process:", tagArray);
      
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
            console.log("✅ Created new tag:", tagName);
          } else {
            tag.usage_count += 1;
            await tagRepo.save(tag);
            console.log("✅ Updated existing tag:", tagName);
          }
          
          projectTags.push(tag);
        }

        savedProject.tags = projectTags;
        await projectRepo.save(savedProject);
        console.log("✅ Tags linked to project:", projectTags.length);
      }
    }

    // Step 9: Handle additional files
    console.log("📍 STEP 9: Processing additional files...");
    if (req.files && (req.files as any).additional_files) {
      const additionalFiles = (req.files as any).additional_files;
      const fileRepo = dbConnection.getRepository(ProjectFile);
      console.log("📁 Additional files to upload:", additionalFiles.length);

      for (const file of additionalFiles) {
        const validation = validateFileForUpload(file);
        if (!validation.isValid) {
          console.log("⚠️ Skipping invalid file:", file.originalname);
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
        console.log("✅ Additional file uploaded:", file.originalname);
      }
    }

    // Step 11: Fetch complete project with all relations
    console.log("📍 STEP 11: Fetching complete project with relations...");
    const completeProject = await projectRepo.findOne({
      where: { id: savedProject.id },
      relations: ["author", "author.profile", "tags", "files", "community"]
    });

    console.log("✅ Complete project fetched:", {
      id: completeProject?.id,
      hasCommunity: !!completeProject?.community,
      communityName: completeProject?.community?.name,
      tagCount: completeProject?.tags?.length,
      fileCount: completeProject?.files?.length
    });

    // ========== EMAIL NOTIFICATION SECTION ==========
    console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
    console.log("📍 STEP 12: Sending email notifications to community members...");

    try {
      // Filter members (exclude project author)
      const membersToNotify = community.members.filter(member => member.id !== userId);
      
      console.log("📊 Email Distribution Plan:", {
        totalMembers: community.members.length,
        membersToNotify: membersToNotify.length,
        authorExcluded: userId
      });

      if (membersToNotify.length === 0) {
        console.log("⚠️ No members to notify (community only has creator)");
      } else {
        let emailsSent = 0;
        let emailsFailed = 0;
        const failedEmails: Array<{ email: string; error: string }> = [];

        for (let i = 0; i < membersToNotify.length; i++) {
          const member = membersToNotify[i];
          const progress = `[${i + 1}/${membersToNotify.length}]`;

          try {
            console.log(`\n${progress} 📧 Preparing email for: ${member.email}`);
            console.log(`   Name: ${member.first_name} ${member.last_name}`);

            // Prepare project data for email template
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

            // Generate email HTML
            const emailHtml = NewsProjectCreatedTemplate.getProjectCreatedTemplate(
              projectData,
              memberData
            );

            console.log(`   ✉️ Email HTML generated (${emailHtml.length} chars)`);
            console.log(`   📬 Sending email via sendEmail function...`);

            // Send email
            await sendEmail({
              to: member.email,
              subject: `🔬 New Research: ${completeProject!.title}`,
              html: emailHtml
            });

            emailsSent++;
            console.log(`   ✅ SUCCESS: Email sent to ${member.email}`);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (emailError: any) {
            emailsFailed++;
            const errorMsg = emailError.message || 'Unknown error';
            console.error(`   ❌ FAILED: ${member.email}`);
            console.error(`   Error: ${errorMsg}`);
            
            failedEmails.push({
              email: member.email,
              error: errorMsg
            });
          }
        }

        // Email distribution summary
        console.log("\n📊 === EMAIL DISTRIBUTION SUMMARY ===");
        console.log(`✅ Successfully sent: ${emailsSent}/${membersToNotify.length}`);
        console.log(`❌ Failed: ${emailsFailed}/${membersToNotify.length}`);
        console.log(`📧 Success rate: ${((emailsSent/membersToNotify.length)*100).toFixed(1)}%`);
        
        if (failedEmails.length > 0) {
          console.log("\n❌ Failed emails:");
          failedEmails.forEach((fail, idx) => {
            console.log(`  ${idx + 1}. ${fail.email} - ${fail.error}`);
          });
        }
      }

    } catch (emailSystemError: any) {
      console.error("❌ Email system error:", emailSystemError.message);
      console.error("⚠️ Project was created successfully, but email notifications failed");
      // Don't throw error - project creation succeeded
    }

    console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
    // ========== END EMAIL NOTIFICATION SECTION ==========

    // ==================== NOTIFY SUBSCRIBERS ====================
    // ✅ NEW SECTION - Send notifications to platform subscribers
    try {
      console.log("📧 ========== NOTIFYING PLATFORM SUBSCRIBERS ==========");
      
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

      // Call the subscriber notification method (non-blocking)
      SubscribeController.notifyNewProject(subscriberNotificationData)
        .catch(err => {
          console.error("❌ Subscriber notification failed:", err.message);
        });

      console.log("✅ Subscriber notification process initiated");
      console.log("📧 ========== SUBSCRIBER NOTIFICATION INITIATED ==========\n");

    } catch (subscriberError: any) {
      console.error("❌ Subscriber notification error:", subscriberError.message);
      // Don't fail the request if subscriber notification fails
    }
    // ==================== END SUBSCRIBER NOTIFICATION ====================

    console.log("🔍 ========== CREATE COMMUNITY PROJECT DEBUG END ==========\n");

    res.status(201).json({
      success: true,
      message: "Community project created successfully and notifications sent",
      data: { project: completeProject },
    });

  } catch (error: any) {
    console.error("❌ ========== ERROR IN CREATE COMMUNITY PROJECT ==========");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    console.error("===========================================================\n");

    res.status(500).json({
      success: false,
      message: "Failed to create community project",
      error: error.message
    });
  }
}
}