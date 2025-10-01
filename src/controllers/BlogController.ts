// @ts-nocheck
import { Request, Response } from "express";
import dbConnection from '../database/db';
import { BlogPost } from "../database/models/BlogPost";
import { Community } from "../database/models/Community";
import { UploadToCloud } from "../helpers/cloud";
import { sendEmail } from '../helpers/utils';
import { NewsBlogCreatedTemplate } from '../helpers/NewsBlogCreatedTemplate';

export class BlogController {
  static async createBlogPost(req: Request, res: Response) {
    try {
      const userId = req.user.userId;
      const { title, content, excerpt, category, linked_project_id } = req.body;

      const blogRepo = dbConnection.getRepository(BlogPost);
      
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      
      const existingBlog = await blogRepo.findOne({ where: { slug } });
      if (existingBlog) {
        return res.status(409).json({ 
          success: false, 
          message: "Blog post with this title already exists" 
        });
      }

      const blog = blogRepo.create({
        title,
        slug,
        content,
        excerpt,
        category,
        author: { id: userId },
        linked_project: linked_project_id ? { id: linked_project_id } : null,
      });

      if (req.file) {
        const uploadResult = await UploadToCloud(req.file);
        blog.cover_image_url = uploadResult.secure_url;
      }

      await blogRepo.save(blog);

      res.status(201).json({
        success: true,
        message: "Blog post created successfully",
        data: { blog },
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to create blog post", 
        error: error.message 
      });
    }
  }


static async getAllBlogPosts(req: Request, res: Response) {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      category,
      includeArchived = 'false',
      status
    } = req.query;



    const blogRepo = dbConnection.getRepository(BlogPost);
    
    // Create query builder
    const queryBuilder = blogRepo.createQueryBuilder("blog")
      .leftJoinAndSelect("blog.author", "author")
      .leftJoinAndSelect("author.profile", "profile")
      .leftJoinAndSelect("blog.community", "community"); // ✅ Added community relation

    // ✅ IMPROVED: Handle status filter with archived support
    if (status) {
      // If specific status is requested, filter by that
      queryBuilder.where("blog.status = :status", { status });
    } else if (includeArchived === 'true') {
      // If includeArchived=true, show all statuses including archived
      queryBuilder.where("blog.status IN (:...statuses)", { 
        statuses: ["Published", "Draft", "Under Review", "Archived"] 
      });
    } else {
      // Default: show both Published AND Archived (excluding Draft and Under Review)
      // This matches your expected output
      queryBuilder.where("blog.status IN (:...statuses)", { 
        statuses: ["Published", "Archived"] 
      });
    }

    // ✅ Search filter
    if (search) {
      queryBuilder.andWhere(
        "(blog.title ILIKE :search OR blog.excerpt ILIKE :search OR blog.content ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    // ✅ Category filter
    if (category) {
      queryBuilder.andWhere("blog.category = :category", { category });
    }

    // Get total count
    const total = await queryBuilder.getCount();
    
    // Apply pagination
    const skip = (Number(page) - 1) * Number(limit);
    queryBuilder.skip(skip).take(Number(limit));
    
    // ✅ Ordering: prioritize published_at, then updated_at
    queryBuilder.orderBy("blog.published_at", "DESC");
    queryBuilder.addOrderBy("blog.updated_at", "DESC");

    const blogs = await queryBuilder.getMany();


    res.json({
      success: true,
      data: {
        blogs,
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
      message: "Failed to fetch blog posts", 
      error: error.message 
    });
  }
}

  static async getCommunityBlogs(req: Request, res: Response) {
    try {
      const { communityId } = req.params;
      const { page = 1, limit = 10, category } = req.query;


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

      const blogRepo = dbConnection.getRepository(BlogPost);
      const queryBuilder = blogRepo.createQueryBuilder("blog")
        .leftJoinAndSelect("blog.author", "author")
        .leftJoinAndSelect("author.profile", "profile")
        .leftJoinAndSelect("blog.community", "community")
        .where("blog.community_id = :communityId", { communityId })
        .andWhere("blog.status = :status", { status: "Published" });

      if (category) {
        queryBuilder.andWhere("blog.category = :category", { category });
      }

      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));
      queryBuilder.orderBy("blog.published_at", "DESC");

      const [blogs, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          blogs,
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
        message: "Failed to fetch community blogs",
        error: error.message
      });
    }
  }

  // ✅ NEW: Get blog by ID
  static async getBlogById(req: Request, res: Response) {
    try {
      const { id } = req.params;


      const blogRepo = dbConnection.getRepository(BlogPost);
      const blog = await blogRepo.findOne({
        where: { id },
        relations: ["author", "author.profile", "community", "linked_project"]
      });

      if (!blog) {
        return res.status(404).json({
          success: false,
          message: "Blog post not found"
        });
      }

      blog.view_count += 1;
      await blogRepo.save(blog);


      res.json({
        success: true,
        data: { blog }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch blog post",
        error: error.message
      });
    }
  }

static async createCommunityBlog(req: Request, res: Response) {
  try {
    const { communityId } = req.params;
    const userId = req.user.userId;
    const { title, content, excerpt, category, linked_project_id } = req.body;

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
        message: "Only community members can create blogs"
      });
    }


    const blogRepo = dbConnection.getRepository(BlogPost);
    
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    
    const existingBlog = await blogRepo.findOne({ where: { slug } });
    if (existingBlog) {
      return res.status(409).json({ 
        success: false, 
        message: "Blog post with this title already exists" 
      });
    }

    const wordCount = content.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    const blog = blogRepo.create({
      title,
      slug,
      content,
      excerpt,
      category,
      author: { id: userId },
      community: { id: communityId },
      linked_project: linked_project_id ? { id: linked_project_id } : null,
      status: "Published",
      published_at: new Date(),
      reading_time_minutes: readingTimeMinutes
    });


    if (req.file) {
      const uploadResult = await UploadToCloud(req.file);
      blog.cover_image_url = uploadResult.secure_url;
    }


    await blogRepo.save(blog);

    const completeBlog = await blogRepo.findOne({
      where: { id: blog.id },
      relations: ["author", "author.profile", "community"]
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
          const progress = `[${i + 1}/${membersToNotify.length}]`;

          try {

            const blogData = {
              title: completeBlog!.title,
              excerpt: completeBlog!.excerpt,
              content: completeBlog!.content,
              category: completeBlog!.category,
              status: completeBlog!.status,
              created_at: completeBlog!.created_at,
              cover_image_url: completeBlog!.cover_image_url,
              author: {
                first_name: completeBlog!.author.first_name,
                last_name: completeBlog!.author.last_name,
                profile: completeBlog!.author.profile
              },
              community: {
                name: completeBlog!.community.name,
                member_count: completeBlog!.community.member_count
              },
              view_count: completeBlog!.view_count,
              reading_time_minutes: completeBlog!.reading_time_minutes,
              blog_id: completeBlog!.id
            };

            const memberData = {
              first_name: member.first_name
            };

            // Generate email HTML
            const emailHtml = NewsBlogCreatedTemplate.getBlogCreatedTemplate(
              blogData,
              memberData
            );

            await sendEmail({
              to: member.email,
              subject: `✍️ New Blog Post: ${completeBlog!.title}`,
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
      // Don't throw error - blog creation succeeded
    }


    res.status(201).json({
      success: true,
      message: "Community blog created successfully and notifications sent",
      data: { blog: completeBlog },
    });
  } catch (error: any) {

    res.status(500).json({ 
      success: false, 
      message: "Failed to create community blog", 
      error: error.message 
    });
  }
}



static async updateBlogStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { status } = req.body;


    const blogRepo = dbConnection.getRepository(BlogPost);
    const blog = await blogRepo.findOne({
      where: { id },
      relations: ["author"]
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Check permissions (author or admin)
    if (blog.author.id !== userId && req.user.account_type !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this blog"
      });
    }

    // Update status
    blog.status = status;
    
    // If publishing, set published_at
    if (status === "Published" && !blog.published_at) {
      blog.published_at = new Date();
    }

    await blogRepo.save(blog);

    res.json({
      success: true,
      message: "Blog status updated successfully",
      data: { blog }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update blog status",
      error: error.message
    });
  }
}

// ✅ Update Blog
static async updateBlog(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, content, excerpt, category, linked_project_id } = req.body;


    const blogRepo = dbConnection.getRepository(BlogPost);
    const blog = await blogRepo.findOne({
      where: { id },
      relations: ["author"]
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Check permissions
    if (blog.author.id !== userId && req.user.account_type !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this blog"
      });
    }

    // Update fields
    if (title) {
      blog.title = title;
      blog.slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    }
    if (content) {
      blog.content = content;
      // Recalculate reading time
      const wordCount = content.split(/\s+/).length;
      blog.reading_time_minutes = Math.ceil(wordCount / 200);
    }
    if (excerpt) blog.excerpt = excerpt;
    if (category) blog.category = category;
    if (linked_project_id) blog.linked_project = { id: linked_project_id };

    // Update cover image if provided
    if (req.file) {
      const uploadResult = await UploadToCloud(req.file);
      blog.cover_image_url = uploadResult.secure_url;
    }

    await blogRepo.save(blog);

    // Fetch complete blog
    const completeBlog = await blogRepo.findOne({
      where: { id },
      relations: ["author", "author.profile", "community"]
    });

    res.json({
      success: true,
      message: "Blog updated successfully",
      data: { blog: completeBlog }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update blog",
      error: error.message
    });
  }
}


static async archiveBlog(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;


    const blogRepo = dbConnection.getRepository(BlogPost);
    const blog = await blogRepo.findOne({
      where: { id },
      relations: ["author"]
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Check permissions (author or admin)
    if (blog.author.id !== userId && req.user.account_type !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to archive this blog"
      });
    }

    // Update status to Archived
    blog.status = "Archived";
    await blogRepo.save(blog);
    

    res.json({
      success: true,
      message: "Blog archived successfully",
      data: { blog }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to archive blog",
      error: error.message
    });
  }
}


static async deleteBlog(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;


    const blogRepo = dbConnection.getRepository(BlogPost);
    const blog = await blogRepo.findOne({
      where: { id },
      relations: ["author"]
    });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog post not found"
      });
    }

    // Check permissions
    if (blog.author.id !== userId && req.user.account_type !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this blog"
      });
    }

    await blogRepo.remove(blog);

    res.json({
      success: true,
      message: "Blog deleted successfully"
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete blog",
      error: error.message
    });
  }
}


}