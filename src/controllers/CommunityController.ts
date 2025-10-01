// @ts-nocheck
import { Request, Response } from "express";
import { Community } from "../database/models/Community";
import dbConnection from '../database/db';
import { UploadToCloud } from "../helpers/cloud";
import { ResearchProject } from "../database/models/ResearchProject";
import { CommunityPost } from "../database/models/CommunityPost";
import { sendEmail } from "../helpers/utils";
import { ActivateDeactiveCommunityTemplate } from '../helpers/ActivateDeactiveCommunityTemplate';
import { AccountType, User } from "../database/models/User";
import { SendEmailToAdminTemplate } from '../helpers/SendEmailToAdminTemplate';
import { ApproveRejectCommunityToCreatorTemplate } from '../helpers/ApproveRejectCommunityToCreatorTemplate';
import { JoinRequestEmailTemplate } from '../helpers/JoinRequestEmailTemplate';
import { SubscribeController } from './SubscribeController';
import { CommunityJoinRequest, JoinRequestStatus } from "../database/models/CommunityJoinRequest";
import { ApproveUserRequestToJoinCommunityTemplate } from '../helpers/ApproveUserRequestToJoinCommunityTemplate';
import {DeleteCommunityTemplate }from '../helpers/DeleteCommunityTemplate';
import { BlogPost } from "../database/models/BlogPost";

export class CommunityController {
 
static async editCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { name, description, category, community_type, join_approval_required, rules } = req.body;

    const communityRepo = dbConnection.getRepository(Community);
    
    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator", "members"]
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    if (!community.is_active) {
      return res.status(403).json({
        success: false,
        message: "Cannot edit an inactive community"
      });
    }

    if (name) {
      const newSlug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
        .substring(0, 100);
      
      if (newSlug !== community.slug) {
        const existingCommunity = await communityRepo.findOne({ 
          where: { slug: newSlug } 
        });
        
        if (existingCommunity && existingCommunity.id !== id) {
          return res.status(409).json({ 
            success: false, 
            message: "A community with this name already exists" 
          });
        }
        
        community.name = name;
        community.slug = newSlug;
      } else {
        community.name = name;
      }
    }

    if (description) community.description = description;
    if (category) community.category = category;
    if (community_type) community.community_type = community_type;
    if (join_approval_required !== undefined) {
      community.join_approval_required = join_approval_required === 'true' || join_approval_required === true;
    }
    if (rules !== undefined) community.rules = rules;

    if (req.file) {
      try {
        const uploadResult = await UploadToCloud(req.file);
        community.cover_image_url = uploadResult.secure_url;
      } catch (uploadError: any) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload cover image",
          error: uploadError.message
        });
      }
    }

    await communityRepo.save(community);

    const updatedCommunity = await communityRepo.findOne({
      where: { id: community.id },
      relations: ["creator", "creator.profile", "members"]
    });

    if (community.members && community.members.length > 0) {
      try {
      } catch (notifyError: any) {
      }
    }

    res.json({
      success: true,
      message: "Community updated successfully",
      data: { community: updatedCommunity }
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to update community", 
      error: error.message 
    });
  }
}

static async canEditCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const communityRepo = dbConnection.getRepository(Community);
    
    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator"]
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
        canEdit: false
      });
    }

    const canEdit = community.creator.id === userId && community.is_active;

    res.json({
      success: true,
      data: {
        canEdit,
        isCreator: community.creator.id === userId,
        isActive: community.is_active
      }
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to check edit permission", 
      error: error.message 
    });
  }
}

  static logRoute(routeName: string, req: Request) {
  }

static async searchCommunities(req: Request, res: Response) {
  try {
    const { 
      q = "", 
      page = 1, 
      limit = 10,
      category,
      community_type,
      sort_by = "relevance"
    } = req.query;

    const communityRepo = dbConnection.getRepository(Community);
    
    const queryBuilder = communityRepo.createQueryBuilder("community")
      .leftJoinAndSelect("community.creator", "creator")
      .leftJoinAndSelect("creator.profile", "profile")
      .where("community.is_active = :isActive", { isActive: true });

    if (q && q !== "") {
      queryBuilder.andWhere(
        "(community.name ILIKE :q OR community.description ILIKE :q)",
        { q: `%${q}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere("community.category = :category", { category });
    }

    if (community_type) {
      queryBuilder.andWhere("community.community_type = :community_type", { community_type });
    }

    if (sort_by === "newest") {
      queryBuilder.orderBy("community.created_at", "DESC");
    } else if (sort_by === "most_members") {
      queryBuilder.orderBy("community.member_count", "DESC");
    } else if (sort_by === "most_posts") {
      queryBuilder.orderBy("community.post_count", "DESC");
    } else if (sort_by === "relevance" && q && q !== "") {
      const allMatchingCommunities = await queryBuilder.getMany();
      
      const searchTerm = q.toString().toLowerCase();
      const sortedCommunities = allMatchingCommunities.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aDesc = a.description.toLowerCase();
        const bDesc = b.description.toLowerCase();
        
        const aExactName = aName === searchTerm ? 0 : 1;
        const bExactName = bName === searchTerm ? 0 : 1;
        
        if (aExactName !== bExactName) {
          return aExactName - bExactName;
        }
        
        const aStartsWith = aName.startsWith(searchTerm) ? 0 : 1;
        const bStartsWith = bName.startsWith(searchTerm) ? 0 : 1;
        
        if (aStartsWith !== bStartsWith) {
          return aStartsWith - bStartsWith;
        }
        
        const aContains = aName.includes(searchTerm) ? 0 : 1;
        const bContains = bName.includes(searchTerm) ? 0 : 1;
        
        if (aContains !== bContains) {
          return aContains - bContains;
        }
        
        const aDescContains = aDesc.includes(searchTerm) ? 0 : 1;
        const bDescContains = bDesc.includes(searchTerm) ? 0 : 1;
        
        if (aDescContains !== bDescContains) {
          return aDescContains - bDescContains;
        }
        
        return b.member_count - a.member_count;
      });
      
      const skip = (Number(page) - 1) * Number(limit);
      const paginatedCommunities = sortedCommunities.slice(skip, skip + Number(limit));
      
      const formattedCommunities = paginatedCommunities.map(community => ({
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        cover_image_url: community.cover_image_url,
        category: community.category,
        community_type: community.community_type,
        member_count: community.member_count,
        post_count: community.post_count,
        created_at: community.created_at,
        is_active: community.is_active,
        join_approval_required: community.join_approval_required,
        creator: {
          id: community.creator.id,
          first_name: community.creator.first_name,
          last_name: community.creator.last_name,
          profile_picture_url: community.creator.profile_picture_url
        }
      }));

      return res.json({
        success: true,
        data: {
          communities: formattedCommunities,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: sortedCommunities.length,
            totalPages: Math.ceil(sortedCommunities.length / Number(limit))
          },
          query: q
        }
      });
    } else {
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      
      if (!sort_by || sort_by === "relevance") {
        queryBuilder.orderBy("community.member_count", "DESC");
      }

      const [communities, total] = await queryBuilder.getManyAndCount();

      const formattedCommunities = communities.map(community => ({
        id: community.id,
        name: community.name,
        slug: community.slug,
        description: community.description,
        cover_image_url: community.cover_image_url,
        category: community.category,
        community_type: community.community_type,
        member_count: community.member_count,
        post_count: community.post_count,
        created_at: community.created_at,
        is_active: community.is_active,
        join_approval_required: community.join_approval_required,
        creator: {
          id: community.creator.id,
          first_name: community.creator.first_name,
          last_name: community.creator.last_name,
          profile_picture_url: community.creator.profile_picture_url
        }
      }));

      res.json({
        success: true,
        data: {
          communities: formattedCommunities,
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
      message: "Failed to search communities",
      error: error.message
    });
  }
}
  
  static async createCommunityPost(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { community_id } = req.params;
      const { 
        content, 
        title, 
        post_type = "DISCUSSION",
        linked_project_id 
      } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: "Post content is required"
        });
      }

      if (!community_id) {
        return res.status(400).json({
          success: false,
          message: "Community ID is required"
        });
      }

      const communityRepo = dbConnection.getRepository(Community);
      const postRepo = dbConnection.getRepository(CommunityPost);

      const community = await communityRepo.findOne({
        where: { id: community_id },
        relations: ["members", "creator"]
      });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community not found"
        });
      }

      if (!community.is_active) {
        return res.status(403).json({
          success: false,
          message: "This community is not active"
        });
      }

      const isMember = community.members.some(member => member.id === userId) || 
                      community.creator.id === userId;
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "You must be a member of this community to post"
        });
      }

      let linkedProject = null;
      if (linked_project_id) {
        const projectRepo = dbConnection.getRepository(ResearchProject);
        const project = await projectRepo.findOne({
          where: { id: linked_project_id },
          relations: ["author"]
        });

        if (!project || project.author.id !== userId) {
          return res.status(403).json({
            success: false,
            message: "You can only link your own projects"
          });
        }
        linkedProject = project;
      }

      const post = postRepo.create({
        community: { id: community_id },
        author: { id: userId },
        post_type: post_type as any,
        title: title || `Post by User ${userId.substring(0, 8)}...`,
        content,
        linked_project: linked_project_id ? { id: linked_project_id } : null,
        media_urls: []
      });

      if (req.file) {
        try {
          const uploadResult = await UploadToCloud(req.file);
          post.media_urls = [uploadResult.secure_url];
        } catch (uploadError: any) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload post image",
            error: uploadError.message
          });
        }
      }

      await postRepo.save(post);

      community.post_count += 1;
      await communityRepo.save(community);

      const completePost = await postRepo.findOne({
        where: { id: post.id },
        relations: ["author", "author.profile", "linked_project", "community"]
      });

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: { post: completePost },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to create post",
        error: error.message
      });
    }
  }

  static async getCommunityPosts(req: Request, res: Response) {
    try {
      const { community_id } = req.params;
      const { 
        page = 1, 
        limit = 20, 
        post_type,
        author_id 
      } = req.query;

      if (!community_id) {
        return res.status(400).json({
          success: false,
          message: "Community ID is required"
        });
      }

      const communityRepo = dbConnection.getRepository(Community);
      const postRepo = dbConnection.getRepository(CommunityPost);

      const community = await communityRepo.findOne({
        where: { id: community_id }
      });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community not found"
        });
      }

      const queryBuilder = postRepo.createQueryBuilder("post")
        .leftJoinAndSelect("post.author", "author")
        .leftJoinAndSelect("author.profile", "profile")
        .leftJoinAndSelect("post.linked_project", "linked_project")
        .leftJoinAndSelect("post.community", "community")
        .where("post.community_id = :community_id", { community_id })
        .andWhere("community.is_active = :isActive", { isActive: true });

      if (post_type) {
        queryBuilder.andWhere("post.post_type = :post_type", { post_type });
      }

      if (author_id) {
        queryBuilder.andWhere("post.author_id = :author_id", { author_id });
      }

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      queryBuilder.orderBy("post.is_pinned", "DESC")
                 .addOrderBy("post.created_at", "DESC");

      const [posts, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          posts,
          community: {
            id: community.id,
            name: community.name,
            description: community.description
          },
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
        message: "Failed to fetch community posts",
        error: error.message
      });
    }
  }

static async createCommunity(req: Request, res: Response) {
  try {
    const userId = req.user.userId;
    const { name, description, category, community_type, join_approval_required, rules } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, description, and category are required"
      });
    }

    const communityRepo = dbConnection.getRepository(Community);
    const userRepo = dbConnection.getRepository(User);
    
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .substring(0, 100);
    
    const existingCommunity = await communityRepo.findOne({ where: { slug } });
    if (existingCommunity) {
      return res.status(409).json({ 
        success: false, 
        message: "A community with this name already exists" 
      });
    }

    const creator = await userRepo.findOne({
      where: { id: userId },
      relations: ["profile"]
    });

    if (!creator) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const community = communityRepo.create({
      name,
      slug,
      description,
      category,
      community_type: community_type || 'Public',
      join_approval_required: join_approval_required === 'true' || join_approval_required === true,
      is_active: false,
      creator: { id: userId },
      rules: rules || null
    });

    if (req.file) {
      const uploadResult = await UploadToCloud(req.file);
      community.cover_image_url = uploadResult.secure_url;
    }

    await communityRepo.save(community);

    community.members = [{ id: userId } as any];
    community.member_count = 1;
    await communityRepo.save(community);

    try {
      const admins = await userRepo.find({
        where: { account_type: AccountType.ADMIN, is_active: true }
      });

      if (admins.length === 0) {
      } else {
        const communityData = {
          name: community.name,
          description: community.description,
          category: community.category,
          community_type: community.community_type,
          cover_image_url: community.cover_image_url,
          creator: {
            first_name: creator.first_name,
            last_name: creator.last_name,
            email: creator.email,
            profile: creator.profile
          },
          community_id: community.id,
          created_at: community.created_at
        };

        let emailsSent = 0;
        let emailsFailed = 0;

        for (const admin of admins) {
          try {
            const adminData = {
              first_name: admin.first_name || 'Admin',
              email: admin.email
            };

            const emailHtml = SendEmailToAdminTemplate.getNewCommunityNotification(
              communityData,
              adminData
            );

            await sendEmail({
              to: admin.email,
              subject: `⏳ New Community Awaiting Approval: ${community.name}`,
              html: emailHtml
            });

            emailsSent++;

            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (emailError: any) {
            emailsFailed++;
          }
        }
      }

    } catch (emailSystemError: any) {
    }

    try {
      const subscriberNotificationData = {
        name: community.name,
        description: community.description,
        category: community.category,
        community_type: community.community_type,
        cover_image_url: community.cover_image_url,
        creator: {
          first_name: creator.first_name,
          last_name: creator.last_name
        },
        community_id: community.id,
        created_at: community.created_at
      };

      SubscribeController.notifyNewCommunity(subscriberNotificationData)
        .catch(err => {
        });

    } catch (subscriberError: any) {
    }

    res.status(201).json({
      success: true,
      message: "Community submitted for approval. You'll be notified once it's reviewed.",
      data: { community },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to create community", 
      error: error.message 
    });
  }
}

static async approveCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator", "creator.profile"],
    });

    if (!community) {
      return res.status(404).json({ 
        success: false, 
        message: "Community not found" 
      });
    }

    if (community.is_active) {
      return res.status(400).json({ 
        success: false, 
        message: "Community is already approved" 
      });
    }

    community.is_active = true;
    await communityRepo.save(community);

    try {
      const creatorEmail = community.creator.email;

      const communityData = {
        name: community.name,
        description: community.description,
        category: community.category,
        community_type: community.community_type,
        cover_image_url: community.cover_image_url,
        community_id: community.id
      };

      const creatorData = {
        first_name: community.creator.first_name,
        email: creatorEmail
      };

      const emailHtml = ApproveRejectCommunityToCreatorTemplate.getApprovalTemplate(
        communityData,
        creatorData
      );

      await sendEmail({
        to: creatorEmail,
        subject: `🎉 Your Community "${community.name}" Has Been Approved!`,
        html: emailHtml
      });

    } catch (emailError: any) {
    }

    res.json({
      success: true,
      message: "Community approved successfully and creator notified",
      data: { community },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to approve community", 
      error: error.message 
    });
  }
}

static async rejectCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator", "creator.profile"],
    });

    if (!community) {
      return res.status(404).json({ 
        success: false, 
        message: "Community not found" 
      });
    }

    if (community.is_active) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot reject an approved community" 
      });
    }

    const communityData = {
      name: community.name,
      description: community.description,
      category: community.category,
      community_type: community.community_type,
      cover_image_url: community.cover_image_url,
      community_id: community.id
    };

    const creatorData = {
      first_name: community.creator.first_name,
      email: community.creator.email
    };

    try {
      const emailHtml = ApproveRejectCommunityToCreatorTemplate.getRejectionTemplate(
        communityData,
        creatorData,
        reason
      );

      await sendEmail({
        to: creatorData.email,
        subject: `❌ Community Application Update: ${communityData.name}`,
        html: emailHtml
      });

    } catch (emailError: any) {
    }

    await communityRepo.remove(community);

    res.json({
      success: true,
      message: "Community rejected successfully and creator notified",
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to reject community", 
      error: error.message 
    });
  }
}

static async getAllCommunitiesForAdmin(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;

    const communityRepo = dbConnection.getRepository(Community);
    const queryBuilder = communityRepo.createQueryBuilder("community")
      .leftJoinAndSelect("community.creator", "creator")
      .leftJoinAndSelect("creator.profile", "profile");

    if (status === 'pending') {
      queryBuilder.where("community.is_active = :isActive", { isActive: false });
    } else if (status === 'approved') {
      queryBuilder.where("community.is_active = :isActive", { isActive: true });
    }

    if (search) {
      queryBuilder.andWhere(
        "(community.name ILIKE :search OR community.description ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere("community.category = :category", { category });
    }

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    queryBuilder.orderBy("community.created_at", "DESC");

    const [communities, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: {
        communities,
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
      message: "Failed to fetch communities", 
      error: error.message 
    });
  }
}

static async getCommunityById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid community ID format" 
      });
    }

    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator", "creator.profile", "members"],
    });

    if (!community) {
      return res.status(404).json({ 
        success: false, 
        message: "Community not found" 
      });
    }

    res.json({
      success: true,
      data: { community },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch community", 
      error: error.message 
    });
  }
}

  static async getPendingCommunities(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const communityRepo = dbConnection.getRepository(Community);
      const queryBuilder = communityRepo.createQueryBuilder("community")
        .leftJoinAndSelect("community.creator", "creator")
        .leftJoinAndSelect("creator.profile", "profile")
        .where("community.is_active = :isActive", { isActive: false });

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      queryBuilder.orderBy("community.created_at", "DESC");

      const [communities, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          communities,
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
        message: "Failed to fetch pending communities", 
        error: error.message 
      });
    }
  }
  
static async deleteCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.userId;

    if (!reason || reason.trim().length < 20) {
      return res.status(400).json({
        success: false,
        message: "A detailed reason (minimum 20 characters) is required for community deletion"
      });
    }

    await dbConnection.transaction(async (transactionalEntityManager) => {
      const communityRepo = transactionalEntityManager.getRepository(Community);
      const postRepo = transactionalEntityManager.getRepository(CommunityPost);
      const joinRequestRepo = transactionalEntityManager.getRepository(CommunityJoinRequest);
      const eventRepo = transactionalEntityManager.getRepository(Event);
      const projectRepo = transactionalEntityManager.getRepository(ResearchProject);
      const userRepo = transactionalEntityManager.getRepository(User);
      const blogPostRepo = transactionalEntityManager.getRepository(BlogPost);

      const community = await communityRepo.findOne({
        where: { id },
        relations: [
          "creator", 
          "creator.profile", 
          "members", 
          "members.profile", 
          "posts", 
          "events", 
          "projects"
        ]
      });

      if (!community) {
        throw new Error("Community not found");
      }

      const admin = await userRepo.findOne({
        where: { id: adminId },
        relations: ["profile"]
      });

      if (!admin) {
        throw new Error("Admin not found");
      }

      const communityData = {
        name: community.name,
        description: community.description,
        category: community.category,
        community_type: community.community_type,
        cover_image_url: community.cover_image_url,
        community_id: community.id,
        member_count: community.member_count,
        post_count: community.post_count,
        created_at: community.created_at
      };

      const creatorData = {
        first_name: community.creator.first_name,
        last_name: community.creator.last_name,
        email: community.creator.email
      };

      const adminInfo = `${admin.first_name} ${admin.last_name} (${admin.email})`;

      const blogPostsResult = await blogPostRepo
        .createQueryBuilder()
        .update(BlogPost)
        .set({ community: null })
        .where("community_id = :communityId", { communityId: community.id })
        .execute();

      if (community.id) {
        await joinRequestRepo.delete({ community: { id: community.id } });
      }

      if (community.posts && community.posts.length > 0) {
        await postRepo
          .createQueryBuilder()
          .delete()
          .from(CommunityPost)
          .where("community_id = :communityId", { communityId: community.id })
          .execute();
      }

      if (community.events && community.events.length > 0) {
        await eventRepo
          .createQueryBuilder()
          .update(Event)
          .set({ community: null })
          .where("community_id = :communityId", { communityId: community.id })
          .execute();
      }

      if (community.projects && community.projects.length > 0) {
        await projectRepo
          .createQueryBuilder()
          .update(ResearchProject)
          .set({ community: null })
          .where("community_id = :communityId", { communityId: community.id })
          .execute();
      }

      if (community.members && community.members.length > 0) {
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from("community_members")
          .where("community_id = :communityId", { communityId: community.id })
          .execute();
      }

      await communityRepo
        .createQueryBuilder()
        .delete()
        .from(Community)
        .where("id = :id", { id: community.id })
        .execute();

      try {
        const { DeleteCommunityTemplate } = require('../helpers/DeleteCommunityTemplate');
        
        const emailHtml = DeleteCommunityTemplate.getDeletionTemplate(
          communityData,
          creatorData,
          reason,
          adminInfo
        );

        await sendEmail({
          to: creatorData.email,
          subject: `⚠️ Community Deleted: "${communityData.name}"`,
          html: emailHtml
        });

      } catch (emailError: any) {
      }

      res.json({
        success: true,
        message: "Community permanently deleted successfully and creator notified",
        data: {
          id: community.id,
          name: community.name
        }
      });

    });

  } catch (error: any) {
    if (error.message === "Community not found") {
      return res.status(404).json({
        success: false,
        message: "Community not found"
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
        message: "Failed to delete community", 
        error: error.message 
      });
    }
  }
}

  static async leaveCommunity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const communityRepo = dbConnection.getRepository(Community);
      const community = await communityRepo.findOne({
        where: { id },
        relations: ["members", "creator"],
      });

      if (!community) {
        return res.status(404).json({ 
          success: false, 
          message: "Community not found" 
        });
      }

      if (community.creator.id === userId) {
        return res.status(400).json({ 
          success: false, 
          message: "Creator cannot leave the community" 
        });
      }

      community.members = community.members.filter(member => member.id !== userId);
      community.member_count = Math.max(0, community.member_count - 1);
      await communityRepo.save(community);

      res.json({
        success: true,
        message: "Left community successfully",
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to leave community", 
        error: error.message 
      });
    }
  }

  static async createPost(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const {
        community_ids,
        content,
        linked_project_id,
        post_type = "LinkedProject"
      } = req.body;

      if (!community_ids || !Array.isArray(community_ids) || community_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one community ID is required"
        });
      }

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: linked_project_id },
        relations: ["author"]
      });

      if (!project || project.author.id !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only link your own projects"
        });
      }

      const postRepo = dbConnection.getRepository(CommunityPost);
      const communityRepo = dbConnection.getRepository(Community);
      const createdPosts = [];

      for (const communityId of community_ids) {
        const community = await communityRepo.findOne({
          where: { id: communityId },
          relations: ["members"]
        });

        if (!community) continue;

        const isMember = community.members.some(member => member.id === userId);
        if (!isMember) continue;

        const post = postRepo.create({
          community: { id: communityId },
          author: { id: userId },
          post_type: post_type as any,
          title: `New Research: ${project.title}`,
          content,
          linked_project: { id: linked_project_id }
        });

        await postRepo.save(post);

        community.post_count += 1;
        await communityRepo.save(community);

        createdPosts.push(post);
      }

      res.status(201).json({
        success: true,
        message: `Posted to ${createdPosts.length} ${createdPosts.length === 1 ? 'community' : 'communities'}`,
        data: { posts: createdPosts }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to create posts",
        error: error.message
      });
    }
  }

  static async getSuggestedCommunities(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      const projectRepo = dbConnection.getRepository(ResearchProject);
      const project = await projectRepo.findOne({
        where: { id: projectId },
        relations: ["tags"]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      const communityRepo = dbConnection.getRepository(Community);
      const queryBuilder = communityRepo.createQueryBuilder("community")
        .leftJoinAndSelect("community.creator", "creator")
        .where("community.is_active = :isActive", { isActive: true });

      if (project.field_of_study) {
        queryBuilder.andWhere("community.category ILIKE :field", {
          field: `%${project.field_of_study}%`
        });
      }

      queryBuilder
        .orderBy("community.member_count", "DESC")
        .take(6);

      const communities = await queryBuilder.getMany();

      res.json({
        success: true,
        data: { communities }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch suggested communities",
        error: error.message
      });
    }
  }

  static async getCommunityMembers(req: Request, res: Response) {
    try {
      const { community_id } = req.params;

      if (!community_id) {
        return res.status(400).json({
          success: false,
          message: "Community ID is required"
        });
      }

      const communityRepo = dbConnection.getRepository(Community);
      const community = await communityRepo.findOne({
        where: { id: community_id },
        relations: ["members", "members.profile", "creator", "creator.profile"]
      });

      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community not found"
        });
      }
      if (!community.is_active) {
        return res.status(403).json({
          success: false,
          message: "This community is not active"
        });
      }
      res.json({
        success: true,
        data: { members: community.members, creator: community.creator }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch community members",
        error: error.message
      });
    }
  }

static async activateDeactivateCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { is_active, reason } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value"
      });
    }

    if (!is_active && !reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required when deactivating a community"
      });
    }

    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator", "creator.profile", "members", "members.profile"]
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    if (community.is_active === is_active) {
      const statusText = is_active ? 'active' : 'inactive';
      return res.status(400).json({
        success: false,
        message: `Community is already ${statusText}`
      });
    }

    community.is_active = is_active;
    await communityRepo.save(community);

    const actionText = is_active ? 'activation' : 'deactivation';
    
    try {
      const allRecipients = [...community.members];
      
      const creatorInMembers = allRecipients.some(m => m.id === community.creator.id);
      if (!creatorInMembers) {
        allRecipients.push(community.creator);
      }

      let emailsSent = 0;
      let emailsFailed = 0;
      const failedEmails: Array<{ email: string; error: string }> = [];

      const communityData = {
        name: community.name,
        description: community.description,
        category: community.category,
        member_count: community.member_count,
        cover_image_url: community.cover_image_url,
        creator: {
          first_name: community.creator.first_name,
          last_name: community.creator.last_name,
          profile: community.creator.profile
        },
        community_id: community.id,
        is_active: is_active,
        reason: reason || undefined
      };

      for (let i = 0; i < allRecipients.length; i++) {
        const recipient = allRecipients[i];

        try {
          const userData = {
            first_name: recipient.first_name,
            email: recipient.email
          };

          const emailHtml = ActivateDeactiveCommunityTemplate.getStatusChangeTemplate(
            communityData,
            userData,
            is_active
          );

          const emailSubject = is_active 
            ? `✅ Community Activated: ${community.name}`
            : `⚠️ Community Deactivated: ${community.name}`;

          await sendEmail({
            to: recipient.email,
            subject: emailSubject,
            html: emailHtml
          });

          emailsSent++;

          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (emailError: any) {
          emailsFailed++;
          const errorMsg = emailError.message || 'Unknown error';
          
          failedEmails.push({
            email: recipient.email,
            error: errorMsg
          });
        }
      }

    } catch (emailSystemError: any) {
    }

    const statusText = is_active ? 'activated' : 'deactivated';
    res.json({
      success: true,
      message: `Community ${statusText} successfully and notifications sent to all members`,
      data: {
        community: {
          id: community.id,
          name: community.name,
          is_active: community.is_active,
          member_count: community.member_count
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update community status",
      error: error.message
    });
  }
}

static async requestToJoinCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { message } = req.body;

    const communityRepo = dbConnection.getRepository(Community);
    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);
    const userRepo = dbConnection.getRepository(User);

    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator", "creator.profile", "members"],
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    if (!community.is_active) {
      return res.status(403).json({
        success: false,
        message: "This community is not active"
      });
    }

    const isMember = community.members.some(member => member.id === userId);
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this community"
      });
    }

    const existingRequest = await joinRequestRepo.findOne({
      where: {
        community: { id },
        user: { id: userId },
        status: JoinRequestStatus.PENDING
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending request for this community"
      });
    }

    const joinRequest = joinRequestRepo.create({
      community: { id },
      user: { id: userId },
      status: JoinRequestStatus.PENDING,
      message: message || null
    });

    await joinRequestRepo.save(joinRequest);

    try {
      const requester = await userRepo.findOne({
        where: { id: userId },
        relations: ["profile"]
      });

      if (requester) {
        const requestData = {
          community_name: community.name,
          community_description: community.description,
          community_id: community.id,
          cover_image_url: community.cover_image_url,
          requester: {
            first_name: requester.first_name,
            last_name: requester.last_name,
            email: requester.email,
            profile_picture_url: requester.profile_picture_url,
            account_type: requester.account_type,
            profile: requester.profile
          },
          request_id: joinRequest.id,
          requested_at: joinRequest.requested_at
        };

        const creatorData = {
          first_name: community.creator.first_name,
          email: community.creator.email
        };

        const emailHtml = ApproveUserRequestToJoinCommunityTemplate.getJoinRequestNotification(
          requestData,
          creatorData
        );

        await sendEmail({
          to: community.creator.email,
          subject: `👋 New Join Request for "${community.name}"`,
          html: emailHtml
        });
      }

    } catch (emailError: any) {
    }

    res.status(201).json({
      success: true,
      message: "Join request submitted successfully. You'll be notified when it's reviewed.",
      data: { joinRequest }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to submit join request",
      error: error.message
    });
  }
}

static async getCommunityJoinRequests(req: Request, res: Response) {
  try {
    const { community_id } = req.params;
    const userId = req.user.userId;

    const communityRepo = dbConnection.getRepository(Community);
    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);

    const community = await communityRepo.findOne({
      where: { id: community_id },
      relations: ["creator"]
    });

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    if (community.creator.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the community creator can view join requests"
      });
    }

    const joinRequests = await joinRequestRepo.find({
      where: {
        community: { id: community_id },
        status: JoinRequestStatus.PENDING
      },
      relations: ["user", "user.profile"],
      order: { requested_at: "DESC" }
    });

    res.json({
      success: true,
      data: { joinRequests }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch join requests",
      error: error.message
    });
  }
}

static async getUserPendingRequests(req: Request, res: Response) {
  try {
    const userId = req.user.userId;

    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);

    const pendingRequests = await joinRequestRepo.find({
      where: {
        user: { id: userId },
        status: JoinRequestStatus.PENDING
      },
      relations: ["community", "community.creator"],
      order: { requested_at: "DESC" }
    });

    res.json({
      success: true,
      data: { pendingRequests }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests",
      error: error.message
    });
  }
}

static async joinCommunity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { message } = req.body;

    const communityRepo = dbConnection.getRepository(Community);
    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);
    const userRepo = dbConnection.getRepository(User);

    const community = await communityRepo.findOne({
      where: { id },
      relations: ["members", "creator", "creator.profile"],
    });

    if (!community) {
      return res.status(404).json({ 
        success: false, 
        message: "Community not found" 
      });
    }

    if (!community.is_active) {
      return res.status(403).json({
        success: false,
        message: "This community is pending approval"
      });
    }

    const isMember = community.members.some(member => member.id === userId);
    if (isMember) {
      return res.status(400).json({ 
        success: false, 
        message: "Already a member of this community" 
      });
    }

    if (community.join_approval_required) {
      const existingRequest = await joinRequestRepo.findOne({
        where: {
          community: { id },
          user: { id: userId },
          status: JoinRequestStatus.PENDING
        }
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending request for this community",
          data: {
            joinRequest: existingRequest,
            user_join_request_status: 'pending',
            user_join_request_id: existingRequest.id
          }
        });
      }

      const joinRequest = joinRequestRepo.create({
        community: { id },
        user: { id: userId },
        status: JoinRequestStatus.PENDING,
        message: message || null
      });

      await joinRequestRepo.save(joinRequest);

      const requester = await userRepo.findOne({
        where: { id: userId },
        relations: ["profile"]
      });

      if (!requester) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const communityData = {
        name: community.name,
        description: community.description,
        community_id: community.id,
        cover_image_url: community.cover_image_url,
        category: community.category,
        community_type: community.community_type
      };

      const requesterData = {
        first_name: requester.first_name,
        last_name: requester.last_name,
        email: requester.email,
        profile_picture_url: requester.profile_picture_url,
        account_type: requester.account_type
      };

      let emailsSent = 0;
      let emailsFailed = 0;

      try {
        const creatorData = {
          first_name: community.creator.first_name,
          email: community.creator.email
        };

        const creatorEmailHtml = JoinRequestEmailTemplate.getCreatorNotification(
          communityData,
          requesterData,
          creatorData,
          joinRequest.id
        );

        await sendEmail({
          to: community.creator.email,
          subject: `👋 New Join Request for "${community.name}"`,
          html: creatorEmailHtml
        });

        emailsSent++;
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (emailError: any) {
        emailsFailed++;
      }

      try {
        const admins = await userRepo.find({
          where: { account_type: AccountType.ADMIN, is_active: true }
        });

        for (const admin of admins) {
          try {
            const adminData = {
              first_name: admin.first_name || 'Admin',
              email: admin.email
            };

            const creatorInfo = {
              first_name: community.creator.first_name,
              last_name: community.creator.last_name,
              email: community.creator.email
            };

            const adminEmailHtml = JoinRequestEmailTemplate.getAdminNotification(
              communityData,
              requesterData,
              creatorInfo,
              adminData,
              joinRequest.id
            );

            await sendEmail({
              to: admin.email,
              subject: `🔔 New Join Request in "${community.name}"`,
              html: adminEmailHtml
            });

            emailsSent++;
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (adminEmailError: any) {
            emailsFailed++;
          }
        }

      } catch (adminError: any) {
        emailsFailed++;
      }

      try {
        const requesterEmailHtml = JoinRequestEmailTemplate.getRequesterConfirmation(
          communityData,
          requesterData
        );

        await sendEmail({
          to: requester.email,
          subject: `✅ Thank You for Your Request to Join "${community.name}"`,
          html: requesterEmailHtml
        });

        emailsSent++;

      } catch (emailError: any) {
        emailsFailed++;
      }

      return res.status(201).json({
        success: true,
        message: "Join request submitted successfully. You'll receive notifications via email.",
        requiresApproval: true,
        data: { 
          joinRequest,
          user_join_request_status: 'pending',
          user_join_request_id: joinRequest.id,
          can_user_join: false,
          can_user_visit: false
        }
      });
    }

    community.members.push({ id: userId } as any);
    community.member_count += 1;
    await communityRepo.save(community);

    res.json({
      success: true,
      message: "Joined community successfully",
      requiresApproval: false,
      data: {
        user_join_request_status: 'approved',
        can_user_join: false,
        can_user_visit: true,
        is_user_member: true
      }
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to join community", 
      error: error.message 
    });
  }
}

static async approveJoinRequest(req: Request, res: Response) {
  try {
    const { request_id } = req.params;
    const userId = req.user.userId;

    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);
    const communityRepo = dbConnection.getRepository(Community);

    const joinRequest = await joinRequestRepo.findOne({
      where: { id: request_id },
      relations: ["community", "community.creator", "community.members", "user", "user.profile"]
    });

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: "Join request not found"
      });
    }

    if (joinRequest.community.creator.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the community creator can approve join requests"
      });
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: "This request has already been processed"
      });
    }

    joinRequest.status = JoinRequestStatus.APPROVED;
    joinRequest.responded_at = new Date();
    joinRequest.responded_by = { id: userId } as any;
    await joinRequestRepo.save(joinRequest);

    joinRequest.community.members.push(joinRequest.user);
    joinRequest.community.member_count += 1;
    await communityRepo.save(joinRequest.community);
    
    try {
      const communityData = {
        name: joinRequest.community.name,
        description: joinRequest.community.description,
        community_id: joinRequest.community.id,
        cover_image_url: joinRequest.community.cover_image_url,
        category: joinRequest.community.category,
        community_type: joinRequest.community.community_type
      };

      const requesterData = {
        first_name: joinRequest.user.first_name,
        last_name: joinRequest.user.last_name,
        email: joinRequest.user.email,
        profile_picture_url: joinRequest.user.profile_picture_url,
        account_type: joinRequest.user.account_type
      };

      const approvalEmailHtml = JoinRequestEmailTemplate.getApprovalNotification(
        communityData,
        requesterData
      );

      await sendEmail({
        to: joinRequest.user.email,
        subject: `🎉 Welcome to "${joinRequest.community.name}"!`,
        html: approvalEmailHtml
      });

    } catch (emailError: any) {
    }

    res.json({
      success: true,
      message: "Join request approved successfully and user notified"
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to approve join request",
      error: error.message
    });
  }
}

static async rejectJoinRequest(req: Request, res: Response) {
  try {
    const { request_id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);

    const joinRequest = await joinRequestRepo.findOne({
      where: { id: request_id },
      relations: ["community", "community.creator", "user"]
    });

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: "Join request not found"
      });
    }

    if (joinRequest.community.creator.id !== userId) {
      return res.status(403).json({
        success: false,
        message: "Only the community creator can reject join requests"
      });
    }

    if (joinRequest.status !== JoinRequestStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: "This request has already been processed"
      });
    }

    joinRequest.status = JoinRequestStatus.REJECTED;
    joinRequest.responded_at = new Date();
    joinRequest.responded_by = { id: userId } as any;
    await joinRequestRepo.save(joinRequest);
    
    try {
      const communityData = {
        name: joinRequest.community.name,
        description: joinRequest.community.description,
        community_id: joinRequest.community.id,
        cover_image_url: joinRequest.community.cover_image_url,
        category: joinRequest.community.category,
        community_type: joinRequest.community.community_type
      };

      const requesterData = {
        first_name: joinRequest.user.first_name,
        last_name: joinRequest.user.last_name,
        email: joinRequest.user.email,
        profile_picture_url: joinRequest.user.profile_picture_url,
        account_type: joinRequest.user.account_type
      };

      const rejectionEmailHtml = JoinRequestEmailTemplate.getRejectionNotification(
        communityData,
        requesterData,
        reason
      );

      await sendEmail({
        to: joinRequest.user.email,
        subject: `Update on Your Request to Join "${joinRequest.community.name}"`,
        html: rejectionEmailHtml
      });

    } catch (emailError: any) {
    }

    res.json({
      success: true,
      message: "Join request rejected successfully and user notified"
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to reject join request",
      error: error.message
    });
  }
}

static async getAllCommunities(req: Request, res: Response) {
  try {
    const { page = 1, limit = 12, search, category } = req.query;
    const userId = req.user?.userId;

    const communityRepo = dbConnection.getRepository(Community);
    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);

    const queryBuilder = communityRepo.createQueryBuilder("community")
      .leftJoinAndSelect("community.creator", "creator")
      .leftJoinAndSelect("creator.profile", "profile")
      .leftJoinAndSelect("community.members", "members")
      .leftJoinAndSelect("members.profile", "memberProfile")
      .where("community.is_active = :isActive", { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        "(community.name ILIKE :search OR community.description ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere("community.category = :category", { category });
    }

    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    queryBuilder.orderBy("community.created_at", "DESC");

    const [communities, total] = await queryBuilder.getManyAndCount();

    let userJoinRequestsMap = new Map();
    if (userId) {
      const userJoinRequests = await joinRequestRepo
        .createQueryBuilder("request")
        .leftJoinAndSelect("request.community", "community")
        .where("request.user_id = :userId", { userId })
        .getMany();
      
      userJoinRequests.forEach(request => {
        if (request.community && request.community.id) {
          userJoinRequestsMap.set(request.community.id, {
            status: request.status,
            id: request.id
          });
        }
      });
    }

    const communityIds = communities.map(c => c.id);
    let pendingRequestsMap = new Map<string, any[]>();

    if (communityIds.length > 0) {
      const allPendingRequests = await joinRequestRepo
        .createQueryBuilder("request")
        .leftJoinAndSelect("request.user", "user")
        .leftJoinAndSelect("user.profile", "userProfile")
        .leftJoinAndSelect("request.community", "community")
        .where("request.community_id IN (:...communityIds)", { communityIds })
        .andWhere("request.status = :status", { status: JoinRequestStatus.PENDING })
        .orderBy("request.requested_at", "DESC")
        .getMany();

      allPendingRequests.forEach(request => {
        if (request.community && request.community.id) {
          const communityId = request.community.id;
          if (!pendingRequestsMap.has(communityId)) {
            pendingRequestsMap.set(communityId, []);
          }
          
          pendingRequestsMap.get(communityId)!.push({
            id: request.id,
            status: request.status,
            message: request.message,
            requested_at: request.requested_at,
            user: {
              id: request.user.id,
              first_name: request.user.first_name,
              last_name: request.user.last_name,
              email: request.user.email,
              profile_picture_url: request.user.profile_picture_url,
              account_type: request.user.account_type,
              profile: request.user.profile ? {
                id: request.user.profile.id,
                institution_name: request.user.profile.institution_name,
                department: request.user.profile.department,
                academic_level: request.user.profile.academic_level,
                current_position: request.user.profile.current_position,
                research_interests: request.user.profile.research_interests
              } : null
            }
          });
        }
      });
    }

    const filteredCommunities = communities.filter(community => {
      if (!userId) return true;
      
      const joinRequest = userJoinRequestsMap.get(community.id);
      if (joinRequest && joinRequest.status === JoinRequestStatus.REJECTED) {
        return false;
      }
      return true;
    });

    const enhancedCommunities = filteredCommunities.map(community => {
      const isUserMember = userId 
        ? community.members.some(member => member.id === userId) || community.creator.id === userId
        : false;

      const joinRequest = userJoinRequestsMap.get(community.id);
      
      let userJoinRequestStatus = null;
      let canJoin = true;
      let canVisit = isUserMember;

      if (userId) {
        if (isUserMember) {
          userJoinRequestStatus = 'approved';
          canJoin = false;
          canVisit = true;
        } else if (joinRequest) {
          if (joinRequest.status === JoinRequestStatus.PENDING) {
            userJoinRequestStatus = 'pending';
            canJoin = false;
            canVisit = false;
          } else if (joinRequest.status === JoinRequestStatus.APPROVED) {
            userJoinRequestStatus = 'approved';
            canJoin = false;
            canVisit = true;
          }
        } else {
          userJoinRequestStatus = 'not_requested';
          canJoin = true;
          canVisit = false;
        }
      }

      const pendingJoinRequests = pendingRequestsMap.get(community.id) || [];

      const membersData = community.members.map(member => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        profile_picture_url: member.profile_picture_url,
        account_type: member.account_type,
        bio: member.bio,
        profile: member.profile ? {
          id: member.profile.id,
          institution_name: member.profile.institution_name,
          department: member.profile.department,
          academic_level: member.profile.academic_level,
          current_position: member.profile.current_position,
          research_interests: member.profile.research_interests
        } : null
      }));

      return {
        ...community,
        creator: {
          id: community.creator.id,
          first_name: community.creator.first_name,
          last_name: community.creator.last_name,
          email: community.creator.email,
          profile_picture_url: community.creator.profile_picture_url,
          account_type: community.creator.account_type,
          bio: community.creator.bio,
          profile: community.creator.profile ? {
            id: community.creator.profile.id,
            institution_name: community.creator.profile.institution_name,
            department: community.creator.profile.department,
            academic_level: community.creator.profile.academic_level,
            current_position: community.creator.profile.current_position,
            research_interests: community.creator.profile.research_interests
          } : null
        },
        members: membersData,
        is_user_member: isUserMember,
        user_membership_status: isUserMember ? 'member' : 'not_member',
        user_join_request_status: userJoinRequestStatus,
        user_join_request_id: joinRequest?.id || null,
        can_user_join: canJoin,
        can_user_visit: canVisit,
        pending_join_requests: pendingJoinRequests,
        pending_requests_count: pendingJoinRequests.length
      };
    });

    res.json({
      success: true,
      data: {
        communities: enhancedCommunities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: filteredCommunities.length,
          totalPages: Math.ceil(filteredCommunities.length / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch communities", 
      error: error.message 
    });
  }
}

static async getUserCommunities(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const communityRepo = dbConnection.getRepository(Community);
    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);
    
    const createdCommunities = await communityRepo.find({
      where: { creator: { id: userId } },
      relations: ["creator", "creator.profile", "members", "members.profile"],
      order: { created_at: "DESC" }
    });

    const memberCommunities = await communityRepo
      .createQueryBuilder("community")
      .leftJoinAndSelect("community.creator", "creator")
      .leftJoinAndSelect("creator.profile", "creatorProfile")
      .leftJoinAndSelect("community.members", "members")
      .leftJoinAndSelect("members.profile", "memberProfile")
      .where("members.id = :userId", { userId })
      .getMany();

    const allJoinRequests = await joinRequestRepo
      .createQueryBuilder("request")
      .leftJoinAndSelect("request.community", "community")
      .where("request.user_id = :userId", { userId })
      .getMany();

    const joinRequestMap = new Map();
    allJoinRequests.forEach(request => {
      if (request.community && request.community.id) {
        joinRequestMap.set(request.community.id, {
          status: request.status,
          id: request.id
        });
      }
    });

    const allCommunities = [...createdCommunities];
    memberCommunities.forEach(mc => {
      if (!allCommunities.find(c => c.id === mc.id)) {
        allCommunities.push(mc);
      }
    });

    const communityIds = allCommunities.map(c => c.id);
    let pendingRequestsMap = new Map<string, any[]>();

    if (communityIds.length > 0) {
      const allPendingRequests = await joinRequestRepo
        .createQueryBuilder("request")
        .leftJoinAndSelect("request.user", "user")
        .leftJoinAndSelect("user.profile", "userProfile")
        .leftJoinAndSelect("request.community", "community")
        .where("request.community_id IN (:...communityIds)", { communityIds })
        .andWhere("request.status = :status", { status: JoinRequestStatus.PENDING })
        .orderBy("request.requested_at", "DESC")
        .getMany();

      allPendingRequests.forEach(request => {
        if (request.community && request.community.id) {
          const communityId = request.community.id;
          if (!pendingRequestsMap.has(communityId)) {
            pendingRequestsMap.set(communityId, []);
          }
          
          pendingRequestsMap.get(communityId)!.push({
            id: request.id,
            status: request.status,
            message: request.message,
            requested_at: request.requested_at,
            user: {
              id: request.user.id,
              first_name: request.user.first_name,
              last_name: request.user.last_name,
              email: request.user.email,
              profile_picture_url: request.user.profile_picture_url,
              account_type: request.user.account_type,
              profile: request.user.profile ? {
                id: request.user.profile.id,
                institution_name: request.user.profile.institution_name,
                department: request.user.profile.department,
                academic_level: request.user.profile.academic_level,
                current_position: request.user.profile.current_position,
                research_interests: request.user.profile.research_interests
              } : null
            }
          });
        }
      });
    }

    const filteredCommunities = allCommunities.filter(community => {
      if (community.creator.id === userId) return true;
      
      const joinRequest = joinRequestMap.get(community.id);
      return !joinRequest || joinRequest.status !== JoinRequestStatus.REJECTED;
    });

    const enhancedCommunities = filteredCommunities.map(community => {
      const isCreator = community.creator.id === userId;
      const isMember = community.members.some(member => member.id === userId);
      const joinRequest = joinRequestMap.get(community.id);

      let membershipStatus = 'not_member';
      let userJoinRequestStatus = null;
      let canVisit = false;
      let canJoin = false;

      if (isCreator) {
        membershipStatus = 'creator';
        userJoinRequestStatus = 'approved';
        canVisit = true;
        canJoin = false;
      } else if (isMember) {
        membershipStatus = 'member';
        userJoinRequestStatus = 'approved';
        canVisit = true;
        canJoin = false;
      } else if (joinRequest) {
        if (joinRequest.status === JoinRequestStatus.PENDING) {
          membershipStatus = 'pending_approval';
          userJoinRequestStatus = 'pending';
          canVisit = false;
          canJoin = false;
        } else if (joinRequest.status === JoinRequestStatus.APPROVED) {
          membershipStatus = 'member';
          userJoinRequestStatus = 'approved';
          canVisit = true;
          canJoin = false;
        }
      } else {
        membershipStatus = 'not_member';
        userJoinRequestStatus = 'not_requested';
        canVisit = false;
        canJoin = true;
      }

      const pendingJoinRequests = pendingRequestsMap.get(community.id) || [];

      const membersData = community.members.map(member => ({
        id: member.id,
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        profile_picture_url: member.profile_picture_url,
        account_type: member.account_type,
        bio: member.bio,
        profile: member.profile ? {
          id: member.profile.id,
          institution_name: member.profile.institution_name,
          department: member.profile.department,
          academic_level: member.profile.academic_level,
          current_position: member.profile.current_position,
          research_interests: member.profile.research_interests
        } : null
      }));

      return {
        ...community,
        creator: {
          id: community.creator.id,
          first_name: community.creator.first_name,
          last_name: community.creator.last_name,
          email: community.creator.email,
          profile_picture_url: community.creator.profile_picture_url,
          account_type: community.creator.account_type,
          bio: community.creator.bio,
          profile: community.creator.profile ? {
            id: community.creator.profile.id,
            institution_name: community.creator.profile.institution_name,
            department: community.creator.profile.department,
            academic_level: community.creator.profile.academic_level,
            current_position: community.creator.profile.current_position,
            research_interests: community.creator.profile.research_interests
          } : null
        },
        members: membersData,
        is_user_member: isMember || isCreator,
        is_creator: isCreator,
        user_membership_status: membershipStatus,
        user_join_request_status: userJoinRequestStatus,
        user_join_request_id: joinRequest?.id || null,
        requires_approval: community.join_approval_required,
        can_user_join: canJoin,
        can_user_visit: canVisit,
        pending_join_requests: pendingJoinRequests,
        pending_requests_count: pendingJoinRequests.length
      };
    });

    res.json({
      success: true,
      data: {
        communities: enhancedCommunities,
        summary: {
          total_communities: enhancedCommunities.length,
          created_communities: createdCommunities.length,
          joined_communities: memberCommunities.length,
          pending_requests: allJoinRequests.filter(r => r.status === JoinRequestStatus.PENDING).length,
          rejected_requests: allJoinRequests.filter(r => r.status === JoinRequestStatus.REJECTED).length,
          total_pending_join_requests: Array.from(pendingRequestsMap.values()).reduce((sum, arr) => sum + arr.length, 0)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch your communities",
      error: error.message
    });
  }
}
}