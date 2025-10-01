interface BlogData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  status: string;
  created_at: Date;
  cover_image_url?: string;
  author: {
    first_name: string;
    last_name: string;
    profile?: {
      institution_name?: string;
    };
  };
  community: {
    name: string;
    member_count: number;
  };
  view_count?: number;
  reading_time_minutes?: number;
  blog_id: string;
}

interface MemberData {
  first_name: string;
}

export class NewsBlogCreatedTemplate {
  static getBlogCreatedTemplate(blogData: BlogData, memberData: MemberData): string {
    const authorInitials = `${blogData.author.first_name.charAt(0)}${blogData.author.last_name.charAt(0)}`;
    const publishDate = new Date(blogData.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const category = blogData.category;
    const readingTime = blogData.reading_time_minutes || Math.ceil(blogData.content.length / 1000);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Blog Post: ${blogData.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      background-color: #f8f9fa; 
      padding: 20px; 
      line-height: 1.6;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff; 
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    .header { 
      background-color: #0a9b6d;
      padding: 32px 24px; 
      text-align: center; 
    }
    .content { padding: 36px 28px; }
    .footer { 
      background-color: #2d3748; 
      color: #a0aec0; 
      padding: 28px 24px; 
      text-align: center; 
      font-size: 12px; 
    }
    .btn-primary { 
      display: inline-block; 
      background-color: #0a9b6d;
      color: white; 
      padding: 15px 36px; 
      text-decoration: none; 
      border-radius: 10px; 
      font-weight: 600; 
      font-size: 15px; 
      box-shadow: 0 4px 12px rgba(10, 155, 109, 0.25);
      transition: all 0.3s ease;
    }
    .btn-primary:hover {
      background-color: #088a60;
      box-shadow: 0 6px 16px rgba(10, 155, 109, 0.35);
      transform: translateY(-1px);
    }
    .btn-secondary { 
      display: inline-block; 
      background-color: #ffffff; 
      color: #4a5568; 
      padding: 11px 22px; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 500; 
      font-size: 14px; 
      border: 2px solid #e2e8f0; 
      transition: all 0.3s ease;
    }
    .btn-secondary:hover {
      border-color: #0a9b6d;
      color: #0a9b6d;
      background-color: #f0fdf7;
    }
    .badge { 
      display: inline-block; 
      background-color: #e6f7f1; 
      color: #0a6e4f; 
      padding: 6px 14px; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
      margin-right: 8px;
      border: 1px solid #c3e8da;
    }
    .stat-box { 
      display: inline-block; 
      background-color: #fafbfc; 
      border: 2px solid #edf2f7; 
      border-radius: 12px; 
      padding: 16px 20px; 
      margin: 8px 6px; 
      text-align: center;
      transition: all 0.3s ease;
    }
    .stat-box:hover {
      border-color: #cbd5e0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .stat-number { 
      font-size: 22px; 
      font-weight: 700; 
      color: #0a9b6d; 
      display: block; 
    }
    .stat-label { 
      font-size: 11px; 
      color: #718096; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
      margin-top: 6px;
      font-weight: 500;
    }
    .author-card { 
      display: flex; 
      align-items: center; 
      background-color: #f7fafc; 
      border-radius: 12px; 
      padding: 20px; 
      margin: 24px 0; 
      border-left: 5px solid #0a9b6d;
      transition: all 0.3s ease;
    }
    .author-card:hover {
      background-color: #edf7f3;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .divider { 
      height: 1px; 
      background-color: #e2e8f0; 
      margin: 28px 0; 
    }
    .blog-card {
      background-color: #f7fcfa;
      border: 2px solid #d4f1e8;
      border-radius: 14px;
      padding: 24px;
      margin: 28px 0;
      transition: all 0.3s ease;
    }
    .blog-card:hover {
      border-color: #b3e5d6;
      box-shadow: 0 4px 16px rgba(10, 155, 109, 0.08);
    }
    .cover-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .community-card {
      background-color: #f7fafc;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      margin: 24px 0;
      transition: all 0.3s ease;
    }
    .community-card:hover {
      border-color: #cbd5e0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }
    .action-card {
      background-color: #f0f7ff;
      border: 2px solid #dbeafe;
      border-radius: 14px;
      padding: 24px;
      margin: 28px 0;
    }
    .action-item {
      display: flex;
      align-items: center;
      padding: 14px;
      background: white;
      border-radius: 10px;
      text-decoration: none;
      color: #4a5568;
      border: 2px solid #e2e8f0;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }
    .action-item:last-child {
      margin-bottom: 0;
    }
    .action-item:hover {
      border-color: #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
      transform: translateX(4px);
    }
    .header-logo {
      width: 52px;
      height: 52px;
      background-color: rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 14px;
      backdrop-filter: blur(10px);
    }
    .notification-badge {
      background-color: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 10px;
      padding: 14px;
      margin-top: 20px;
      backdrop-filter: blur(10px);
    }
    
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 12px; }
      .content { padding: 28px 20px !important; }
      .header { padding: 28px 20px !important; }
      .btn-primary { padding: 13px 28px !important; font-size: 14px !important; }
      .stat-box { margin: 6px 4px !important; padding: 14px 16px !important; }
      .blog-card { padding: 20px !important; }
      .community-card { padding: 20px !important; }
      .action-card { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <div class="header">
      <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <div class="header-logo">
          <span style="font-size: 26px;">✍️</span>
        </div>
        <div style="text-align: left;">
          <h1 style="color: white; font-size: 23px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Research Hub</h1>
          <p style="color: rgba(255,255,255,0.95); font-size: 12px; margin: 0; font-weight: 500;">Rwanda Academic Network</p>
        </div>
      </div>
      <div class="notification-badge">
        <p style="color: white; font-size: 13px; margin: 0; font-weight: 600;">✨ New Blog Post in Your Community</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      
      <!-- Greeting -->
      <div style="margin-bottom: 28px;">
        <h2 style="color: #1a202c; font-size: 20px; margin-bottom: 10px; font-weight: 700;">Hi ${memberData.first_name},</h2>
        <p style="color: #718096; font-size: 15px; line-height: 1.7; margin: 0;">
          Great news! A new blog post has been published in 
          <strong style="color: #0a9b6d; font-weight: 600;">${blogData.community.name}</strong>. 
          Check it out below! 👇
        </p>
      </div>

      <!-- Blog Card -->
      <div class="blog-card">
        
        ${blogData.cover_image_url ? `<img src="${blogData.cover_image_url}" alt="${blogData.title}" class="cover-image">` : ''}
        
        <!-- Category Badge -->
        <div style="margin-bottom: 16px;">
          <span class="badge">${category}</span>
          <span class="badge" style="background-color: #fef3c7; color: #92400e; border-color: #fde68a;">📖 Blog Post</span>
        </div>

        <!-- Blog Title -->
        <h3 style="color: #0a6e4f; font-size: 21px; font-weight: 700; margin-bottom: 14px; line-height: 1.4; letter-spacing: -0.3px;">
          ${blogData.title}
        </h3>

        <!-- Blog Excerpt -->
        <p style="color: #4a5568; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          ${blogData.excerpt}
        </p>

        <!-- Blog Stats -->
        <div style="text-align: center; margin: 24px 0;">
          <div class="stat-box">
            <span class="stat-number">${blogData.view_count || 0}</span>
            <span class="stat-label">Views</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">${readingTime}</span>
            <span class="stat-label">Min Read</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">${publishDate}</span>
            <span class="stat-label">Published</span>
          </div>
        </div>

        <!-- CTA Button -->
        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/blogs/${blogData.blog_id}" class="btn-primary">
            📖 Read Full Article
          </a>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Author Information -->
      <div class="author-card">
        <div style="flex: 1;">
          <h4 style="color: #1a202c; font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">
            ${blogData.author.first_name} ${blogData.author.last_name}
          </h4>
          <p style="color: #a0aec0; font-size: 13px; margin: 0; font-weight: 500;">
            🏛️ ${blogData.author.profile?.institution_name || 'Research Institution'}
          </p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Community Information -->
      <div class="community-card">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="color: #1a202c; font-size: 17px; font-weight: 600; margin: 0 0 4px 0;">
              ${blogData.community.name}
            </h4>
            <p style="color: #718096; font-size: 13px; margin: 0; font-weight: 500;">
              ${blogData.community.member_count} members
            </p>
          </div>
        </div>
        <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 16px 0 20px 0;">
          A collaborative space for researchers, students, and professionals to share knowledge and insights.
        </p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${blogData.community.name.toLowerCase().replace(/\s+/g, '-')}" class="btn-secondary">
          Visit Community →
        </a>
      </div>

      <!-- Quick Actions -->
      <div class="action-card">
        <h4 style="color: #1e3a8a; font-size: 16px; font-weight: 600; margin: 0 0 20px 0; display: flex; align-items: center;">
          <span style="margin-right: 10px;">💡</span>
          Quick Actions
        </h4>
        <div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/blogs/${blogData.blog_id}" class="action-item">
            <span style="margin-right: 14px; font-size: 20px;">📖</span>
            <div style="flex: 1; text-align: left;">
              <strong style="color: #1a202c; font-size: 14px; display: block; font-weight: 600;">Read Full Article</strong>
              <span style="color: #718096; font-size: 12px;">Dive deep into the content</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/blogs/${blogData.blog_id}#comments" class="action-item">
            <span style="margin-right: 14px; font-size: 20px;">💬</span>
            <div style="flex: 1; text-align: left;">
              <strong style="color: #1a202c; font-size: 14px; display: block; font-weight: 600;">Join Discussion</strong>
              <span style="color: #718096; font-size: 12px;">Share your thoughts and insights</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/blogs" class="action-item">
            <span style="margin-right: 14px; font-size: 20px;">🔍</span>
            <div style="flex: 1; text-align: left;">
              <strong style="color: #1a202c; font-size: 14px; display: block; font-weight: 600;">Explore More Articles</strong>
              <span style="color: #718096; font-size: 12px;">Discover related content</span>
            </div>
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <h4 style="color: #e2e8f0; font-size: 15px; margin: 0 0 16px 0; font-weight: 600;">Stay Connected</h4>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">📘</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">🐦</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">📷</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">💼</a>
      </div>
      <p style="margin: 20px 0 10px 0; color: #a0aec0; line-height: 1.6;">
        Rwanda Research Hub • Academic Collaboration Platform<br>
        📧 support@researchhub.rw
      </p>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
        <p style="margin: 0 0 10px 0; color: #718096; font-size: 11px; line-height: 1.5;">
          You're receiving this email because you're a member of <strong>${blogData.community.name}</strong>.
        </p>
        <p style="margin: 0; color: #718096; font-size: 11px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe" style="color: #0a9b6d; text-decoration: none; font-weight: 500;">Unsubscribe from community notifications</a>
          •
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences" style="color: #0a9b6d; text-decoration: none; font-weight: 500;">Update email preferences</a>
        </p>
      </div>
      <p style="margin: 20px 0 0 0; color: #4a5568; font-size: 10px; line-height: 1.5;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.<br>
        KN 123 St, Kigali, Rwanda
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }
}