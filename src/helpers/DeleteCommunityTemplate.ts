interface CommunityData {
  name: string;
  description: string;
  category: string;
  community_type: string;
  cover_image_url?: string;
  community_id: string;
  member_count: number;
  post_count: number;
  created_at: Date;
}

interface CreatorData {
  first_name: string;
  email: string;
  last_name?: string;
}

export class DeleteCommunityTemplate {
  
  /**
   * Generate email template for community deletion notification
   */
  static getDeletionTemplate(
    communityData: CommunityData,
    creatorData: CreatorData,
    reason?: string,
    deletedBy?: string
  ): string {
    const formattedDate = new Date(communityData.created_at).toLocaleDateString('en-US', {
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
  <title>Community Deleted</title>
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
        Hello ${creatorData.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        We are writing to inform you that your community has been permanently deleted from the Rwanda Research Hub platform.
      </div>
      
      <!-- Status Badge -->
      <span style="display: inline-block; background: #dc3545; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        🗑️ PERMANENTLY DELETED
      </span>
      
      <!-- Community Highlight -->
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">DELETED COMMUNITY</div>
        <div style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin-bottom: 12px;">${communityData.name}</div>
        <div style="color: #4a4a4a; font-size: 14px; line-height: 1.5;">${communityData.description || 'No description provided.'}</div>
      </div>

      ${reason ? `
      <!-- Reason Box -->
      <div style="background: #f8d7da; border-left: 4px solid #dc3545; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #721c24; font-weight: 600; font-size: 14px; margin-bottom: 8px;">📋 REASON FOR DELETION</div>
        <div style="color: #721c24; font-size: 14px; line-height: 1.5;">${reason}</div>
      </div>
      ` : ''}
      
      ${deletedBy ? `
      <div style="background: #e2e3e5; border-left: 4px solid #6c757d; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #383d41; font-weight: 600; font-size: 14px; margin-bottom: 8px;">👤 ACTION PERFORMED BY</div>
        <div style="color: #383d41; font-size: 14px; line-height: 1.5;">${deletedBy}</div>
      </div>
      ` : ''}
      
      <!-- Community Statistics -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="color: #495057; font-weight: 600; font-size: 14px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          📊 COMMUNITY STATISTICS AT TIME OF DELETION
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="color: #0158B7; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${communityData.member_count}</div>
            <div style="color: #6c757d; font-size: 12px;">Members</div>
          </div>
          <div style="background: white; padding: 15px; border-radius: 6px; text-align: center;">
            <div style="color: #0158B7; font-size: 24px; font-weight: bold; margin-bottom: 5px;">${communityData.post_count}</div>
            <div style="color: #6c757d; font-size: 12px;">Posts</div>
          </div>
        </div>
        <div style="margin-top: 15px; color: #6c757d; font-size: 13px; text-align: center;">
          Created on: ${formattedDate}
        </div>
      </div>
      
      <!-- Community Details -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
          <div style="color: #495057; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            📌 Category
          </div>
          <div style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${communityData.category}</div>
        </div>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #e9ecef;">
          <div style="color: #495057; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            🔧 Type
          </div>
          <div style="color: #1a1a1a; font-size: 14px; font-weight: 600;">${communityData.community_type}</div>
        </div>
      </div>
      
      <!-- Important Information -->
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-weight: 600; font-size: 14px; margin-bottom: 8px;">⚠️ IMPORTANT INFORMATION</div>
        <div style="color: #856404; font-size: 14px; line-height: 1.5;">
          <ul style="margin: 0; padding-left: 20px;">
            <li>All posts, discussions, and member data associated with this community have been permanently deleted</li>
            <li>This action cannot be undone</li>
            <li>All members have been removed and can no longer access this community</li>
            <li>Any projects linked to this community have been unlinked</li>
          </ul>
        </div>
      </div>
      
      <!-- Next Steps -->
      <div style="background: #d1ecf1; border-left: 4px solid #0c5460; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #0c5460; font-weight: 600; font-size: 15px; margin-bottom: 12px;">💡 What You Can Do Now</div>
        <ul style="color: #0c5460; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li>Review our community guidelines before creating a new community</li>
          <li>Contact support if you have questions about this deletion</li>
          <li>Create a new community that aligns with our platform standards</li>
          <li>Join existing communities in your research area</li>
        </ul>
      </div>
      
      <!-- Action Buttons -->
      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/create" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 0 5px 10px 5px;">
          ➕ Create New Community
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" 
           style="display: inline-block; background: white; color: #0158B7; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 2px solid #0158B7; margin: 0 5px 10px 5px;">
          📞 Contact Support
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities" 
           style="display: inline-block; background: white; color: #0158B7; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 2px solid #0158B7; margin: 0 5px 10px 5px;">
          🔍 Explore Communities
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
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px; margin-bottom: 8px;">
        📧 support@researchhub.rw • 📞 +250 XXX XXX XXX
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