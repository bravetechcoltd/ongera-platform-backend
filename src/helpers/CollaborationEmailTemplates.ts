import { ResearchProject } from "../database/models/ResearchProject";
import { User } from "../database/models/User";
import { CollaborationRequest } from "../database/models/CollaborationRequest";
import { ProjectContribution } from "../database/models/ProjectContribution";

/**
 * Collaboration Email Templates
 * Maintains same design standards as existing templates
 */
export class CollaborationEmailTemplates {
  
  /**
   * Email sent to project creator when someone requests to collaborate
   */


  // Add to CollaborationEmailTemplates class

/**
 * Email sent to contributor when their contribution is approved
 */
static getContributionApprovedTemplate(
  project: ResearchProject,
  contributor: User,
  contribution: ProjectContribution
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contribution Approved</title>
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
        Hello ${contributor.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Great news! Your contribution has been approved by the project owner and is now visible to everyone.
      </div>
      
      <span style="display: inline-block; background: #28a745; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        CONTRIBUTION APPROVED
      </span>
      
      <!-- Project Info -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">PROJECT</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${project.title}</div>
      </div>
      
      <!-- Contribution Details -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          YOUR CONTRIBUTION
        </div>
        <div style="color: #212529; font-size: 15px; line-height: 1.8;">
          <div style="margin: 8px 0;">
            <strong>Title:</strong> ${contribution.contribution_title}
          </div>
          ${contribution.contribution_section ? `
          <div style="margin: 8px 0;">
            <strong>Section:</strong> ${contribution.contribution_section}
          </div>
          ` : ''}
          <div style="margin: 8px 0;">
            <strong>Status:</strong> <span style="color: #28a745; font-weight: 600;">Approved & Published</span>
          </div>
        </div>
      </div>
      
      <!-- Preview -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin: 20px 0; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">CONTRIBUTION PREVIEW</div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5; max-height: 120px; overflow: hidden; position: relative;">
          ${contribution.contribution_content.substring(0, 200)}...
          <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(transparent, white);"></div>
        </div>
      </div>
      
      <!-- Action Button -->
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${project.id}?tab=contributions" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        View Your Contribution
      </a>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        Thank you for contributing to the research community! Your work is now helping others learn and grow.
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

  static getCollaborationRequestTemplate(
    project: ResearchProject,
    requester: User,
    request: CollaborationRequest
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Collaboration Request</title>
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
        Great news! A researcher is interested in contributing to your project. Review their request below.
      </div>
      
      <span style="display: inline-block; background: #0158B7; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        NEW COLLABORATION REQUEST
      </span>
      
      <!-- Project Info -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">YOUR PROJECT</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${project.title}</div>
      </div>
      
      <!-- Requester Info -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          REQUESTER INFORMATION
        </div>
        <div style="color: #212529; font-size: 15px; line-height: 1.8;">
          <div style="margin: 8px 0;">
            <strong>Name:</strong> ${requester.first_name} ${requester.last_name}
          </div>
          <div style="margin: 8px 0;">
            <strong>Email:</strong> ${requester.email}
          </div>
          ${requester.profile?.institution_name ? `
          <div style="margin: 8px 0;">
            <strong>Institution:</strong> ${requester.profile.institution_name}
          </div>
          ` : ''}
          ${requester.profile?.department ? `
          <div style="margin: 8px 0;">
            <strong>Department:</strong> ${requester.profile.department}
          </div>
          ` : ''}
        </div>
      </div>
      
      ${request.expertise ? `
      <!-- Expertise -->
      <div style="background: #E3F2FD; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">EXPERTISE & SKILLS</div>
        <div style="color: #212529; font-size: 15px;">${request.expertise}</div>
      </div>
      ` : ''}
      
      <!-- Reason for Collaboration -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin: 20px 0; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">WHY THEY WANT TO CONTRIBUTE</div>
        <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6;">${request.reason}</div>
      </div>
      
      <!-- Action Buttons -->
      <div style="margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${project.id}/collaboration-requests" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin-right: 10px;">
          Review Request
        </a>
      </div>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        You can approve or reject this collaboration request from your project dashboard.
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
   * Email sent to requester when their collaboration request is approved
   */
  static getRequestApprovedTemplate(
    project: ResearchProject,
    requester: User
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Request Approved</title>
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
        Hello ${requester.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Excellent news! Your collaboration request has been approved. You can now start contributing to the project.
      </div>
      
      <span style="display: inline-block; background: #28a745; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        REQUEST APPROVED
      </span>
      
      <!-- Project Info -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">PROJECT DETAILS</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600; line-height: 1.4;">${project.title}</div>
      </div>
      
      <!-- Project Info -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          PROJECT INFORMATION
        </div>
        <div style="color: #212529; font-size: 15px; line-height: 1.8;">
          <div style="margin: 8px 0;">
            <strong>Project Creator:</strong> ${project.author.first_name} ${project.author.last_name}
          </div>
          <div style="margin: 8px 0;">
            <strong>Research Type:</strong> ${project.research_type}
          </div>
          <div style="margin: 8px 0;">
            <strong>Field of Study:</strong> ${project.field_of_study || 'N/A'}
          </div>
        </div>
      </div>
      
      <!-- Next Steps -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin: 20px 0; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">🚀 NEXT STEPS</div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5;">
          • Access the project and review existing content<br>
          • Add your contributions through the contribution form<br>
          • Collaborate with the project creator and other contributors<br>
          • Your contributions will be reviewed before being published
        </div>
      </div>
      
      <!-- Action Button -->
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects/${project.id}/contribute" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        Start Contributing
      </a>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        Welcome aboard! We're excited to see your contributions to this research project.
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
   * Email sent to requester when their collaboration request is rejected
   */
  static getRequestRejectedTemplate(
    project: ResearchProject,
    requester: User,
    rejectionReason?: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collaboration Request Status</title>
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
        Hello ${requester.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Thank you for your interest in contributing to this research project. After review, the project creator has decided not to accept collaboration at this time.
      </div>
      
      <span style="display: inline-block; background: #6c757d; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        REQUEST NOT ACCEPTED
      </span>
      
      <!-- Project Info -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">PROJECT</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${project.title}</div>
      </div>
      
      ${rejectionReason ? `
      <!-- Rejection Reason -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          MESSAGE FROM PROJECT CREATOR
        </div>
        <div style="color: #212529; font-size: 15px;">${rejectionReason}</div>
      </div>
      ` : ''}
      
      <!-- Encouragement -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin: 20px 0; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">💡 KEEP EXPLORING</div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5;">
          Don't be discouraged! There are many other research projects seeking collaborators. Browse our platform to find projects that match your expertise and interests.
        </div>
      </div>
      
      <!-- Action Button -->
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/projects?collaboration_status=Seeking Collaborators" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        Find Other Projects
      </a>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        Thank you for your understanding and continued engagement with the research community.
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