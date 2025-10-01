interface ProjectData {
  title: string;
  abstract: string;
  research_type: string;
  visibility: string;
  status: string;
  created_at: Date;
  view_count: number;
  like_count: number;
  comment_count: number;
  collaborator_count?: number;
  academic_level?: string;
  field_of_study?: string;
}

interface AuthorData {
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
}

interface AdminData {
  first_name: string;
  last_name: string;
  email: string;
}

export class DeleteResearchProjectTemplate {
  
  /**
   * Generate email template for project deletion notification
   */
  static getDeletionTemplate(
    projectData: ProjectData,
    authorData: AuthorData,
    reason?: string,
    adminData?: AdminData
  ): string {
    const formattedDate = new Date(projectData.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

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
        Hello ${authorData.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        We are writing to inform you that your research project has been permanently deleted from the Rwanda Research Hub platform.
      </div>
      
      <!-- Status Badge -->
      <span style="display: inline-block; background: #dc3545; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        🗑️ PERMANENTLY DELETED
      </span>
      
      <!-- Project Highlight -->
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">DELETED PROJECT</div>
        <div style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin-bottom: 10px;">${projectData.title}</div>
        <div style="color: #4a4a4a; font-size: 14px; line-height: 1.5;">${projectData.abstract.substring(0, 150)}${projectData.abstract.length > 150 ? '...' : ''}</div>
      </div>

      ${reason ? `
      <!-- Reason Box -->
      <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #721c24; font-weight: 600; font-size: 14px; margin-bottom: 8px;">📋 REASON FOR DELETION</div>
        <div style="color: #721c24; font-size: 14px; line-height: 1.5;">${reason}</div>
      </div>
      ` : ''}
      
      ${adminData ? `
      <div style="background: #e2e3e5; border-left: 4px solid #6c757d; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #383d41; font-weight: 600; font-size: 14px; margin-bottom: 8px;">👤 ACTION PERFORMED BY</div>
        <div style="color: #383d41; font-size: 14px; line-height: 1.5;">
          ${adminData.first_name} ${adminData.last_name} (${adminData.email})
        </div>
      </div>
      ` : ''}
      
      <!-- Project Statistics -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="color: #495057; font-weight: 600; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          📊 PROJECT STATISTICS AT TIME OF DELETION
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
          <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
            <div style="color: #0158B7; font-size: 20px; font-weight: bold;">${projectData.view_count}</div>
            <div style="color: #6c757d; font-size: 11px;">Views</div>
          </div>
          <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
            <div style="color: #0158B7; font-size: 20px; font-weight: bold;">${projectData.like_count}</div>
            <div style="color: #6c757d; font-size: 11px;">Likes</div>
          </div>
          <div style="background: white; padding: 12px; border-radius: 6px; text-align: center;">
            <div style="color: #0158B7; font-size: 20px; font-weight: bold;">${projectData.comment_count}</div>
            <div style="color: #6c757d; font-size: 11px;">Comments</div>
          </div>
        </div>
        ${projectData.collaborator_count ? `
        <div style="text-align: center; margin-top: 5px;">
          <span style="background: #0158B7; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
            ${projectData.collaborator_count} Collaborator${projectData.collaborator_count !== 1 ? 's' : ''}
          </span>
        </div>
        ` : ''}
      </div>
      
      <!-- Project Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
          <div style="color: #495057; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            📌 Research Type
          </div>
          <div style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${projectData.research_type}</div>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
          <div style="color: #495057; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            🔧 Visibility
          </div>
          <div style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${projectData.visibility}</div>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
          <div style="color: #495057; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            🎓 Academic Level
          </div>
          <div style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${projectData.academic_level || 'Not specified'}</div>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
          <div style="color: #495057; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            📚 Field of Study
          </div>
          <div style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${projectData.field_of_study || 'Not specified'}</div>
        </div>
      </div>
      
      <!-- Important Information -->
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-weight: 600; font-size: 14px; margin-bottom: 8px;">⚠️ IMPORTANT INFORMATION</div>
        <div style="color: #856404; font-size: 14px; line-height: 1.5;">
          <ul style="margin: 0; padding-left: 20px;">
            <li>All project files, documents, and attachments have been permanently deleted</li>
            <li>All comments and likes associated with this project have been removed</li>
            <li>Collaboration requests and contributions have been deleted</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      </div>
      
      <!-- Next Steps -->
      <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #0c5460; font-weight: 600; font-size: 15px; margin-bottom: 12px;">💡 What You Can Do Now</div>
        <ul style="color: #0c5460; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>Review our project guidelines before creating a new project</li>
          <li>Contact support if you have questions about this deletion</li>
          <li>Create a new research project that aligns with platform standards</li>
          <li>Explore other research projects in your field</li>
        </ul>
      </div>
      
      <!-- Action Buttons -->
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/create" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 0 5px 10px 5px;">
          ➕ Create New Project
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" 
           style="display: inline-block; background: white; color: #0158B7; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 2px solid #0158B7; margin: 0 5px 10px 5px;">
          📞 Contact Support
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects" 
           style="display: inline-block; background: white; color: #0158B7; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 2px solid #0158B7; margin: 0 5px 10px 5px;">
          🔍 Explore Projects
        </a>
      </div>
      
      <div style="height: 1px; background: #e9ecef; margin: 25px 0;"></div>
      
      <!-- Support Section -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin-top: 20px; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 12px;">📧 Need Assistance?</div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5; margin-bottom: 15px;">
          If you believe this deletion was made in error or if you have questions about the decision, please contact our support team.
        </div>
        <a href="mailto:support@ongera.com" 
           style="display: inline-block; background: #f8f9fa; color: #0158B7; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 1px solid #dee2e6;">
          Email Support Team
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
    `;
  }
}