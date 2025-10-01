"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivateDeactivateDeleteResearchProjectsTemplate = void 0;
class ActivateDeactivateDeleteResearchProjectsTemplate {
    /**
     * Template for project activation/deactivation (Published/Archived)
     */
    static getStatusChangeTemplate(project, isActivation, reason) {
        const statusText = isActivation ? 'Published' : 'Archived';
        const statusBadge = isActivation ? 'PUBLISHED' : 'ARCHIVED';
        const statusColor = isActivation ? '#28a745' : '#ffc107';
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Project ${statusText}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hello ${project.author.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        ${isActivation
            ? 'Great news! Your research project has been published and is now visible to the community.'
            : 'We are writing to inform you that your research project has been archived.'}
      </div>
      
      <span style="display: inline-block; background: ${statusColor}; color: ${isActivation ? 'white' : '#000'}; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        ${statusBadge}
      </span>
      
      <!-- Highlight Box -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">PROJECT STATUS UPDATE</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${project.title}</div>
      </div>
      
      <!-- Project Details -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          PROJECT INFORMATION
        </div>
        <div style="color: #212529; font-size: 15px;">
          <strong>Research Type:</strong> ${project.research_type}<br>
          <strong>Status:</strong> ${project.status}<br>
          <strong>Visibility:</strong> ${project.visibility}<br>
          ${project.field_of_study ? `<strong>Field of Study:</strong> ${project.field_of_study}<br>` : ''}
          <strong>Views:</strong> ${project.view_count}<br>
          <strong>Likes:</strong> ${project.like_count}
        </div>
      </div>
      
      ${!isActivation && reason ? `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-weight: 600; font-size: 14px; margin-bottom: 8px;">REASON FOR ARCHIVING</div>
        <div style="color: #856404; font-size: 15px;">${reason}</div>
      </div>
      ` : ''}
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        ${isActivation
            ? 'Your research project is now publicly accessible and searchable on the platform. Other researchers can view, like, and comment on your work.'
            : 'Your research project is no longer publicly visible. You can still access it in your dashboard.'}
      </div>
      
      <!-- Action Button -->
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${project.id}" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        View Project
      </a>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        Manage all your research projects from your dashboard.
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Ongera Platform</strong><br>
        Connecting Researchers & Academics Worldwide
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        © ${new Date().getFullYear()} Ongera. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
    `;
    }
    /**
     * Template for project deletion notification
     */
    static getDeletionTemplate(project) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Research Project Deleted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hello ${project.author.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        We are writing to inform you that your research project has been permanently deleted from Ongera Platform.
      </div>
      
      <span style="display: inline-block; background: #dc3545; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        DELETED
      </span>
      
      <!-- Highlight Box -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">DELETED PROJECT</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${project.title}</div>
      </div>
      
      <!-- Project Details -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          DELETED PROJECT INFORMATION
        </div>
        <div style="color: #212529; font-size: 15px;">
          <strong>Project Title:</strong> ${project.title}<br>
          <strong>Research Type:</strong> ${project.research_type}<br>
          <strong>Author:</strong> ${project.author.first_name} ${project.author.last_name}<br>
          <strong>Deletion Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>
      
      <!-- Info Box -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin-top: 20px; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">ℹ️ What This Means</div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5;">
          • Your project is no longer accessible on the platform<br>
          • All likes, comments, and engagement data have been removed<br>
          • Project files and associated content have been deleted<br>
          • This action is permanent and cannot be undone
        </div>
      </div>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <!-- Support Box -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin-top: 20px; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">📧 Questions or Concerns?</div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5;">
          If you believe this was done in error or have questions, please contact our support team at support@ongera.com
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Ongera Platform</strong><br>
        Connecting Researchers & Academics Worldwide
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        © ${new Date().getFullYear()} Ongera. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
    `;
    }
}
exports.ActivateDeactivateDeleteResearchProjectsTemplate = ActivateDeactivateDeleteResearchProjectsTemplate;
