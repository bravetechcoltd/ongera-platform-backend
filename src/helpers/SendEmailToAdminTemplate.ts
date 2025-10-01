interface CommunityData {
  name: string;
  description: string;
  category: string;
  community_type: string;
  cover_image_url?: string;
  creator: {
    first_name: string;
    last_name: string;
    email: string;
    profile?: {
      institution_name?: string;
    };
  };
  community_id: string;
  created_at: Date;
}

interface AdminData {
  first_name: string;
  email: string;
}

export class SendEmailToAdminTemplate {
  static getNewCommunityNotification(
    communityData: CommunityData,
    adminData: AdminData
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Community Awaiting Approval</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      padding: 48px 32px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
      background-size: 50px 50px;
      animation: grid-move 20s linear infinite;
    }
    @keyframes grid-move {
      0% { transform: translate(0, 0); }
      100% { transform: translate(50px, 50px); }
    }
    .badge {
      display: inline-block;
      background: #fef3c7;
      border: 3px solid #fde68a;
      color: #92400e;
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
    }
    .content { 
      padding: 48px 36px;
      background: #ffffff;
    }
    .alert-box {
      background: #fef3c7;
      border-left: 6px solid #f59e0b;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
    }
    .community-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 3px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin: 32px 0;
      position: relative;
      overflow: hidden;
    }
    .community-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
    }
    .cover-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 16px;
      margin-bottom: 20px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin: 24px 0;
    }
    .info-item {
      background: white;
      padding: 20px;
      border-radius: 12px;
      border: 2px solid #e2e8f0;
      text-align: center;
    }
    .info-icon {
      font-size: 28px;
      margin-bottom: 8px;
      display: block;
    }
    .info-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .info-value {
      font-size: 16px;
      color: #1e293b;
      font-weight: 700;
      margin-top: 4px;
    }
    .creator-box {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin: 20px 0;
      border: 2px solid #e2e8f0;
    }
    .btn-approve {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 18px 40px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 8px;
    }
    .btn-approve:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(16, 185, 129, 0.4);
    }
    .btn-reject {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 18px 40px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 8px;
    }
    .btn-reject:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(239, 68, 68, 0.4);
    }
    .btn-view {
      display: inline-block;
      background: white;
      color: #334155;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      border: 3px solid #e2e8f0;
      transition: all 0.3s ease;
      margin: 8px;
    }
    .btn-view:hover {
      border-color: #667eea;
      color: #667eea;
      background: #f7faff;
    }
    .footer {
      background: #1e293b;
      color: #94a3b8;
      padding: 40px 28px;
      text-align: center;
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 32px 0;
    }
    @media only screen and (max-width: 600px) {
      .container { border-radius: 16px; }
      .content { padding: 32px 24px !important; }
      .header { padding: 36px 24px !important; }
      .info-grid { grid-template-columns: 1fr; }
      .btn-approve, .btn-reject, .btn-view { 
        display: block; 
        width: 100%; 
        margin: 8px 0; 
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <div class="header">
      <div style="position: relative; z-index: 1;">
        <div style="font-size: 64px; margin-bottom: 16px;">⏳</div>
        <div class="badge">
          Pending Approval
        </div>
        <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0; letter-spacing: -1px;">
          New Community Created
        </h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      
      <!-- Greeting -->
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${adminData.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          A new community has been created and is awaiting your review and approval.
        </p>
      </div>

      <!-- Alert Box -->
      <div class="alert-box">
        <h3 style="color: #92400e; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
          Action Required
        </h3>
        <p style="color: #78350f; font-size: 14px; line-height: 1.7; margin: 0;">
          Please review the community details below and decide whether to approve or reject this community. The creator will be notified of your decision.
        </p>
      </div>

      <!-- Community Card -->
      <div class="community-card">
        ${communityData.cover_image_url ? `
        <img src="${communityData.cover_image_url}" alt="${communityData.name}" class="cover-image">
        ` : ''}
        
        <h3 style="color: #1e293b; font-size: 24px; font-weight: 800; margin: 0 0 12px 0;">
          ${communityData.name}
        </h3>
        
        <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0;">
          ${communityData.description}
        </p>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-icon">🏷️</span>
            <div class="info-label">Category</div>
            <div class="info-value">${communityData.category}</div>
          </div>
          <div class="info-item">
            <span class="info-icon">🔒</span>
            <div class="info-label">Type</div>
            <div class="info-value">${communityData.community_type}</div>
          </div>
        </div>

        <!-- Creator Info -->
        <div class="creator-box">
          <h4 style="color: #1e293b; font-size: 16px; font-weight: 700; margin: 0 0 16px 0; display: flex; align-items: center;">
            <span style="font-size: 20px; margin-right: 10px;">👤</span>
            Created By
          </h4>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="flex: 1;">
              <p style="color: #1e293b; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">
                ${communityData.creator.first_name} ${communityData.creator.last_name}
              </p>
              <p style="color: #64748b; font-size: 14px; margin: 0 0 4px 0;">
                📧 ${communityData.creator.email}
              </p>
              ${communityData.creator.profile?.institution_name ? `
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                🏛️ ${communityData.creator.profile.institution_name}
              </p>
              ` : ''}
            </div>
          </div>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 20px;">
          <p style="color: #64748b; font-size: 12px; margin: 0;">
            <strong>Created:</strong> ${new Date(communityData.created_at).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 40px 0;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 24px 0;">
          What would you like to do?
        </h3>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/communities/pending" class="btn-view">
            👁️ View in Admin Panel
          </a>
        </div>

        <div style="margin: 28px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/communities/${communityData.community_id}/approve" class="btn-approve">
            ✅ Approve Community
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/communities/${communityData.community_id}/reject" class="btn-reject">
            ❌ Reject Community
          </a>
        </div>
      </div>

      <!-- Important Note -->
      <div style="background: #eff6ff; border-left: 6px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 28px 0;">
        <h4 style="color: #1e40af; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">💡</span>
          Review Guidelines
        </h4>
        <ul style="color: #1e3a8a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Verify the community name and description are appropriate</li>
          <li>Check if the category matches the community purpose</li>
          <li>Ensure content aligns with platform guidelines</li>
          <li>Verify creator credentials if necessary</li>
        </ul>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <div style="margin: 32px 0;">
        <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
          Rwanda Research Hub Admin
        </p>
        <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
          Academic Collaboration Platform
        </p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          📧 admin@researchhub.rw • 📞 +250 XXX XXX XXX
        </p>
      </div>

      <p style="margin: 20px 0 0 0; color: #475569; font-size: 11px;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.<br>
        This is an automated admin notification.
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }
}