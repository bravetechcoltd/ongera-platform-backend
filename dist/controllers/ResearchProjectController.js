"use strict";
//@ts-nocheck
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
const User_1 = require("../database/models/User");
const typeorm_1 = require("typeorm");
const CollaborationRequest_1 = require("../database/models/CollaborationRequest");
const ProjectContribution_1 = require("../database/models/ProjectContribution");
const CommunityPost_1 = require("../database/models/CommunityPost");
const ProjectApproval_1 = require("../database/models/ProjectApproval");
class ResearchProjectController {
    static async searchProjects(req, res) {
        try {
            console.log("\n🔍 ========== SEARCH PROJECTS START ==========");
            const { q = "", page = 1, limit = 10, research_type, field_of_study, academic_level, visibility, status, sort_by = "relevance" } = req.query;
            console.log("📥 Search Parameters:", {
                query: q,
                page,
                limit,
                research_type,
                field_of_study,
                academic_level,
                visibility,
                status,
                sort_by
            });
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            // Build query
            const queryBuilder = projectRepo.createQueryBuilder("project")
                .leftJoinAndSelect("project.author", "author")
                .leftJoinAndSelect("author.profile", "profile")
                .leftJoinAndSelect("author.assignedInstructor", "assignedInstructor")
                .leftJoinAndSelect("assignedInstructor.instructor", "instructor")
                .leftJoinAndSelect("instructor.profile", "instructorProfile")
                .leftJoinAndSelect("project.tags", "tags")
                .leftJoinAndSelect("project.files", "files")
                .where("project.status = :publishedStatus", { publishedStatus: ResearchProject_1.ProjectStatus.PUBLISHED });
            // Apply search query
            if (q && q !== "") {
                queryBuilder.andWhere("(project.title ILIKE :q OR project.abstract ILIKE :q OR project.full_description ILIKE :q)", { q: `%${q}%` });
            }
            // Apply filters
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
            // Apply sorting
            if (sort_by === "newest") {
                queryBuilder.orderBy("project.created_at", "DESC");
            }
            else if (sort_by === "most_viewed") {
                queryBuilder.orderBy("project.view_count", "DESC");
            }
            else if (sort_by === "most_downloaded") {
                queryBuilder.orderBy("project.download_count", "DESC");
            }
            else if (sort_by === "relevance" && q && q !== "") {
                // For relevance sorting, we need to use a different approach
                // First, get all matching projects
                const allMatchingProjects = await queryBuilder.getMany();
                // Sort them manually by relevance
                const searchTerm = q.toString().toLowerCase();
                const sortedProjects = allMatchingProjects.sort((a, b) => {
                    const aTitle = a.title.toLowerCase();
                    const bTitle = b.title.toLowerCase();
                    const aAbstract = a.abstract.toLowerCase();
                    const bAbstract = b.abstract.toLowerCase();
                    // Exact title match gets highest priority
                    const aExactTitle = aTitle === searchTerm ? 0 : 1;
                    const bExactTitle = bTitle === searchTerm ? 0 : 1;
                    if (aExactTitle !== bExactTitle) {
                        return aExactTitle - bExactTitle;
                    }
                    // Title starts with search term
                    const aStartsWith = aTitle.startsWith(searchTerm) ? 0 : 1;
                    const bStartsWith = bTitle.startsWith(searchTerm) ? 0 : 1;
                    if (aStartsWith !== bStartsWith) {
                        return aStartsWith - bStartsWith;
                    }
                    // Title contains search term
                    const aContains = aTitle.includes(searchTerm) ? 0 : 1;
                    const bContains = bTitle.includes(searchTerm) ? 0 : 1;
                    if (aContains !== bContains) {
                        return aContains - bContains;
                    }
                    // Abstract contains search term
                    const aAbstractContains = aAbstract.includes(searchTerm) ? 0 : 1;
                    const bAbstractContains = bAbstract.includes(searchTerm) ? 0 : 1;
                    if (aAbstractContains !== bAbstractContains) {
                        return aAbstractContains - bAbstractContains;
                    }
                    // Finally sort by creation date
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });
                // Apply pagination manually
                const skip = (Number(page) - 1) * Number(limit);
                const paginatedProjects = sortedProjects.slice(skip, skip + Number(limit));
                const formattedProjects = paginatedProjects.map(project => {
                    var _a, _b;
                    const hasInstructor = project.author.assignedInstructor &&
                        project.author.assignedInstructor.length > 0 &&
                        ((_a = project.author.assignedInstructor[0].instructor) === null || _a === void 0 ? void 0 : _a.profile);
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
                        tags: ((_b = project.tags) === null || _b === void 0 ? void 0 : _b.map(tag => ({
                            id: tag.id,
                            name: tag.name,
                            slug: tag.slug
                        }))) || []
                    };
                });
                console.log(`✅ Found ${sortedProjects.length} projects matching search, returning ${paginatedProjects.length}`);
                console.log("🔍 ========== SEARCH PROJECTS END ==========\n");
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
            }
            else {
                // For non-relevance sorting, use database pagination
                const skip = (Number(page) - 1) * Number(limit);
                queryBuilder.skip(skip).take(Number(limit));
                if (!sort_by || sort_by === "relevance") {
                    queryBuilder.orderBy("project.created_at", "DESC");
                }
                const [projects, total] = await queryBuilder.getManyAndCount();
                const formattedProjects = projects.map(project => {
                    var _a, _b;
                    const hasInstructor = project.author.assignedInstructor &&
                        project.author.assignedInstructor.length > 0 &&
                        ((_a = project.author.assignedInstructor[0].instructor) === null || _a === void 0 ? void 0 : _a.profile);
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
                        tags: ((_b = project.tags) === null || _b === void 0 ? void 0 : _b.map(tag => ({
                            id: tag.id,
                            name: tag.name,
                            slug: tag.slug
                        }))) || []
                    };
                });
                console.log(`✅ Found ${projects.length} projects matching search (total: ${total})`);
                console.log("🔍 ========== SEARCH PROJECTS END ==========\n");
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
        }
        catch (error) {
            console.error("❌ Search projects error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to search projects",
                error: error.message
            });
        }
    }
    static async createProject(req, res) {
        try {
            const userId = req.user.userId;
            const { title, abstract, full_description, research_type, visibility, collaboration_status, tags, field_of_study, publication_date, doi, academic_level // ==================== NEW: Accept academic_level ====================
             } = req.body;
            console.log("📝 Creating project with data:", {
                title,
                research_type,
                academic_level, // ==================== NEW: Log academic_level ====================
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
            // ==================== NEW: Set academic_level ====================
            if (academic_level)
                project.academic_level = academic_level;
            // Rest of the function remains 100% the same...
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
            if (tags) {
                const tagArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
                if (Array.isArray(tagArray) && tagArray.length > 0) {
                    const tagRepo = db_1.default.getRepository(ProjectTag_1.ProjectTag);
                    const projectTags = [];
                    for (const tagName of tagArray) {
                        if (!tagName || typeof tagName !== 'string')
                            continue;
                        const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
                        let tag = await tagRepo.findOne({
                            where: { slug: tagSlug }
                        });
                        if (!tag) {
                            tag = tagRepo.create({
                                name: tagName.trim(),
                                slug: tagSlug,
                                category: 'Topic'
                            });
                            try {
                                await tagRepo.save(tag);
                            }
                            catch (tagError) {
                                if (tagError.code === '23505') {
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
    // ==================== ENHANCED: getAllProjects with Full Author & Instructor Information ====================
    static async getAllProjects(req, res) {
        try {
            const { page = 1, limit = 10, search, research_type, visibility, status, academic_level } = req.query;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            // ==================== BUILD QUERY WITH COMPLETE AUTHOR RELATIONSHIPS ====================
            const queryBuilder = projectRepo.createQueryBuilder("project")
                // Load project's author (User)
                .leftJoinAndSelect("project.author", "author")
                // Load author's profile (institution details, academic info)
                .leftJoinAndSelect("author.profile", "profile")
                // Load author's assigned instructor relationship
                .leftJoinAndSelect("author.assignedInstructor", "assignedInstructor")
                // Load the actual instructor user details
                .leftJoinAndSelect("assignedInstructor.instructor", "instructor")
                // Load instructor's profile (instructor's institution, credentials)
                .leftJoinAndSelect("instructor.profile", "instructorProfile")
                // Load project tags and files
                .leftJoinAndSelect("project.tags", "tags")
                .leftJoinAndSelect("project.files", "files");
            // ==================== APPLY FILTERS ====================
            // Search filter (title or abstract)
            if (search) {
                queryBuilder.andWhere("(project.title ILIKE :search OR project.abstract ILIKE :search)", { search: `%${search}%` });
            }
            // Research type filter
            if (research_type) {
                queryBuilder.andWhere("project.research_type = :research_type", { research_type });
            }
            // Visibility filter
            if (visibility) {
                queryBuilder.andWhere("project.visibility = :visibility", { visibility });
            }
            // Status filter
            if (status) {
                queryBuilder.andWhere("project.status = :status", { status });
            }
            // Academic level filter
            if (academic_level) {
                queryBuilder.andWhere("project.academic_level = :academic_level", { academic_level });
            }
            // ==================== PAGINATION ====================
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            // Order by most recent first
            queryBuilder.orderBy("project.created_at", "DESC");
            // ==================== EXECUTE QUERY ====================
            const [projects, total] = await queryBuilder.getManyAndCount();
            // ==================== OPTIONAL: FORMAT RESPONSE FOR BETTER READABILITY ====================
            const formattedProjects = projects.map(project => {
                var _a, _b, _c, _d, _e, _f, _g;
                // ==================== PRIORITY: Use Instructor's Institution for Students ====================
                const hasInstructor = project.author.assignedInstructor &&
                    project.author.assignedInstructor.length > 0 &&
                    ((_a = project.author.assignedInstructor[0].instructor) === null || _a === void 0 ? void 0 : _a.profile);
                // If student has an instructor, use instructor's institution; otherwise use author's own
                const institutionData = hasInstructor
                    ? {
                        name: project.author.assignedInstructor[0].instructor.profile.institution_name,
                        department: project.author.assignedInstructor[0].instructor.profile.department,
                        academic_level: (_b = project.author.profile) === null || _b === void 0 ? void 0 : _b.academic_level, // Keep student's academic level
                        research_interests: (_c = project.author.profile) === null || _c === void 0 ? void 0 : _c.research_interests, // Keep student's interests
                        current_position: (_d = project.author.profile) === null || _d === void 0 ? void 0 : _d.current_position,
                        orcid_id: (_e = project.author.profile) === null || _e === void 0 ? void 0 : _e.orcid_id,
                        google_scholar_url: (_f = project.author.profile) === null || _f === void 0 ? void 0 : _f.google_scholar_url,
                        linkedin_url: (_g = project.author.profile) === null || _g === void 0 ? void 0 : _g.linkedin_url,
                        source: 'instructor' // Indicator that this came from instructor
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
                        source: 'self' // Indicator that this is author's own
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
                        // Institution information (prioritizes instructor's institution for students)
                        institution: institutionData,
                        // Assigned instructor information
                        instructor: hasInstructor ? {
                            id: project.author.assignedInstructor[0].instructor.id,
                            name: `${project.author.assignedInstructor[0].instructor.first_name} ${project.author.assignedInstructor[0].instructor.last_name}`,
                            email: project.author.assignedInstructor[0].instructor.email,
                            profile_picture_url: project.author.assignedInstructor[0].instructor.profile_picture_url,
                            assigned_at: project.author.assignedInstructor[0].assigned_at,
                            // Instructor's profile details
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
            // ==================== SEND RESPONSE ====================
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
        }
        catch (error) {
            console.error("❌ Get all projects error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch projects",
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
    // ==================== ENHANCED: UPDATE PROJECT WITH FILE & TAG MANAGEMENT ====================
    static async updateProject(req, res) {
        try {
            console.log("\n🔄 ========== UPDATE PROJECT START ==========");
            const { id } = req.params;
            const userId = req.user.userId;
            const updates = req.body;
            console.log("📥 Update Request:", { projectId: id, userId, updates });
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
            if (project.author.id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized to update this project"
                });
            }
            // ==================== HANDLE FILE UPDATES ====================
            // Extract Cloudinary public_id from URL
            const extractPublicId = (url) => {
                if (!url)
                    return null;
                try {
                    const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
                    return matches ? matches[1] : null;
                }
                catch (error) {
                    console.error("❌ Error extracting public_id:", error);
                    return null;
                }
            };
            // Determine resource type from URL
            const getResourceType = (url) => {
                if (!url)
                    return "raw";
                if (url.includes("/image/"))
                    return "image";
                if (url.includes("/video/"))
                    return "video";
                return "raw";
            };
            // Handle Cover Image Update
            if (req.files && req.files.cover_image) {
                console.log("\n🖼️ ===== COVER IMAGE UPDATE START =====");
                const newCoverImage = req.files.cover_image[0];
                console.log("📁 New cover image:", newCoverImage.originalname);
                // Validate new file
                const validation = (0, cloud_1.validateFileForUpload)(newCoverImage);
                if (!validation.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.error
                    });
                }
                // Delete old cover image from Cloudinary
                if (project.cover_image_url) {
                    const oldPublicId = extractPublicId(project.cover_image_url);
                    if (oldPublicId) {
                        try {
                            console.log("🗑️ Deleting old cover image:", oldPublicId);
                            await (0, cloud_1.DeleteFromCloud)(oldPublicId, "image");
                            console.log("✅ Old cover image deleted successfully");
                        }
                        catch (deleteError) {
                            console.warn("⚠️ Failed to delete old cover image:", deleteError.message);
                        }
                    }
                }
                // Upload new cover image
                try {
                    console.log("☁️ Uploading new cover image...");
                    const uploadResult = await (0, cloud_1.UploadToCloud)(newCoverImage);
                    project.cover_image_url = uploadResult.secure_url;
                    console.log("✅ New cover image uploaded:", uploadResult.secure_url);
                }
                catch (uploadError) {
                    console.error("❌ Failed to upload new cover image:", uploadError.message);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload new cover image"
                    });
                }
                console.log("🖼️ ===== COVER IMAGE UPDATE END =====\n");
            }
            // Handle Project File Update
            if (req.files && req.files.project_file) {
                console.log("\n📄 ===== PROJECT FILE UPDATE START =====");
                const newProjectFile = req.files.project_file[0];
                console.log("📁 New project file:", newProjectFile.originalname);
                // Validate new file
                const validation = (0, cloud_1.validateFileForUpload)(newProjectFile);
                if (!validation.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: validation.error
                    });
                }
                // Delete old project file from Cloudinary
                if (project.project_file_url) {
                    const oldPublicId = extractPublicId(project.project_file_url);
                    const resourceType = getResourceType(project.project_file_url);
                    if (oldPublicId) {
                        try {
                            console.log("🗑️ Deleting old project file:", oldPublicId);
                            await (0, cloud_1.DeleteFromCloud)(oldPublicId, resourceType);
                            console.log("✅ Old project file deleted successfully");
                        }
                        catch (deleteError) {
                            console.warn("⚠️ Failed to delete old project file:", deleteError.message);
                        }
                    }
                }
                // Upload new project file
                try {
                    console.log("☁️ Uploading new project file...");
                    const uploadResult = await (0, cloud_1.UploadToCloud)(newProjectFile);
                    project.project_file_url = uploadResult.secure_url;
                    console.log("✅ New project file uploaded:", uploadResult.secure_url);
                }
                catch (uploadError) {
                    console.error("❌ Failed to upload new project file:", uploadError.message);
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload new project file"
                    });
                }
                console.log("📄 ===== PROJECT FILE UPDATE END =====\n");
            }
            // Handle Additional Files Update
            if (req.files && req.files.additional_files) {
                console.log("\n📎 ===== ADDITIONAL FILES UPDATE START =====");
                const additionalFiles = req.files.additional_files;
                console.log(`📁 New additional files count: ${additionalFiles.length}`);
                // Optional: Delete old additional files if needed
                // This depends on your requirements - do you want to replace all or add new ones?
                // For now, we'll just add new files
                const fileRepo = db_1.default.getRepository(ProjectFile_1.ProjectFile);
                for (const file of additionalFiles) {
                    const validation = (0, cloud_1.validateFileForUpload)(file);
                    if (!validation.isValid) {
                        console.warn(`⚠️ Skipping invalid file: ${file.originalname}`);
                        continue;
                    }
                    try {
                        const uploadResult = await (0, cloud_1.UploadToCloud)(file);
                        const projectFile = fileRepo.create({
                            project,
                            file_url: uploadResult.secure_url,
                            file_name: file.originalname,
                            file_type: file.mimetype,
                            file_size: file.size,
                        });
                        await fileRepo.save(projectFile);
                        console.log(`✅ Additional file uploaded: ${file.originalname}`);
                    }
                    catch (uploadError) {
                        console.error(`❌ Failed to upload ${file.originalname}:`, uploadError.message);
                    }
                }
                console.log("📎 ===== ADDITIONAL FILES UPDATE END =====\n");
            }
            // ==================== HANDLE TAG UPDATES ====================
            if (updates.tags) {
                console.log("\n🏷️ ===== TAGS UPDATE START =====");
                const tagArray = typeof updates.tags === 'string' ? JSON.parse(updates.tags) : updates.tags;
                console.log("📥 New tags array:", tagArray);
                if (Array.isArray(tagArray)) {
                    const tagRepo = db_1.default.getRepository(ProjectTag_1.ProjectTag);
                    // Decrement usage count for old tags
                    if (project.tags && project.tags.length > 0) {
                        console.log("📉 Decrementing usage count for old tags...");
                        for (const oldTag of project.tags) {
                            oldTag.usage_count = Math.max(0, (oldTag.usage_count || 0) - 1);
                            await tagRepo.save(oldTag);
                            console.log(`✅ Decremented usage for tag: ${oldTag.name}`);
                        }
                    }
                    // Process new tags
                    const newProjectTags = [];
                    for (const tagName of tagArray) {
                        if (!tagName || typeof tagName !== 'string')
                            continue;
                        const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
                        console.log(`🔍 Processing tag: ${tagName} (slug: ${tagSlug})`);
                        // Check if tag exists
                        let tag = await tagRepo.findOne({
                            where: { slug: tagSlug }
                        });
                        if (!tag) {
                            // Create new tag
                            console.log(`➕ Creating new tag: ${tagName}`);
                            tag = tagRepo.create({
                                name: tagName.trim(),
                                slug: tagSlug,
                                category: 'Topic',
                                usage_count: 0
                            });
                            try {
                                await tagRepo.save(tag);
                                console.log(`✅ New tag created: ${tagName}`);
                            }
                            catch (tagError) {
                                if (tagError.code === '23505') {
                                    // Unique constraint violation - tag was created by another process
                                    tag = await tagRepo.findOne({
                                        where: { slug: tagSlug }
                                    });
                                    if (!tag) {
                                        console.warn(`❌ Failed to create/find tag "${tagName}"`);
                                        continue;
                                    }
                                    console.log(`✅ Tag found after constraint error: ${tagName}`);
                                }
                                else {
                                    console.warn(`❌ Failed to create tag "${tagName}":`, tagError.message);
                                    continue;
                                }
                            }
                        }
                        else {
                            console.log(`✅ Existing tag found: ${tagName}`);
                        }
                        // Increment usage count
                        if (tag) {
                            tag.usage_count = (tag.usage_count || 0) + 1;
                            await tagRepo.save(tag);
                            newProjectTags.push(tag);
                            console.log(`📈 Incremented usage for tag: ${tag.name} (count: ${tag.usage_count})`);
                        }
                    }
                    // Update project tags
                    project.tags = newProjectTags;
                    console.log(`✅ Project tags updated. Total: ${newProjectTags.length}`);
                }
                console.log("🏷️ ===== TAGS UPDATE END =====\n");
            }
            // ==================== UPDATE BASIC FIELDS ====================
            console.log("\n📝 Updating basic project fields...");
            const allowedUpdates = [
                'title', 'abstract', 'full_description', 'research_type',
                'visibility', 'collaboration_status', 'field_of_study',
                'publication_date', 'doi',
                'academic_level' // ==================== NEW: Add academic_level to allowed updates ====================
            ];
            for (const key of allowedUpdates) {
                if (updates[key] !== undefined && key !== 'tags') {
                    project[key] = updates[key];
                    console.log(`✅ Updated ${key}:`, updates[key]);
                }
            }
            // Save all changes
            await projectRepo.save(project);
            console.log("✅ Project saved successfully");
            // Fetch complete updated project
            const updatedProject = await projectRepo.findOne({
                where: { id },
                relations: ["author", "author.profile", "tags", "files"]
            });
            console.log("🔄 ========== UPDATE PROJECT END ==========\n");
            res.json({
                success: true,
                message: "Project updated successfully",
                data: { project: updatedProject },
            });
        }
        catch (error) {
            console.error("❌ Update project error:", error);
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
    static async updateProjectStatus(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { status, reason } = req.body; // Add reason parameter
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
            // ==================== NEW: SAVE STATUS CHANGE HISTORY ====================
            const statusChangeRecord = {
                from_status: project.status,
                to_status: status,
                changed_by: userId,
                changed_at: new Date(),
                reason: reason || null,
                notes: status === 'Published' ? 'Published by author' : 'Changed to draft by author'
            };
            if (!project.status_change_history) {
                project.status_change_history = [statusChangeRecord];
            }
            else {
                project.status_change_history.push(statusChangeRecord);
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
                data: {
                    project: updatedProject,
                    status_change_reason: reason
                }
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
    static async getAllProjectsForAdmin(req, res) {
        try {
            console.log("\n🔍 [GET ALL PROJECTS FOR ADMIN] Starting...");
            const { page = 1, limit = 1000, search, research_type, visibility, status, academic_level } = req.query;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            // ==================== BUILD QUERY WITH COMPLETE AUTHOR & INSTRUCTOR RELATIONSHIPS ====================
            const queryBuilder = projectRepo.createQueryBuilder("project")
                // Load project's author (User)
                .leftJoinAndSelect("project.author", "author")
                // Load author's profile (institution details, academic info)
                .leftJoinAndSelect("author.profile", "profile")
                // Load author's assigned instructor relationship
                .leftJoinAndSelect("author.assignedInstructor", "assignedInstructor")
                // Load the actual instructor user details
                .leftJoinAndSelect("assignedInstructor.instructor", "instructor")
                // Load instructor's profile (instructor's institution, credentials)
                .leftJoinAndSelect("instructor.profile", "instructorProfile")
                // Load project tags and files
                .leftJoinAndSelect("project.tags", "tags")
                .leftJoinAndSelect("project.files", "files");
            // ==================== APPLY FILTERS ====================
            // Search filter (title, abstract, or author name)
            if (search) {
                queryBuilder.andWhere("(project.title ILIKE :search OR project.abstract ILIKE :search OR author.first_name ILIKE :search OR author.last_name ILIKE :search)", { search: `%${search}%` });
            }
            // Research type filter
            if (research_type) {
                queryBuilder.andWhere("project.research_type = :research_type", { research_type });
            }
            // Visibility filter
            if (visibility) {
                queryBuilder.andWhere("project.visibility = :visibility", { visibility });
            }
            // Status filter
            if (status) {
                queryBuilder.andWhere("project.status = :status", { status });
            }
            // Academic level filter
            if (academic_level) {
                queryBuilder.andWhere("project.academic_level = :academic_level", { academic_level });
            }
            // ==================== GET TOTAL COUNT ====================
            const total = await queryBuilder.getCount();
            console.log(`📊 Total projects found: ${total}`);
            // ==================== PAGINATION ====================
            const skip = (Number(page) - 1) * Number(limit);
            queryBuilder.skip(skip).take(Number(limit));
            // Order by most recent first
            queryBuilder.orderBy("project.created_at", "DESC");
            // ==================== EXECUTE QUERY ====================
            const projects = await queryBuilder.getMany();
            console.log(`✅ Retrieved ${projects.length} projects for current page`);
            // ==================== FORMAT RESPONSE WITH INSTRUCTOR PRIORITY ====================
            const formattedProjects = projects.map(project => {
                var _a, _b, _c, _d, _e, _f, _g;
                // ==================== PRIORITY: Use Instructor's Institution for Students ====================
                const hasInstructor = project.author.assignedInstructor &&
                    project.author.assignedInstructor.length > 0 &&
                    ((_a = project.author.assignedInstructor[0].instructor) === null || _a === void 0 ? void 0 : _a.profile);
                // If student has an instructor, use instructor's institution; otherwise use author's own
                const institutionData = hasInstructor
                    ? {
                        name: project.author.assignedInstructor[0].instructor.profile.institution_name,
                        department: project.author.assignedInstructor[0].instructor.profile.department,
                        academic_level: (_b = project.author.profile) === null || _b === void 0 ? void 0 : _b.academic_level, // Keep student's academic level
                        research_interests: (_c = project.author.profile) === null || _c === void 0 ? void 0 : _c.research_interests, // Keep student's interests
                        current_position: (_d = project.author.profile) === null || _d === void 0 ? void 0 : _d.current_position,
                        orcid_id: (_e = project.author.profile) === null || _e === void 0 ? void 0 : _e.orcid_id,
                        google_scholar_url: (_f = project.author.profile) === null || _f === void 0 ? void 0 : _f.google_scholar_url,
                        linkedin_url: (_g = project.author.profile) === null || _g === void 0 ? void 0 : _g.linkedin_url,
                        source: 'instructor' // Indicator that this came from instructor
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
                        source: 'self' // Indicator that this is author's own
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
                        // Institution information (prioritizes instructor's institution for students)
                        institution: institutionData,
                        // Assigned instructor information
                        instructor: hasInstructor ? {
                            id: project.author.assignedInstructor[0].instructor.id,
                            name: `${project.author.assignedInstructor[0].instructor.first_name} ${project.author.assignedInstructor[0].instructor.last_name}`,
                            email: project.author.assignedInstructor[0].instructor.email,
                            profile_picture_url: project.author.assignedInstructor[0].instructor.profile_picture_url,
                            assigned_at: project.author.assignedInstructor[0].assigned_at,
                            // Instructor's profile details
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
            console.log(`✅ Formatted ${formattedProjects.length} projects with instructor info`);
            // ==================== SEND RESPONSE ====================
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
            console.log("🔍 [GET ALL PROJECTS FOR ADMIN] Complete\n");
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
    static async activateDeactivateProject(req, res) {
        var _a;
        try {
            console.log("\n🔄 ========== ACTIVATE/DEACTIVATE PROJECT START ==========");
            const { id } = req.params;
            const { status, reason } = req.body;
            console.log("📥 Request Data:", { projectId: id, status, reason });
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
            // ==================== NEW: SAVE STATUS CHANGE HISTORY ====================
            const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || 'admin'; // If no user in request, it's admin
            const statusChangeRecord = {
                from_status: project.status,
                to_status: status,
                changed_by: userId,
                changed_at: new Date(),
                reason: reason || null,
                notes: status === 'Archived' ? 'Archived by administrator' : 'Published by administrator'
            };
            // Initialize or update status_change_history
            if (!project.status_change_history) {
                project.status_change_history = [statusChangeRecord];
            }
            else {
                project.status_change_history.push(statusChangeRecord);
            }
            const oldStatus = project.status;
            project.status = status;
            await projectRepo.save(project);
            console.log(`✅ Project status updated to: ${status}`);
            console.log(`📝 Status change reason saved: ${reason || 'No reason provided'}`);
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
                        status_change_reason: reason,
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
    static async deleteProjectByAdmin(req, res) {
        try {
            console.log("\n🗑️ ========== DELETE PROJECT BY ADMIN (COMPLETE) START ==========");
            const { id } = req.params;
            const { reason } = req.body;
            const adminId = req.user.userId;
            console.log("📥 Request Data:", { projectId: id, hasReason: !!reason, adminId });
            // Validate reason
            if (!reason || reason.trim().length < 20) {
                return res.status(400).json({
                    success: false,
                    message: "A detailed reason (minimum 20 characters) is required for project deletion"
                });
            }
            // Start a transaction
            await db_1.default.transaction(async (transactionalEntityManager) => {
                const projectRepo = transactionalEntityManager.getRepository(ResearchProject_1.ResearchProject);
                const likeRepo = transactionalEntityManager.getRepository(Like_1.Like);
                const commentRepo = transactionalEntityManager.getRepository(Comment_1.Comment);
                const fileRepo = transactionalEntityManager.getRepository(ProjectFile_1.ProjectFile);
                const collaborationRequestRepo = transactionalEntityManager.getRepository(CollaborationRequest_1.CollaborationRequest);
                const contributionRepo = transactionalEntityManager.getRepository(ProjectContribution_1.ProjectContribution);
                const communityPostRepo = transactionalEntityManager.getRepository(CommunityPost_1.CommunityPost);
                const userRepo = transactionalEntityManager.getRepository(User_1.User);
                const projectApprovalRepo = transactionalEntityManager.getRepository(ProjectApproval_1.ProjectApproval);
                // Step 1: Find project with essential relations only
                console.log("📍 STEP 1: Fetching project with essential relations...");
                const project = await projectRepo.findOne({
                    where: { id },
                    relations: ["author"]
                });
                if (!project) {
                    console.log("❌ Project not found");
                    throw new Error("Project not found");
                }
                // Get author profile separately if needed
                const authorWithProfile = await userRepo.findOne({
                    where: { id: project.author.id },
                    relations: ["profile"]
                });
                if (authorWithProfile) {
                    project.author = authorWithProfile;
                }
                // Get files count
                const filesCount = await fileRepo.count({ where: { project: { id } } });
                // Get community posts count
                const postsCount = await communityPostRepo.count({
                    where: { linked_project: { id } }
                });
                console.log("✅ Project found:", {
                    title: project.title,
                    author: `${project.author.first_name} ${project.author.last_name}`,
                    filesCount,
                    postsCount
                });
                // Get admin details for email
                const admin = await userRepo.findOne({
                    where: { id: adminId },
                    relations: ["profile"]
                });
                if (!admin) {
                    console.log("❌ Admin not found");
                    throw new Error("Admin not found");
                }
                // Store project data before deletion (for email)
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
                // ==================== DELETE ALL RELATED DATA IN CORRECT ORDER ====================
                console.log("\n📍 STEP 2: Deleting related data...");
                // 1. Delete all project approvals FIRST (before anything else)
                console.log("   📋 Deleting project approvals...");
                const approvalsResult = await projectApprovalRepo
                    .createQueryBuilder()
                    .delete()
                    .from(ProjectApproval_1.ProjectApproval)
                    .where("project_id = :projectId", { projectId: id })
                    .execute();
                console.log(`   ✅ Deleted ${approvalsResult.affected || 0} project approvals`);
                // 2. Delete all likes for this project
                console.log("   📋 Deleting likes...");
                const likesResult = await likeRepo.delete({
                    content_type: Like_1.ContentType.PROJECT,
                    content_id: id
                });
                console.log(`   ✅ Deleted ${likesResult.affected || 0} likes`);
                // 3. Delete all comments for this project
                console.log("   📋 Deleting comments...");
                const commentsResult = await commentRepo.delete({
                    content_type: Like_1.ContentType.PROJECT,
                    content_id: id
                });
                console.log(`   ✅ Deleted ${commentsResult.affected || 0} comments`);
                // 4. Delete all collaboration requests for this project
                console.log("   📋 Deleting collaboration requests...");
                const collabRequestsResult = await collaborationRequestRepo
                    .createQueryBuilder()
                    .delete()
                    .from(CollaborationRequest_1.CollaborationRequest)
                    .where("project_id = :projectId", { projectId: id })
                    .execute();
                console.log(`   ✅ Deleted ${collabRequestsResult.affected || 0} collaboration requests`);
                // 5. Delete all project contributions
                console.log("   📋 Deleting project contributions...");
                const contributionsResult = await contributionRepo
                    .createQueryBuilder()
                    .delete()
                    .from(ProjectContribution_1.ProjectContribution)
                    .where("project_id = :projectId", { projectId: id })
                    .execute();
                console.log(`   ✅ Deleted ${contributionsResult.affected || 0} contributions`);
                // 6. Delete all project files from database and Cloudinary
                const projectFiles = await fileRepo.find({ where: { project: { id } } });
                if (projectFiles.length > 0) {
                    console.log(`   📋 Deleting ${projectFiles.length} project files...`);
                    // Extract public IDs from URLs and delete from Cloudinary
                    const extractPublicId = (url) => {
                        if (!url)
                            return null;
                        try {
                            const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
                            return matches ? matches[1] : null;
                        }
                        catch (error) {
                            return null;
                        }
                    };
                    for (const file of projectFiles) {
                        if (file.file_url) {
                            try {
                                const publicId = extractPublicId(file.file_url);
                                if (publicId) {
                                    await (0, cloud_1.DeleteFromCloud)(publicId, "raw");
                                    console.log(`      ✅ Deleted from Cloudinary: ${publicId}`);
                                }
                            }
                            catch (cloudError) {
                                console.warn(`      ⚠️ Failed to delete from Cloudinary: ${file.file_url}`);
                            }
                        }
                    }
                    // Delete from database
                    await fileRepo
                        .createQueryBuilder()
                        .delete()
                        .from(ProjectFile_1.ProjectFile)
                        .where("project_id = :projectId", { projectId: id })
                        .execute();
                    console.log(`   ✅ Deleted files from database`);
                }
                // 7. Delete main project file if exists
                if (project.project_file_url) {
                    console.log(`   📋 Deleting main project file...`);
                    const extractPublicId = (url) => {
                        const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
                        return matches ? matches[1] : null;
                    };
                    const publicId = extractPublicId(project.project_file_url);
                    if (publicId) {
                        try {
                            await (0, cloud_1.DeleteFromCloud)(publicId, "raw");
                            console.log(`      ✅ Deleted main project file from Cloudinary`);
                        }
                        catch (cloudError) {
                            console.warn(`      ⚠️ Failed to delete main project file from Cloudinary`);
                        }
                    }
                }
                // 8. Delete cover image if exists
                if (project.cover_image_url) {
                    console.log(`   📋 Deleting cover image...`);
                    const extractPublicId = (url) => {
                        const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)(\.[^.]+)?$/);
                        return matches ? matches[1] : null;
                    };
                    const publicId = extractPublicId(project.cover_image_url);
                    if (publicId) {
                        try {
                            await (0, cloud_1.DeleteFromCloud)(publicId, "image");
                            console.log(`      ✅ Deleted cover image from Cloudinary`);
                        }
                        catch (cloudError) {
                            console.warn(`      ⚠️ Failed to delete cover image from Cloudinary`);
                        }
                    }
                }
                // 9. Unlink from community posts
                console.log("   📋 Unlinking from community posts...");
                const postsUpdateResult = await communityPostRepo
                    .createQueryBuilder()
                    .update(CommunityPost_1.CommunityPost)
                    .set({ linked_project: null })
                    .where("linked_project_id = :projectId", { projectId: id })
                    .execute();
                console.log(`   ✅ Unlinked from ${postsUpdateResult.affected || 0} community posts`);
                // 10. Remove from event_projects junction table - USING RAW QUERY
                console.log("   📋 Unlinking from events...");
                try {
                    const eventsUnlinkResult = await transactionalEntityManager.query(`DELETE FROM event_projects WHERE project_id = $1`, [id]);
                    console.log(`   ✅ Unlinked from events`);
                }
                catch (eventError) {
                    console.log(`   ⚠️ No events to unlink or events table doesn't exist`);
                }
                // 11. Remove from project_tag_association junction table
                console.log("   📋 Removing tag associations...");
                const tagsResult = await transactionalEntityManager
                    .createQueryBuilder()
                    .delete()
                    .from("project_tag_association")
                    .where("project_id = :projectId", { projectId: id })
                    .execute();
                console.log(`   ✅ Removed ${tagsResult.affected || 0} tag associations`);
                // 12. Finally delete the project itself
                console.log("📍 STEP 3: Permanently deleting project...");
                await projectRepo
                    .createQueryBuilder()
                    .delete()
                    .from(ResearchProject_1.ResearchProject)
                    .where("id = :id", { id })
                    .execute();
                console.log("✅ Project permanently deleted:", project.id);
                // ==================== SEND EMAIL TO AUTHOR ====================
                console.log("\n📧 ========== SENDING DELETION EMAIL TO AUTHOR ==========");
                try {
                    console.log(`📧 Sending deletion notification to: ${authorData.email}`);
                    const { DeleteResearchProjectTemplate } = require('../helpers/DeleteResearchProjectTemplate');
                    const emailHtml = DeleteResearchProjectTemplate.getDeletionTemplate(projectData, authorData, reason, adminInfo);
                    await (0, utils_1.sendEmail)({
                        to: authorData.email,
                        subject: `⚠️ Research Project Deleted: "${projectData.title}"`,
                        html: emailHtml
                    });
                    console.log(`✅ Deletion email sent successfully to: ${authorData.email}`);
                }
                catch (emailError) {
                    console.error("❌ Failed to send deletion email to author:", emailError.message);
                    // Don't throw - email failure shouldn't rollback the transaction
                }
                console.log("📧 ========== DELETION EMAIL COMPLETE ==========\n");
                // Send response from within the transaction
                res.json({
                    success: true,
                    message: "Project permanently deleted successfully and author notified",
                    data: {
                        id: project.id,
                        title: project.title,
                        author: authorData.email
                    }
                });
            }); // End of transaction
            console.log("\n🗑️ ========== DELETE PROJECT BY ADMIN END ==========\n");
        }
        catch (error) {
            console.error("❌ ========== ERROR IN DELETE PROJECT ==========");
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
            console.error("Error details:", {
                message: error.message,
                stack: error.stack,
                code: error.code,
                detail: error.detail
            });
            console.error("=================================================\n");
            // Check if headers already sent
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Failed to delete project",
                    error: error.message
                });
            }
        }
    }
    static async getUserProjects(req, res) {
        try {
            console.log("\n📋 ========== GET USER PROJECTS START ==========");
            const userId = req.user.userId;
            console.log("👤 User ID:", userId);
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            // ==================== STEP 1: Get Owned Projects ====================
            console.log("\n📊 STEP 1: Fetching owned projects...");
            try {
                const ownedProjects = await projectRepo.find({
                    where: { author: { id: userId } },
                    relations: ["tags", "files", "author"],
                    order: { created_at: "DESC" },
                });
                console.log(`✅ Found ${ownedProjects.length} owned projects`);
                // Log each project with collaboration info
                ownedProjects.forEach((project, index) => {
                    console.log(`  ${index + 1}. "${project.title}"`);
                    console.log(`     - Status: ${project.status}`);
                    console.log(`     - Collaboration: ${project.collaboration_status}`);
                    console.log(`     - Collaborators: ${project.collaborator_count || 0}`);
                    console.log(`     - Approved list:`, project.approved_collaborators || []);
                });
                // ==================== STEP 2: Get Collaborative Projects ====================
                console.log("\n📊 STEP 2: Fetching collaborative projects...");
                let collaborativeProjects = [];
                try {
                    // Check if approved_collaborators column exists before querying
                    const tableInfo = await projectRepo.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'research_projects' 
            AND column_name = 'approved_collaborators'
        `);
                    console.log("🔍 Column check result:", tableInfo);
                    if (tableInfo && tableInfo.length > 0) {
                        console.log("✅ approved_collaborators column exists");
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
                        console.log(`✅ Found ${collaborativeProjects.length} collaborative projects`);
                        collaborativeProjects.forEach((project, index) => {
                            console.log(`  ${index + 1}. "${project.title}"`);
                            console.log(`     - Owner: ${project.author.first_name} ${project.author.last_name}`);
                            console.log(`     - Status: ${project.status}`);
                        });
                    }
                    else {
                        console.error("❌ approved_collaborators column does NOT exist!");
                        console.log("📝 Please run the database migration to add this column");
                        console.log("💡 See migration code in the fix file");
                    }
                }
                catch (collabError) {
                    console.error("❌ Error fetching collaborative projects:", collabError.message);
                    console.error("📋 Full error:", collabError);
                    // Check if it's a column error
                    if (collabError.message.includes("approved_collaborators")) {
                        console.error("\n🚨 DATABASE SCHEMA ISSUE DETECTED:");
                        console.error("   The 'approved_collaborators' column is missing from research_projects table");
                        console.error("\n💡 SOLUTION:");
                        console.error("   1. Run the migration provided in this fix");
                        console.error("   2. OR execute the SQL commands manually");
                        console.error("   3. Restart your server after migration");
                    }
                }
                // ==================== STEP 3: Return Response ====================
                console.log("\n📤 STEP 3: Preparing response...");
                const response = {
                    success: true,
                    data: {
                        owned_projects: ownedProjects,
                        collaborative_projects: collaborativeProjects,
                        total_owned: ownedProjects.length,
                        total_collaborative: collaborativeProjects.length
                    }
                };
                console.log("✅ Response prepared:");
                console.log(`   - Owned: ${ownedProjects.length}`);
                console.log(`   - Collaborative: ${collaborativeProjects.length}`);
                console.log("📋 ========== GET USER PROJECTS END ==========\n");
                res.json(response);
            }
            catch (ownedError) {
                console.error("❌ Error fetching owned projects:", ownedError.message);
                throw ownedError;
            }
        }
        catch (error) {
            console.error("\n❌ ========== GET USER PROJECTS ERROR ==========");
            console.error("Error type:", error.constructor.name);
            console.error("Error message:", error.message);
            console.error("Error code:", error.code);
            console.error("Full error:", error);
            console.error("========== ERROR END ==========\n");
            // Provide helpful error message
            let errorMessage = "Failed to fetch user projects";
            let helpfulTip = "";
            if (error.message.includes("approved_collaborators")) {
                errorMessage = "Database schema needs update";
                helpfulTip = "Please run the provided migration to add collaboration columns";
            }
            else if (error.code === "42P01") {
                errorMessage = "Table does not exist";
                helpfulTip = "Please ensure all database migrations have been run";
            }
            else if (error.code === "42703") {
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
    static async getProjectById(req, res) {
        var _a;
        try {
            console.log("\n📖 ========== GET PROJECT BY ID START ==========");
            const { id } = req.params;
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            console.log("📥 Request Data:", { projectId: id, userId });
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const project = await projectRepo.findOne({
                where: { id },
                relations: ["author", "author.profile", "tags", "files"],
            });
            if (!project) {
                console.log("❌ Project not found");
                return res.status(404).json({
                    success: false,
                    message: "Project not found"
                });
            }
            console.log("✅ Project found:", project.title);
            // Increment view count
            project.view_count += 1;
            await projectRepo.save(project);
            let hasLiked = false;
            let collaborationInfo = null;
            if (userId) {
                // Check if user has liked
                const likeRepo = db_1.default.getRepository(Like_1.Like);
                const existingLike = await likeRepo.findOne({
                    where: {
                        user: { id: userId },
                        content_type: Like_1.ContentType.PROJECT,
                        content_id: id
                    }
                });
                hasLiked = !!existingLike;
                // ==================== ENHANCED COLLABORATION INFO ====================
                console.log("\n📊 Building collaboration info...");
                const approvedCollaborators = project.approved_collaborators || [];
                const isCollaborator = approvedCollaborators.some(c => c.user_id === userId);
                const isOwner = project.author.id === userId;
                // Get user's specific collaboration status from collaboration_info
                const userCollaborationInfo = (project.collaboration_info || []).find(info => info.user_id === userId);
                // Check latest collaboration request
                const requestRepo = db_1.default.getRepository(CollaborationRequest_1.CollaborationRequest);
                const latestRequest = await requestRepo.findOne({
                    where: {
                        project: { id },
                        requester: { id: userId }
                    },
                    order: { requested_at: "DESC" }
                });
                // Determine if user can request collaboration
                const canRequest = !isOwner &&
                    !isCollaborator &&
                    project.collaboration_status !== ResearchProject_1.CollaborationStatus.SOLO &&
                    (!latestRequest ||
                        latestRequest.status === CollaborationRequest_1.CollaborationRequestStatus.REJECTED);
                collaborationInfo = {
                    can_request: canRequest,
                    is_collaborator: isCollaborator,
                    is_owner: isOwner,
                    request_status: (latestRequest === null || latestRequest === void 0 ? void 0 : latestRequest.status) || null,
                    collaborator_count: project.collaborator_count || 0,
                    // NEW: User's collaboration journey
                    user_collaboration_status: (userCollaborationInfo === null || userCollaborationInfo === void 0 ? void 0 : userCollaborationInfo.status) || null,
                    requested_at: (userCollaborationInfo === null || userCollaborationInfo === void 0 ? void 0 : userCollaborationInfo.requested_at) || (latestRequest === null || latestRequest === void 0 ? void 0 : latestRequest.requested_at) || null,
                    approved_at: (userCollaborationInfo === null || userCollaborationInfo === void 0 ? void 0 : userCollaborationInfo.status) === ResearchProject_1.CollaborationInfoStatus.APPROVED
                        ? userCollaborationInfo.updated_at
                        : null,
                    rejected_at: (userCollaborationInfo === null || userCollaborationInfo === void 0 ? void 0 : userCollaborationInfo.status) === ResearchProject_1.CollaborationInfoStatus.REJECTED
                        ? userCollaborationInfo.updated_at
                        : null
                };
                console.log("✅ Collaboration info built:", collaborationInfo);
                // ==================== OWNER-ONLY: FULL COLLABORATION TRACKING ====================
                if (isOwner) {
                    console.log("\n👑 User is owner - including full collaboration tracking");
                    const collaborationTracking = project.collaboration_info || [];
                    // Organize by status
                    const pendingRequests = collaborationTracking.filter(info => info.status === ResearchProject_1.CollaborationInfoStatus.PENDING);
                    const approvedCollaborators = collaborationTracking.filter(info => info.status === ResearchProject_1.CollaborationInfoStatus.APPROVED);
                    const rejectedRequests = collaborationTracking.filter(info => info.status === ResearchProject_1.CollaborationInfoStatus.REJECTED);
                    collaborationInfo.tracking = {
                        pending: pendingRequests.map(info => ({
                            user_id: info.user_id,
                            user_name: info.user_name,
                            user_email: info.user_email,
                            requested_at: info.requested_at,
                            reason: info.reason,
                            expertise: info.expertise
                        })),
                        approved: approvedCollaborators.map(info => ({
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
                            approved_count: approvedCollaborators.length,
                            rejected_count: rejectedRequests.length
                        }
                    };
                    console.log("✅ Collaboration tracking added:", collaborationInfo.tracking.summary);
                }
            }
            // Get comments
            const commentRepo = db_1.default.getRepository(Comment_1.Comment);
            const comments = await commentRepo.find({
                where: {
                    content_type: "Project",
                    content_id: id
                },
                relations: ["author"],
                order: { created_at: "DESC" }
            });
            // Get approved contributions count
            const contributionRepo = db_1.default.getRepository(ProjectContribution_1.ProjectContribution);
            const contributionsCount = await contributionRepo.count({
                where: {
                    project: { id },
                    is_approved: true
                }
            });
            console.log("📖 ========== GET PROJECT BY ID END ==========\n");
            res.json({
                success: true,
                data: {
                    project,
                    hasLiked,
                    comments,
                    // collaboration_info: collaborationInfo,
                    contributions_count: contributionsCount
                },
            });
        }
        catch (error) {
            console.error("❌ Get project by ID error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch project",
                error: error.message
            });
        }
    }
    static async getProjectsSeekingCollaborators(req, res) {
        try {
            const { page = 1, limit = 10, search, research_type, field_of_study } = req.query;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
            const queryBuilder = projectRepo.createQueryBuilder("project")
                .leftJoinAndSelect("project.author", "author")
                .leftJoinAndSelect("author.profile", "profile")
                .leftJoinAndSelect("project.tags", "tags")
                .where("project.collaboration_status = :status", {
                status: ResearchProject_1.CollaborationStatus.SEEKING_COLLABORATORS
            })
                .andWhere("project.status = :projectStatus", {
                projectStatus: ResearchProject_1.ProjectStatus.PUBLISHED
            });
            if (search) {
                queryBuilder.andWhere("(project.title ILIKE :search OR project.abstract ILIKE :search)", { search: `%${search}%` });
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
        }
        catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to fetch projects seeking collaborators",
                error: error.message
            });
        }
    }
    static async getProjectCollaborators(req, res) {
        try {
            const { id } = req.params;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
            // Get collaborator details
            const userRepo = db_1.default.getRepository(User_1.User);
            const collaboratorIds = approvedCollaborators.map(c => c.user_id);
            const collaborators = await userRepo.find({
                where: { id: (0, typeorm_1.In)(collaboratorIds) },
                relations: ["profile"]
            });
            // Add approval date to each collaborator
            const collaboratorsWithDetails = collaborators.map(collab => {
                var _a;
                const approvalInfo = approvedCollaborators.find(c => c.user_id === collab.id);
                return {
                    id: collab.id,
                    first_name: collab.first_name,
                    last_name: collab.last_name,
                    email: collab.email,
                    profile_picture_url: collab.profile_picture_url,
                    institution: (_a = collab.profile) === null || _a === void 0 ? void 0 : _a.institution_name,
                    approved_at: approvalInfo === null || approvalInfo === void 0 ? void 0 : approvalInfo.approved_at,
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
        }
        catch (error) {
            console.error("❌ Get project collaborators error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch project collaborators",
                error: error.message
            });
        }
    }
    static async removeCollaborator(req, res) {
        try {
            const { id: projectId, userId: collaboratorId } = req.params;
            const currentUserId = req.user.userId;
            const projectRepo = db_1.default.getRepository(ResearchProject_1.ResearchProject);
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
            // Only project creator can remove collaborators
            if (project.author.id !== currentUserId) {
                return res.status(403).json({
                    success: false,
                    message: "Only project creator can remove collaborators"
                });
            }
            // Remove from approved collaborators
            const approvedCollaborators = project.approved_collaborators || [];
            const updatedCollaborators = approvedCollaborators.filter(c => c.user_id !== collaboratorId);
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
        }
        catch (error) {
            console.error("❌ Remove collaborator error:", error);
            res.status(500).json({
                success: false,
                message: "Failed to remove collaborator",
                error: error.message
            });
        }
    }
}
exports.ResearchProjectController = ResearchProjectController;
