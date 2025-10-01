"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResearchProjectController = void 0;
const db_1 = __importDefault(require("../database/db"));
const ResearchProject_1 = require("../database/models/ResearchProject");
const ProjectFile_1 = require("../database/models/ProjectFile");
const ProjectTag_1 = require("../database/models/ProjectTag");
const Like_1 = require("../database/models/Like");
const Comment_1 = require("../database/models/Comment");
const cloud_1 = require("../helpers/cloud");
const utils_1 = require("../helpers/utils");
const ActivateDeactivateDeleteResearchProjectsTemplate_1 = require("../helpers/ActivateDeactivateDeleteResearchProjectsTemplate");
class ResearchProjectController {
    // ==================== ORIGINAL FUNCTIONS (100% MAINTAINED) ====================
    static async createProject(req, res) {
        try {
            const userId = req.user.userId;
            const { title, abstract, full_description, research_type, visibility, collaboration_status, tags, field_of_study, publication_date, doi } = req.body;
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
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
            if (field_of_study)
                project.field_of_study = field_of_study;
            if (doi)
                project.doi = doi;
            if (req.files && req.files.project_file) {
                const projectFile = req.files.project_file[0];
                const validation = (0, cloud_1.validateFileForUpload)(projectFile);
                if (!validation.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.error
                    });
                }
                const uploadResult = await (0, cloud_1.UploadToCloud)(projectFile);
                project.project_file_url = uploadResult.secure_url;
            }
            else {
                return res.status(400).json({
                    success: false,
                    message: "Project file is required"
                });
            }
            if (req.files && req.files.cover_image) {
                const coverImage = req.files.cover_image[0];
                const validation = (0, cloud_1.validateFileForUpload)(coverImage);
                if (!validation.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.error
                    });
                }
                const uploadResult = await (0, cloud_1.UploadToCloud)(coverImage);
                project.cover_image_url = uploadResult.secure_url;
            }
            await projectRepo.save(project);
            // FIXED: Handle tags with proper duplicate checking
            if (tags) {
                const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
                if (Array.isArray(tagArray) && tagArray.length > 0) {
                    const tagRepo = db_1.default.getRepository(ProjectTag_1.ProjectTag);
                    const projectTags = [];
                    for (const tagName of tagArray) {
                        if (!tagName || typeof tagName !== 'string')
                            continue;
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
                                category: 'Topic' // Use proper enum value
                            });
                            try {
                                await tagRepo.save(tag);
                            }
                            catch (tagError) {
                                // If still fails due to race condition, try to find again
                                if (tagError.code === '23505') { // Unique constraint violation
                                    tag = await tagRepo.findOne({
                                        where: { slug: tagSlug }
                                    });
                                    if (!tag) {
                                        console.warn(`❌ Failed to create tag "${tagName}":`, tagError.message);
                                        continue;
                                    }
                                }
                                else {
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
            if (req.files && req.files.additional_files) {
                const additionalFiles = req.files.additional_files;
                const fileRepo = db_1.default.getRepository(ProjectFile_1.ProjectFile);
                for (const file of additionalFiles) {
                    const validation = (0, cloud_1.validateFileForUpload)(file);
                    if (!validation.isValid)
                        continue;
                    const uploadResult = await (0, cloud_1.UploadToCloud)(file);
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
        }
        catch (error) {
            console.error("❌ Project creation error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to create project",
                error: error.message
            });
        }
    }
    static async getAllProjects(req, res) {
        try {
            const { page = 1, limit = 10, search, research_type, visibility, status } = req.query;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const queryBuilder = projectRepo.createQueryBuilder("project")
                .leftJoinAndSelect("project.author", "author")
                .leftJoinAndSelect("project.tags", "tags")
                .leftJoinAndSelect("project.files", "files");
            if (search) {
                queryBuilder.andWhere("(project.title ILIKE :search OR project.abstract ILIKE :search)", { search: `%${search}%` });
            }
            if (research_type)
                queryBuilder.andWhere("project.research_type = :research_type", { research_type });
            if (visibility)
                queryBuilder.andWhere("project.visibility = :visibility", { visibility });
            if (status)
                queryBuilder.andWhere("project.status = :status", { status });
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch projects",
                error: error.message
            });
        }
    }
    static async getProjectById(req, res) {
        var _a;
        try {
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
                const likeRepo = db_1.default.getRepository(Like_1.Like);
                const existingLike = await likeRepo.findOne({
                    where: {
                        user: { id: userId },
                        content_type: Like_1.ContentType.PROJECT,
                        content_id: id
                    }
                });
                hasLiked = !!existingLike;
            }
            const commentRepo = db_1.default.getRepository(Comment_1.Comment);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch project",
                error: error.message
            });
        }
    }
    static async likeProject(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const likeRepo = db_1.default.getRepository(Like_1.Like);
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
                    content_type: Like_1.ContentType.PROJECT,
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
            }
            else {
                const newLike = likeRepo.create({
                    user: { id: userId },
                    content_type: Like_1.ContentType.PROJECT,
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
        }
        catch (error) {
            console.error("❌ Like project error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to like project",
                error: error.message
            });
        }
    }
    static async commentOnProject(req, res) {
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
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const commentRepo = db_1.default.getRepository(Comment_1.Comment);
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
        }
        catch (error) {
            console.error("❌ Comment on project error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to add comment",
                error: error.message
            });
        }
    }
    static async updateProject(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const updates = req.body;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update project",
                error: error.message
            });
        }
    }
    static async deleteProject(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to delete project",
                error: error.message
            });
        }
    }
    static async getUserProjects(req, res) {
        try {
            const userId = req.user.userId;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const projects = await projectRepo.find({
                where: { author: { id: userId } },
                relations: ["tags", "files"],
                order: { created_at: "DESC" },
            });
            res.json({
                success: true,
                data: { projects },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch user projects",
                error: error.message
            });
        }
    }
    static async updateProjectStatus(req, res) {
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
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
            project.status = status;
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
        }
        catch (error) {
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
    static async getAllProjectsForAdmin(req, res) {
        try {
            console.log("\n🔍 [GET ALL PROJECTS FOR ADMIN] Starting...");
            const { page = 1, limit = 1000, search, research_type, visibility, status } = req.query;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
                queryBuilder.andWhere("(project.title ILIKE :search OR project.abstract ILIKE :search OR author.first_name ILIKE :search OR author.last_name ILIKE :search)", { search: `%${search}%` });
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
        }
        catch (error) {
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
    static async activateDeactivateProject(req, res) {
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
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
            project.status = status;
            await projectRepo.save(project);
            console.log(`✅ Project status updated to: ${status}`);
            // Send email notification
            console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
            try {
                const isActivation = status === "Published";
                const emailHtml = ActivateDeactivateDeleteResearchProjectsTemplate_1.ActivateDeactivateDeleteResearchProjectsTemplate.getStatusChangeTemplate(project, isActivation, reason);
                const emailSubject = isActivation
                    ? `✅ Your Research Project "${project.title}" Has Been Published`
                    : `⚠️ Your Research Project "${project.title}" Has Been Archived`;
                await (0, utils_1.sendEmail)({
                    to: project.author.email,
                    subject: emailSubject,
                    html: emailHtml
                });
                console.log(`✅ Email sent successfully to: ${project.author.email}`);
            }
            catch (emailError) {
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
        }
        catch (error) {
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
    static async deleteProjectByAdmin(req, res) {
        try {
            console.log("\n🗑️ ========== DELETE PROJECT BY ADMIN START ==========");
            const { id } = req.params;
            console.log("📥 Request Data:", { projectId: id });
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
                const emailHtml = ActivateDeactivateDeleteResearchProjectsTemplate_1.ActivateDeactivateDeleteResearchProjectsTemplate.getDeletionTemplate(project);
                await (0, utils_1.sendEmail)({
                    to: project.author.email,
                    subject: `🚨 Your Research Project "${project.title}" Has Been Deleted`,
                    html: emailHtml
                });
                console.log(`✅ Deletion notification email sent to: ${project.author.email}`);
            }
            catch (emailError) {
                console.error("❌ Email sending failed:", emailError.message);
            }
            console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
            // Delete associated files first
            if (project.files && project.files.length > 0) {
                const fileRepo = db_1.default.getRepository(ProjectFile_1.ProjectFile);
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
        }
        catch (error) {
            console.error("❌ Delete project by admin error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to delete project",
                error: error.message
            });
        }
    }
}
exports.ResearchProjectController = ResearchProjectController;
