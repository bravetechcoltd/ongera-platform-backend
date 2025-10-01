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
// Add these imports at the top
import { CommunityJoinRequest, JoinRequestStatus } from "../database/models/CommunityJoinRequest";
import { ApproveUserRequestToJoinCommunityTemplate } from '../helpers/ApproveUserRequestToJoinCommunityTemplate';

export class CommunityController {
  
  // ✅ Add route debugging middleware
  static logRoute(routeName: string, req: Request) {
    console.log(`\n🔍 [${new Date().toISOString()}] Route Hit: ${routeName}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Path: ${req.path}`);
    console.log(`   Params:`, req.params);
    console.log(`   Query:`, req.query);
    console.log(`   User:`, req.user?.userId || 'Not authenticated');
  }


  
  static async createCommunityPost(req: Request, res: Response) {
    try {
      CommunityController.logRoute('createCommunityPost', req);
      
      const userId = req.user.userId;
      const { community_id } = req.params;
      const { 
        content, 
        title, 
        post_type = "DISCUSSION",
        linked_project_id 
      } = req.body;

      console.log(`📝 Creating post in community: ${community_id}`, {
        title,
        post_type,
        hasFile: !!req.file
      });

      // Validate required fields
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

      // Check if community exists and user is a member
      const community = await communityRepo.findOne({
        where: { id: community_id },
        relations: ["members", "creator"]
      });

      if (!community) {
        console.log(`   ❌ Community not found: ${community_id}`);
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

      // Check if user is a member of the community
      const isMember = community.members.some(member => member.id === userId) || 
                      community.creator.id === userId;
      
      if (!isMember) {
        console.log(`   ❌ User ${userId} is not a member of community ${community_id}`);
        return res.status(403).json({
          success: false,
          message: "You must be a member of this community to post"
        });
      }

      // Validate linked project if provided
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

      // Create the post
      const post = postRepo.create({
        community: { id: community_id },
        author: { id: userId },
        post_type: post_type as any,
        title: title || `Post by User ${userId.substring(0, 8)}...`,
        content,
        linked_project: linked_project_id ? { id: linked_project_id } : null,
        media_urls: []
      });

      // Handle image upload if provided
      if (req.file) {
        console.log("🖼️ Uploading post image:", req.file.originalname);
        try {
          const uploadResult = await UploadToCloud(req.file);
          post.media_urls = [uploadResult.secure_url];
          console.log("✅ Post image uploaded:", uploadResult.secure_url);
        } catch (uploadError: any) {
          console.error("❌ Image upload failed:", uploadError.message);
          return res.status(500).json({
            success: false,
            message: "Failed to upload post image",
            error: uploadError.message
          });
        }
      }

      // Save the post
      await postRepo.save(post);

      // Update community post count
      community.post_count += 1;
      await communityRepo.save(community);

      console.log(`✅ Post created successfully in community ${community_id}:`, post.id);

      // Fetch the complete post with relations
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
      console.error("❌ Create community post error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create post",
        error: error.message
      });
    }
  }

  // ✅ NEW: Get posts from a specific community
  static async getCommunityPosts(req: Request, res: Response) {
    try {
      CommunityController.logRoute('getCommunityPosts', req);
      
      const { community_id } = req.params;
      const { 
        page = 1, 
        limit = 20, 
        post_type,
        author_id 
      } = req.query;

      console.log(`📖 Fetching posts for community: ${community_id}`, {
        page,
        limit,
        post_type,
        author_id
      });

      // Validate community_id
      if (!community_id) {
        return res.status(400).json({
          success: false,
          message: "Community ID is required"
        });
      }

      const communityRepo = dbConnection.getRepository(Community);
      const postRepo = dbConnection.getRepository(CommunityPost);

      // Check if community exists
      const community = await communityRepo.findOne({
        where: { id: community_id }
      });

      if (!community) {
        console.log(`   ❌ Community not found: ${community_id}`);
        return res.status(404).json({
          success: false,
          message: "Community not found"
        });
      }

      // Build query for posts
      const queryBuilder = postRepo.createQueryBuilder("post")
        .leftJoinAndSelect("post.author", "author")
        .leftJoinAndSelect("author.profile", "profile")
        .leftJoinAndSelect("post.linked_project", "linked_project")
        .leftJoinAndSelect("post.community", "community")
        .where("post.community_id = :community_id", { community_id })
        .andWhere("community.is_active = :isActive", { isActive: true });

      // Apply filters
      if (post_type) {
        queryBuilder.andWhere("post.post_type = :post_type", { post_type });
      }

      if (author_id) {
        queryBuilder.andWhere("post.author_id = :author_id", { author_id });
      }

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      // Order by creation date (newest first) and pinned posts first
      queryBuilder.orderBy("post.is_pinned", "DESC")
                 .addOrderBy("post.created_at", "DESC");

      const [posts, total] = await queryBuilder.getManyAndCount();

      console.log(`   ✅ Found ${posts.length} posts in community (${total} total)`);

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
      console.error("❌ Get community posts error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch community posts",
        error: error.message
      });
    }
  }



static async createCommunity(req: Request, res: Response) {
  try {
    CommunityController.logRoute('createCommunity', req);
    
    const userId = req.user.userId;
    const { name, description, category, community_type, join_approval_required, rules } = req.body;

    console.log("📝 Creating community:", { name, category, community_type });

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

    // Get creator details
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
      console.log("🖼️ Uploading cover image:", req.file.originalname);
      const uploadResult = await UploadToCloud(req.file);
      community.cover_image_url = uploadResult.secure_url;
      console.log("✅ Cover image uploaded:", uploadResult.secure_url);
    }

    await communityRepo.save(community);

    community.members = [{ id: userId } as any];
    community.member_count = 1;
    await communityRepo.save(community);

    console.log("✅ Community created successfully:", community.id);

    // ==================== SEND EMAIL TO ADMIN ====================
    console.log("\n📧 ========== SENDING EMAIL TO ADMIN ==========");
    
    try {
      // Get all admin users
      const admins = await userRepo.find({
        where: { account_type: AccountType.ADMIN, is_active: true }
      });

      console.log(`📊 Found ${admins.length} admin user(s)`);

      if (admins.length === 0) {
        console.log("⚠️ No admin users found to notify");
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
            console.log(`\n📧 Sending notification to admin: ${admin.email}`);

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
            console.log(`✅ Email sent successfully to: ${admin.email}`);

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (emailError: any) {
            emailsFailed++;
            console.error(`❌ Failed to send email to ${admin.email}:`, emailError.message);
          }
        }

        console.log("\n📊 === EMAIL NOTIFICATION SUMMARY ===");
        console.log(`✅ Successfully sent: ${emailsSent}/${admins.length}`);
        console.log(`❌ Failed: ${emailsFailed}/${admins.length}`);
      }

    } catch (emailSystemError: any) {
      console.error("❌ Email system error:", emailSystemError.message);
      console.error("⚠️ Community was created, but admin notification failed");
      // Don't throw error - community creation succeeded
    }

    console.log("📧 ========== EMAIL TO ADMIN COMPLETE ==========\n");

    res.status(201).json({
      success: true,
      message: "Community submitted for approval. You'll be notified once it's reviewed.",
      data: { community },
    });
  } catch (error: any) {
    console.error("❌ Community creation error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create community", 
      error: error.message 
    });
  }
}

// Updated approveCommunity method with creator email notification
static async approveCommunity(req: Request, res: Response) {
  try {
    CommunityController.logRoute('approveCommunity', req);
    
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

    console.log("✅ Community approved:", community.id);

    // ==================== SEND EMAIL TO CREATOR ====================
    console.log("\n📧 ========== SENDING APPROVAL EMAIL TO CREATOR ==========");
    
    try {
      const creatorEmail = community.creator.email;
      console.log(`📧 Sending approval notification to: ${creatorEmail}`);

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

      console.log(`✅ Approval email sent successfully to: ${creatorEmail}`);

    } catch (emailError: any) {
      console.error("❌ Failed to send approval email:", emailError.message);
      console.error("⚠️ Community was approved, but creator notification failed");
      // Don't throw error - approval succeeded
    }

    console.log("📧 ========== APPROVAL EMAIL COMPLETE ==========\n");

    res.json({
      success: true,
      message: "Community approved successfully and creator notified",
      data: { community },
    });
  } catch (error: any) {
    console.error("❌ Approve community error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to approve community", 
      error: error.message 
    });
  }
}

// Updated rejectCommunity method with creator email notification
static async rejectCommunity(req: Request, res: Response) {
  try {
    CommunityController.logRoute('rejectCommunity', req);
    
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

    // Store community data before deletion
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

    // ==================== SEND EMAIL TO CREATOR ====================
    console.log("\n📧 ========== SENDING REJECTION EMAIL TO CREATOR ==========");
    
    try {
      console.log(`📧 Sending rejection notification to: ${creatorData.email}`);

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

      console.log(`✅ Rejection email sent successfully to: ${creatorData.email}`);

    } catch (emailError: any) {
      console.error("❌ Failed to send rejection email:", emailError.message);
      // Continue with deletion even if email fails
    }

    console.log("📧 ========== REJECTION EMAIL COMPLETE ==========\n");

    // Delete the community
    await communityRepo.remove(community);

    console.log("✅ Community rejected and deleted:", id);

    res.json({
      success: true,
      message: "Community rejected successfully and creator notified",
    });
  } catch (error: any) {
    console.error("❌ Reject community error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to reject community", 
      error: error.message 
    });
  }
}


static async getAllCommunities(req: Request, res: Response) {
  try {
    CommunityController.logRoute('getAllCommunities', req);
    
    const { page = 1, limit = 12, search, category } = req.query;

    const communityRepo = dbConnection.getRepository(Community);
    const queryBuilder = communityRepo.createQueryBuilder("community")
      .leftJoinAndSelect("community.creator", "creator")
      .leftJoinAndSelect("creator.profile", "profile");
      // REMOVED: .where("community.is_active = :isActive", { isActive: true });
      // Now returns both active and inactive communities

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

    console.log(`   ✅ Found ${communities.length} communities (${total} total)`);

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
    console.error("❌ Fetch communities error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch communities", 
      error: error.message 
    });
  }
}

// Updated methods in CommunityController.ts

static async getUserCommunities(req: Request, res: Response) {
  try {
    CommunityController.logRoute('getUserCommunities', req);
    
    const userId = req.user.userId;
    console.log(`   Fetching communities for user: ${userId}`);

    const communityRepo = dbConnection.getRepository(Community);
    
    // Get communities where user is creator (including inactive ones)
    const createdCommunities = await communityRepo.find({
      where: { creator: { id: userId } },
      relations: ["creator", "creator.profile"],
      order: { created_at: "DESC" }
    });

    console.log(`   Found ${createdCommunities.length} created communities`);

    // Get communities where user is member (including inactive ones)
    const memberCommunities = await communityRepo
      .createQueryBuilder("community")
      .leftJoinAndSelect("community.creator", "creator")
      .leftJoinAndSelect("community.members", "members")
      .where("members.id = :userId", { userId })
      .getMany();

    console.log(`   Found ${memberCommunities.length} member communities`);

    // Remove duplicates (in case user is both creator and member)
    const allCommunities = [...createdCommunities];
    memberCommunities.forEach(mc => {
      if (!allCommunities.find(c => c.id === mc.id)) {
        allCommunities.push(mc);
      }
    });

    console.log(`   ✅ Returning ${allCommunities.length} total communities`);

    res.json({
      success: true,
      data: {
        communities: allCommunities
      }
    });
  } catch (error: any) {
    console.error(`   ❌ Error in getUserCommunities:`, error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your communities",
      error: error.message
    });
  }
}

static async getAllCommunitiesForAdmin(req: Request, res: Response) {
  try {
    CommunityController.logRoute('getAllCommunitiesForAdmin', req);
    
    const { page = 1, limit = 20, search, category, status } = req.query;

    const communityRepo = dbConnection.getRepository(Community);
    const queryBuilder = communityRepo.createQueryBuilder("community")
      .leftJoinAndSelect("community.creator", "creator")
      .leftJoinAndSelect("creator.profile", "profile");

    // Filter by status - allow viewing both active and inactive
    if (status === 'pending') {
      queryBuilder.where("community.is_active = :isActive", { isActive: false });
    } else if (status === 'approved') {
      queryBuilder.where("community.is_active = :isActive", { isActive: true });
    }
    // If status is 'all', don't filter by is_active

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

    console.log(`   ✅ Found ${communities.length} communities for admin (${total} total)`);

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
    console.error("❌ Admin fetch communities error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch communities", 
      error: error.message 
    });
  }
}

static async getCommunityById(req: Request, res: Response) {
  try {
    CommunityController.logRoute('getCommunityById', req);
    
    const { id } = req.params;
    
    console.log(`   Attempting to find community with ID: ${id}`);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log(`   ❌ Invalid UUID format: ${id}`);
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
      console.log(`   ❌ Community not found`);
      return res.status(404).json({ 
        success: false, 
        message: "Community not found" 
      });
    }

    console.log(`   ✅ Community found: ${community.name} (Active: ${community.is_active})`);

    res.json({
      success: true,
      data: { community },
    });
  } catch (error: any) {
    console.error(`   ❌ Error in getCommunityById:`, error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch community", 
      error: error.message 
    });
  }
}

  static async getPendingCommunities(req: Request, res: Response) {
    try {
      CommunityController.logRoute('getPendingCommunities', req);
      
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

      console.log(`   ✅ Found ${communities.length} pending communities`);

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
      console.error("❌ Fetch pending communities error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch pending communities", 
        error: error.message 
      });
    }
  }


  static async deleteCommunity(req: Request, res: Response) {
    try {
      CommunityController.logRoute('deleteCommunity', req);
      
      const { id } = req.params;

      const communityRepo = dbConnection.getRepository(Community);
      const community = await communityRepo.findOne({
        where: { id },
        relations: ["creator"],
      });

      if (!community) {
        return res.status(404).json({ 
          success: false, 
          message: "Community not found" 
        });
      }

      await communityRepo.remove(community);

      console.log("✅ Community deleted:", community.id);

      res.json({
        success: true,
        message: "Community deleted successfully",
      });
    } catch (error: any) {
      console.error("❌ Delete community error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to delete community", 
        error: error.message 
      });
    }
  }

static async joinCommunity(req: Request, res: Response) {
  try {
    CommunityController.logRoute('joinCommunity', req);
    
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

    // Check if approval is required
    if (community.join_approval_required) {
      // Check for existing pending request
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

      // Create join request
      const joinRequest = joinRequestRepo.create({
        community: { id },
        user: { id: userId },
        status: JoinRequestStatus.PENDING,
        message: message || null
      });

      await joinRequestRepo.save(joinRequest);

      console.log("✅ Join request created (approval required):", joinRequest.id);

      // Send email to creator
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

          console.log(`✅ Join request email sent to creator`);
        }
      } catch (emailError: any) {
        console.error("❌ Failed to send join request email:", emailError.message);
      }

      return res.status(201).json({
        success: true,
        message: "Join request submitted. Waiting for approval from community creator.",
        requiresApproval: true,
        data: { joinRequest }
      });
    }

    // If no approval required, join immediately
    community.members.push({ id: userId } as any);
    community.member_count += 1;
    await communityRepo.save(community);

    console.log("✅ User joined community instantly (no approval required)");

    res.json({
      success: true,
      message: "Joined community successfully",
      requiresApproval: false
    });

  } catch (error: any) {
    console.error("❌ Join community error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to join community", 
      error: error.message 
    });
  }
}

  static async leaveCommunity(req: Request, res: Response) {
    try {
      CommunityController.logRoute('leaveCommunity', req);
      
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

      console.log("✅ User left community");

      res.json({
        success: true,
        message: "Left community successfully",
      });
    } catch (error: any) {
      console.error("❌ Leave community error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to leave community", 
        error: error.message 
      });
    }
  }

  static async createPost(req: Request, res: Response) {
    try {
      CommunityController.logRoute('createPost', req);
      
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

      console.log(`✅ Created ${createdPosts.length} posts`);

      res.status(201).json({
        success: true,
        message: `Posted to ${createdPosts.length} ${createdPosts.length === 1 ? 'community' : 'communities'}`,
        data: { posts: createdPosts }
      });
    } catch (error: any) {
      console.error("❌ Create post error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create posts",
        error: error.message
      });
    }
  }

  static async getSuggestedCommunities(req: Request, res: Response) {
    try {
      CommunityController.logRoute('getSuggestedCommunities', req);
      
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

      console.log(`✅ Found ${communities.length} suggested communities`);

      res.json({
        success: true,
        data: { communities }
      });
    } catch (error: any) {
      console.error("❌ Get suggested communities error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch suggested communities",
        error: error.message
      });
    }
  }


  static async getCommunityMembers(req: Request, res: Response) {
    try {
      CommunityController.logRoute('getCommunityMembers', req);

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
      console.error("❌ Get community members error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch community members",
        error: error.message
      });
    }
  }


static async activateDeactivateCommunity(req: Request, res: Response) {
  try {
    CommunityController.logRoute('activateDeactivateCommunity', req);
    
    const { id } = req.params;
    const { is_active, reason } = req.body;

    console.log("🔄 ========== ACTIVATE/DEACTIVATE COMMUNITY START ==========");
    console.log("📥 Request Data:", { communityId: id, is_active, reason });

    // Validate input
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "is_active must be a boolean value"
      });
    }

    // If deactivating, reason should be provided
    if (!is_active && !reason) {
      return res.status(400).json({
        success: false,
        message: "Reason is required when deactivating a community"
      });
    }

    // Step 1: Find community with all necessary relations
    console.log("📍 STEP 1: Fetching community with relations...");
    const communityRepo = dbConnection.getRepository(Community);
    const community = await communityRepo.findOne({
      where: { id },
      relations: ["creator", "creator.profile", "members", "members.profile"]
    });

    if (!community) {
      console.log("❌ Community not found");
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    console.log("✅ Community found:", {
      name: community.name,
      currentStatus: community.is_active,
      newStatus: is_active,
      memberCount: community.members.length
    });

    // Check if status is already the same
    if (community.is_active === is_active) {
      const statusText = is_active ? 'active' : 'inactive';
      return res.status(400).json({
        success: false,
        message: `Community is already ${statusText}`
      });
    }

    // Step 2: Update community status
    console.log("📍 STEP 2: Updating community status...");
    community.is_active = is_active;
    await communityRepo.save(community);
    console.log(`✅ Community status updated to: ${is_active ? 'ACTIVE' : 'INACTIVE'}`);

    // Step 3: Send email notifications
    console.log("\n📧 ========== EMAIL NOTIFICATION START ==========");
    console.log("📍 STEP 3: Preparing to send email notifications...");

    const actionText = is_active ? 'activation' : 'deactivation';
    
    try {
      // Prepare list of recipients (all members + creator)
      const allRecipients = [...community.members];
      
      // Ensure creator is included if not already in members
      const creatorInMembers = allRecipients.some(m => m.id === community.creator.id);
      if (!creatorInMembers) {
        allRecipients.push(community.creator);
      }

      console.log("📊 Email Distribution Plan:", {
        totalRecipients: allRecipients.length,
        includesCreator: true,
        action: actionText
      });

      let emailsSent = 0;
      let emailsFailed = 0;
      const failedEmails: Array<{ email: string; error: string }> = [];

      // Prepare community data for email template
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

      // Send emails to all recipients
      for (let i = 0; i < allRecipients.length; i++) {
        const recipient = allRecipients[i];
        const progress = `[${i + 1}/${allRecipients.length}]`;

        try {
          console.log(`\n${progress} 📧 Preparing email for: ${recipient.email}`);
          console.log(`   Name: ${recipient.first_name} ${recipient.last_name}`);
          console.log(`   Role: ${recipient.id === community.creator.id ? 'Creator' : 'Member'}`);

          const userData = {
            first_name: recipient.first_name,
            email: recipient.email
          };

          // Generate email HTML using the template
          const emailHtml = ActivateDeactiveCommunityTemplate.getStatusChangeTemplate(
            communityData,
            userData,
            is_active
          );

          console.log(`   ✉️ Email HTML generated (${emailHtml.length} chars)`);
          console.log(`   📬 Sending email via sendEmail function...`);

          // Determine email subject based on action
          const emailSubject = is_active 
            ? `✅ Community Activated: ${community.name}`
            : `⚠️ Community Deactivated: ${community.name}`;

          // Send email
          await sendEmail({
            to: recipient.email,
            subject: emailSubject,
            html: emailHtml
          });

          emailsSent++;
          console.log(`   ✅ SUCCESS: Email sent to ${recipient.email}`);

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (emailError: any) {
          emailsFailed++;
          const errorMsg = emailError.message || 'Unknown error';
          console.error(`   ❌ FAILED: ${recipient.email}`);
          console.error(`   Error: ${errorMsg}`);
          
          failedEmails.push({
            email: recipient.email,
            error: errorMsg
          });
        }
      }

      // Email distribution summary
      console.log("\n📊 === EMAIL DISTRIBUTION SUMMARY ===");
      console.log(`✅ Successfully sent: ${emailsSent}/${allRecipients.length}`);
      console.log(`❌ Failed: ${emailsFailed}/${allRecipients.length}`);
      console.log(`📧 Success rate: ${((emailsSent/allRecipients.length)*100).toFixed(1)}%`);
      
      if (failedEmails.length > 0) {
        console.log("\n❌ Failed emails:");
        failedEmails.forEach((fail, idx) => {
          console.log(`  ${idx + 1}. ${fail.email} - ${fail.error}`);
        });
      }

    } catch (emailSystemError: any) {
      console.error("❌ Email system error:", emailSystemError.message);
      console.error("⚠️ Community status was updated, but email notifications failed");
      // Don't throw error - status update succeeded
    }

    console.log("📧 ========== EMAIL NOTIFICATION END ==========\n");
    console.log("🔄 ========== ACTIVATE/DEACTIVATE COMMUNITY END ==========\n");

    // Step 4: Return success response
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
    console.error("❌ ========== ERROR IN ACTIVATE/DEACTIVATE COMMUNITY ==========");
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.error("================================================================\n");
    
    res.status(500).json({
      success: false,
      message: "Failed to update community status",
      error: error.message
    });
  }
}



// NEW: Request to join community (replaces instant join for approval-required communities)
static async requestToJoinCommunity(req: Request, res: Response) {
  try {
    CommunityController.logRoute('requestToJoinCommunity', req);
    
    const { id } = req.params;
    const userId = req.user.userId;
    const { message } = req.body;

    const communityRepo = dbConnection.getRepository(Community);
    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);
    const userRepo = dbConnection.getRepository(User);

    // Get community with creator and members
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

    // Check if user is already a member
    const isMember = community.members.some(member => member.id === userId);
    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this community"
      });
    }

    // Check if there's already a pending request
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

    // Create join request
    const joinRequest = joinRequestRepo.create({
      community: { id },
      user: { id: userId },
      status: JoinRequestStatus.PENDING,
      message: message || null
    });

    await joinRequestRepo.save(joinRequest);

    console.log("✅ Join request created:", joinRequest.id);

    // ==================== SEND EMAIL TO CREATOR ====================
    console.log("\n📧 ========== SENDING JOIN REQUEST EMAIL TO CREATOR ==========");
    
    try {
      // Get requester details
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

        console.log(`✅ Join request email sent to creator: ${community.creator.email}`);
      }

    } catch (emailError: any) {
      console.error("❌ Failed to send join request email:", emailError.message);
    }

    console.log("📧 ========== JOIN REQUEST EMAIL COMPLETE ==========\n");

    res.status(201).json({
      success: true,
      message: "Join request submitted successfully. You'll be notified when it's reviewed.",
      data: { joinRequest }
    });

  } catch (error: any) {
    console.error("❌ Request to join community error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit join request",
      error: error.message
    });
  }
}

// NEW: Get pending join requests for a community (for creator/admin)
static async getCommunityJoinRequests(req: Request, res: Response) {
  try {
    CommunityController.logRoute('getCommunityJoinRequests', req);
    
    const { community_id } = req.params;
    const userId = req.user.userId;

    const communityRepo = dbConnection.getRepository(Community);
    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);

    // Verify user is the creator of the community
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

    // Get pending join requests
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
    console.error("❌ Get join requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch join requests",
      error: error.message
    });
  }
}
// NEW: Approve join request
static async approveJoinRequest(req: Request, res: Response) {
  try {
    CommunityController.logRoute('approveJoinRequest', req);
    
    const { request_id } = req.params;
    const userId = req.user.userId;

    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);
    const communityRepo = dbConnection.getRepository(Community);

    // Get join request with relations
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

    // Verify user is the creator
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

    // Update request status
    joinRequest.status = JoinRequestStatus.APPROVED;
    joinRequest.responded_at = new Date();
    joinRequest.responded_by = { id: userId } as any;
    await joinRequestRepo.save(joinRequest);

    console.log("✅ Join request rejected:", request_id);

    res.json({
      success: true,
      message: "Join request rejected successfully"
    });

  } catch (error: any) {
    console.error("❌ Reject join request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject join request",
      error: error.message
    });
  }
}

static async getUserPendingRequests(req: Request, res: Response) {
  try {
    CommunityController.logRoute('getUserPendingRequests', req);
    
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
    console.error("❌ Get user pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests",
      error: error.message
    });
  }
}
static async rejectJoinRequest(req: Request, res: Response) {
  try {
    CommunityController.logRoute('rejectJoinRequest', req);
    
    const { request_id } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    const joinRequestRepo = dbConnection.getRepository(CommunityJoinRequest);

    // Get join request with relations
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

    // Verify user is the creator
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

    // Update request status
    joinRequest.status = JoinRequestStatus.REJECTED;
    joinRequest.responded_at = new Date();
    joinRequest.responded_by = { id: userId } as any;
    await joinRequestRepo.save(joinRequest);

    console.log("✅ Join request rejected:", request_id);

    // ==================== SEND REJECTION EMAIL TO USER ====================
    console.log("\n📧 ========== SENDING REJECTION EMAIL TO USER ==========");
    
    try {
      const communityData = {
        name: joinRequest.community.name,
        description: joinRequest.community.description,
        community_id: joinRequest.community.id,
        cover_image_url: joinRequest.community.cover_image_url,
        category: joinRequest.community.category,
        community_type: joinRequest.community.community_type
      };

      const userData = {
        first_name: joinRequest.user.first_name,
        email: joinRequest.user.email
      };

      const emailHtml = ApproveRejectCommunityToCreatorTemplate.getRejectionTemplate(
        communityData,
        userData,
        reason
      );

      await sendEmail({
        to: joinRequest.user.email,
        subject: `Update on Your Request to Join ${joinRequest.community.name}`,
        html: emailHtml
      });

      console.log(`✅ Rejection email sent to user: ${joinRequest.user.email}`);

    } catch (emailError: any) {
      console.error("❌ Failed to send rejection email:", emailError.message);
    }

    console.log("📧 ========== REJECTION EMAIL COMPLETE ==========\n");

    res.json({
      success: true,
      message: "Join request rejected successfully"
    });

  } catch (error: any) {
    console.error("❌ Reject join request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject join request",
      error: error.message
    });
  }
}
}