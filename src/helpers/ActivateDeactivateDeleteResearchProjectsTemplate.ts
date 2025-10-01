import { ResearchProject } from "../database/models/ResearchProject";

export class ActivateDeactivateDeleteResearchProjectsTemplate {
  /**
   * Template for project activation/deactivation (Published/Archived)
   */
  static getStatusChangeTemplate(
    project: ResearchProject,
    isActivation: boolean,
    reason?: string
  ): string {
    const statusText = isActivation ? 'Published' : 'Archived';
    const statusEmoji = isActivation ? '✅' : '⚠️';
    const statusColor = isActivation ? '#10b981' : '#f59e0b';
    const statusBg = isActivation ? '#d1fae5' : '#fef3c7';
    const statusBorder = isActivation ? '#6ee7b7' : '#fbbf24';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Project ${statusText}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container { 
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header { 
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 48px 32px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .status-badge {
      display: inline-block;
      background: ${statusBg};
      border: 3px solid ${statusBorder};
      color: ${statusColor};
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      animation: pulse 2s ease-in-out infinite;
      position: relative;
      z-index: 1;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .content { padding: 48px 36px; }
    .alert-box {
      background: ${statusBg};
      border-left: 6px solid ${statusColor};
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .project-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 3px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin: 32px 0;
      position: relative;
      overflow: hidden;
    }
    .project-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg, ${statusColor} 0%, ${statusBg} 100%);
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label {
      font-size: 14px;
      color: #64748b;
      font-weight: 600;
    }
    .info-value {
      font-size: 14px;
      color: #1e293b;
      font-weight: 700;
    }
    .action-card {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 3px solid #fbbf24;
      border-radius: 16px;
      padding: 28px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
    }
    .action-item {
      display: flex;
      align-items: center;
      padding: 18px;
      background: white;
      border-radius: 12px;
      text-decoration: none;
      color: #1e293b;
      border: 2px solid #fed7aa;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }
    .footer {
      background: #1e293b;
      color: #94a3b8;
      padding: 40px 28px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="header">
      <div style="position: relative; z-index: 1;">
        <div style="font-size: 64px; margin-bottom: 16px;">${statusEmoji}</div>
        <div class="status-badge">
          Project ${statusText}
        </div>
        <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
          Rwanda Research Hub
        </h1>
      </div>
    </div>

    <div class="content">
      
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${project.author.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          ${isActivation 
            ? `Great news! Your research project has been <strong style="color: #10b981;">published</strong> and is now visible to the community. 🎉` 
            : `We're writing to inform you that your research project has been <strong style="color: #f59e0b;">archived</strong>.`
          }
        </p>
      </div>

      <div class="alert-box">
        <h3 style="color: ${statusColor}; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">${statusEmoji}</span>
          ${isActivation ? 'Project is Now Published' : 'Project is Now Archived'}
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          ${isActivation 
            ? `Your research project is now publicly accessible and searchable on the platform. Other researchers can view, like, and comment on your work.` 
            : `Your research project has been archived and is no longer publicly visible. You can still access it in your dashboard.`
          }
        </p>
      </div>

      ${!isActivation && reason ? `
      <div style="background: #fef2f2; border-left: 6px solid #dc2626; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h4 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">ℹ️</span>
          Reason for Archiving
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0;">
          ${reason}
        </p>
      </div>
      ` : ''}

      <div class="project-card">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 20px 0;">
          Project Information
        </h3>
        
        <div class="info-row">
          <span class="info-label">Project Title</span>
          <span class="info-value">${project.title}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Research Type</span>
          <span class="info-value">${project.research_type}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status</span>
          <span class="info-value">${project.status}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Visibility</span>
          <span class="info-value">${project.visibility}</span>
        </div>
        ${project.field_of_study ? `
        <div class="info-row">
          <span class="info-label">Field of Study</span>
          <span class="info-value">${project.field_of_study}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Views</span>
          <span class="info-value">${project.view_count}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Likes</span>
          <span class="info-value">${project.like_count}</span>
        </div>
      </div>

      <div style="height: 2px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 32px 0;"></div>

      <div class="action-card">
        <h4 style="color: #92400e; font-size: 18px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 24px;">🎯</span>
          ${isActivation ? 'What You Can Do Now' : 'Need Help?'}
        </h4>
        
        ${isActivation ? `
        <div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${project.id}" style="display: flex; align-items: center; padding: 18px; background: white; border-radius: 12px; text-decoration: none; color: #1e293b; border: 2px solid #fed7aa; margin-bottom: 12px;">
            <span style="margin-right: 16px; font-size: 24px;">👁️</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">View Your Published Project</strong>
              <span style="color: #64748b; font-size: 13px;">See how it appears to others</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/projects" style="display: flex; align-items: center; padding: 18px; background: white; border-radius: 12px; text-decoration: none; color: #1e293b; border: 2px solid #fed7aa; margin-bottom: 12px;">
            <span style="margin-right: 16px; font-size: 24px;">📊</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Manage Your Projects</strong>
              <span style="color: #64748b; font-size: 13px;">View analytics and engagement</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/create" style="display: flex; align-items: center; padding: 18px; background: white; border-radius: 12px; text-decoration: none; color: #1e293b; border: 2px solid #fed7aa;">
            <span style="margin-right: 16px; font-size: 24px;">➕</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Create New Project</strong>
              <span style="color: #64748b; font-size: 13px;">Share more research</span>
            </div>
          </a>
        </div>
        ` : `
        <div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" style="display: flex; align-items: center; padding: 18px; background: white; border-radius: 12px; text-decoration: none; color: #1e293b; border: 2px solid #fed7aa; margin-bottom: 12px;">
            <span style="margin-right: 16px; font-size: 24px;">💬</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Contact Support</strong>
              <span style="color: #64748b; font-size: 13px;">Get help from our team</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/projects" style="display: flex; align-items: center; padding: 18px; background: white; border-radius: 12px; text-decoration: none; color: #1e293b; border: 2px solid #fed7aa; margin-bottom: 12px;">
            <span style="margin-right: 16px; font-size: 24px;">📝</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">View Your Projects</strong>
              <span style="color: #64748b; font-size: 13px;">Manage all your research</span>
            </div>
          </a>
        </div>
        `}
      </div>

    </div>

    <div class="footer">
      <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">
        Rwanda Research Hub • Academic Collaboration Platform
      </p>
      <p style="margin: 0; color: #64748b; font-size: 12px;">
        📧 support@researchhub.rw • 📞 +250 XXX XXX XXX
      </p>
      <p style="margin: 20px 0 0 0; color: #475569; font-size: 11px;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }

  /**
   * Template for project deletion notification
   */
  static getDeletionTemplate(project: ResearchProject): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Project Deleted</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container { 
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .header { 
      background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
      padding: 48px 32px;
      text-align: center;
    }
    .status-badge {
      display: inline-block;
      background: #fee2e2;
      border: 3px solid #fecaca;
      color: #dc2626;
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content { padding: 48px 36px; }
    .alert-box {
      background: #fef2f2;
      border-left: 6px solid #dc2626;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
    }
    .project-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 3px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin: 32px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .footer {
      background: #1e293b;
      color: #94a3b8;
      padding: 40px 28px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="header">
      <div style="font-size: 64px; margin-bottom: 16px;">🚨</div>
      <div class="status-badge">
        Project Deleted
      </div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
        Rwanda Research Hub
      </h1>
    </div>

    <div class="content">
      
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${project.author.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          We're writing to inform you that your research project has been <strong style="color: #dc2626;">permanently deleted</strong> from Rwanda Research Hub.
        </p>
      </div>

      <div class="alert-box">
        <h3 style="color: #dc2626; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
          Project Permanently Deleted
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          Your research project and all associated data have been removed from our system. This action cannot be undone.
        </p>
      </div>

      <div class="project-card">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 20px 0;">
          Deleted Project Information
        </h3>
        
        <div class="info-row">
          <span style="font-size: 14px; color: #64748b; font-weight: 600;">Project Title</span>
          <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${project.title}</span>
        </div>
        <div class="info-row">
          <span style="font-size: 14px; color: #64748b; font-weight: 600;">Research Type</span>
          <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${project.research_type}</span>
        </div>
        <div class="info-row">
          <span style="font-size: 14px; color: #64748b; font-weight: 600;">Author</span>
          <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${project.author.first_name} ${project.author.last_name}</span>
        </div>
        <div class="info-row" style="border-bottom: none;">
          <span style="font-size: 14px; color: #64748b; font-weight: 600;">Deletion Date</span>
          <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div style="background: #fffbeb; border: 3px solid #fbbf24; border-radius: 16px; padding: 28px; margin: 28px 0;">
        <h4 style="color: #92400e; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 24px;">ℹ️</span>
          What This Means
        </h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          <li style="padding: 12px 0; color: #78350f; font-size: 14px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">•</span>
            <span>Your project is no longer accessible on the platform</span>
          </li>
          <li style="padding: 12px 0; color: #78350f; font-size: 14px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">•</span>
            <span>All likes, comments, and engagement data have been removed</span>
          </li>
          <li style="padding: 12px 0; color: #78350f; font-size: 14px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">•</span>
            <span>Project files and associated content have been deleted</span>
          </li>
          <li style="padding: 12px 0; color: #78350f; font-size: 14px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">•</span>
            <span>This action is permanent and cannot be undone</span>
          </li>
        </ul>
      </div>

      <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 16px; padding: 24px; margin: 28px 0;">
        <h4 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          📧 Questions or Concerns?
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          If you believe this was done in error or have questions, please contact our support team immediately.
        </p>
        <a href="mailto:support@researchhub.rw" style="display: inline-block; padding: 14px 28px; background: white; color: #dc2626; border: 2px solid #fecaca; border-radius: 10px; text-decoration: none; font-weight: 600;">
          Contact Support Team
        </a>
      </div>

      <div style="text-align: center; padding: 24px; background: #f8fafc; border-radius: 12px; margin-top: 32px;">
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0;">
          You can create new research projects anytime.<br>
          We're here to support your research journey.
        </p>
      </div>

    </div>

    <div class="footer">
      <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">
        Rwanda Research Hub • Academic Collaboration Platform
      </p>
      <p style="margin: 0; color: #64748b; font-size: 12px;">
        📧 support@researchhub.rw • 📞 +250 XXX XXX XXX
      </p>
      <p style="margin: 20px 0 0 0; color: #475569; font-size: 11px;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }
}