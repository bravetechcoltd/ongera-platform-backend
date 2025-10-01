interface CommunityData {
  name: string;
  description: string;
  category: string;
  community_type: string;
  cover_image_url?: string;
  community_id: string;
}

interface CreatorData {
  first_name: string;
  email: string;
}

export class ApproveRejectCommunityToCreatorTemplate {
  
  /**
   * Generate email template for community approval notification
   */
  static getApprovalTemplate(
    communityData: CommunityData,
    creatorData: CreatorData
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Approved!</title>
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
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
      background: #d1fae5;
      border: 3px solid #6ee7b7;
      color: #065f46;
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
    .content { padding: 48px 36px; background: #ffffff; }
    .success-box {
      background: #d1fae5;
      border-left: 6px solid #10b981;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
    }
    .community-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 3px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin: 32px 0;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .community-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
    }
    .community-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 6px;
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
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
      transition: all 0.3s ease;
    }
    .info-item:hover {
      border-color: #10b981;
      transform: translateY(-2px);
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
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 18px 40px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 8px;
    }
    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
    }
    .action-card {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 3px solid #93c5fd;
      border-radius: 16px;
      padding: 28px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }
    .action-item {
      display: flex;
      align-items: center;
      padding: 18px;
      background: white;
      border-radius: 12px;
      text-decoration: none;
      color: #1e293b;
      border: 2px solid #e0f2fe;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }
    .action-item:hover {
      border-color: #10b981;
      transform: translateX(6px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 32px 0;
    }
    .tips-box {
      background: #fef3c7;
      border-left: 6px solid #f59e0b;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
    }
    .footer {
      background: #1e293b;
      color: #94a3b8;
      padding: 40px 28px;
      text-align: center;
    }
    .support-box {
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
      backdrop-filter: blur(10px);
    }
    .guidelines-box {
      background: #fef3c7;
      border-left: 6px solid #f59e0b;
      border-radius: 12px;
      padding: 28px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
    }
    @media only screen and (max-width: 600px) {
      .container { border-radius: 16px; }
      .content { padding: 32px 24px !important; }
      .header { padding: 36px 24px !important; }
      .btn-primary, .btn-secondary { 
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
        <div style="font-size: 72px; margin-bottom: 16px;">✅</div>
        <div class="badge">Approved</div>
        <h1 style="color: white; font-size: 32px; font-weight: 800; margin: 20px 0 0 0; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          Community Approved!
        </h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      
      <!-- Greeting -->
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 16px; font-weight: 700;">
          Hi ${creatorData.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8; margin-bottom: 12px;">
          Great news! Your community application has been reviewed and approved by our admin team.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          Your community <strong style="color: #10b981;">"${communityData.name}"</strong> is now live and accessible to all Rwanda Research Hub members.
        </p>
      </div>

      <!-- Success Box -->
      <div class="success-box">
        <h3 style="color: #065f46; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 28px; margin-right: 12px;">🎉</span>
          Congratulations!
        </h3>
        <p style="color: #047857; font-size: 15px; line-height: 1.8; margin: 0;">
          Your community is now officially part of the Rwanda Research Hub platform. Start engaging with members and building your academic community!
        </p>
      </div>

      <!-- Community Card -->
      <div class="community-card">
        <h3 style="color: #1e293b; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
          ${communityData.name}
        </h3>
        
        <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0; line-height: 1.7;">
          ${communityData.description}
        </p>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div style="background: white; padding: 16px; border-radius: 8px; border: 2px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Category</div>
            <div style="font-size: 15px; color: #1e293b; font-weight: 700;">${communityData.category}</div>
          </div>
          <div style="background: white; padding: 16px; border-radius: 8px; border: 2px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Type</div>
            <div style="font-size: 15px; color: #1e293b; font-weight: 700;">${communityData.community_type}</div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 40px 0;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 24px 0;">
          Manage Your Community
        </h3>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${communityData.community_id}" class="btn-primary">
            🚀 View Community
          </a>
        </div>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${communityData.community_id}/manage" class="btn-secondary">
            ⚙️ Manage Settings
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${communityData.community_id}/invite" class="btn-secondary">
            👥 Invite Members
          </a>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="support-box">
        <h4 style="color: #e2e8f0; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
          📞 Need Help Managing Your Community?
        </h4>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          Our support team is here to help you succeed in building and managing your community.
        </p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" style="display: inline-block; background: rgba(255,255,255,0.1); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid rgba(255,255,255,0.2); transition: all 0.3s ease;">
          Contact Support Team
        </a>
      </div>

      <div style="margin-top: 28px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 16px; line-height: 1.6; font-weight: 600;">
          Rwanda Research Hub
        </p>
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
          Building Rwanda's Academic Community Together
        </p>
        <p style="margin: 0; color: #64748b; font-size: 13px;">
          📧 support@researchhub.rw • 📞 +250 XXX XXX XXX
        </p>
      </div>
    </div>

  </div>
</body>
</html>
    `;
  }

  static getRejectionTemplate(
    communityData: CommunityData,
    creatorData: CreatorData,
    reason?: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Application Update</title>
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
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
      background: #fee2e2;
      border: 3px solid #fecaca;
      color: #991b1b;
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
    }
    .content { padding: 48px 36px; background: #ffffff; }
    .alert-box {
      background: #fee2e2;
      border-left: 6px solid #ef4444;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
    }
    .reason-box {
      background: #fef2f2;
      border: 3px solid #fecaca;
      border-radius: 12px;
      padding: 28px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
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
      background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
    }
    .btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 18px 40px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 8px;
    }
    .btn-primary:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
    }
    .btn-secondary {
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
    .btn-secondary:hover {
      border-color: #667eea;
      color: #667eea;
      background: #f7faff;
      transform: translateY(-2px);
    }
    .info-box {
      background: #dbeafe;
      border-left: 6px solid #3b82f6;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 32px 0;
    }
    .footer {
      background: #1e293b;
      color: #94a3b8;
      padding: 40px 28px;
      text-align: center;
    }
    .support-box {
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      margin: 24px 0;
      backdrop-filter: blur(10px);
    }
    .guidelines-box {
      background: #fef3c7;
      border-left: 6px solid #f59e0b;
      border-radius: 12px;
      padding: 28px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
    }
    @media only screen and (max-width: 600px) {
      .container { border-radius: 16px; }
      .content { padding: 32px 24px !important; }
      .header { padding: 36px 24px !important; }
      .btn-primary, .btn-secondary { 
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
        <div style="font-size: 72px; margin-bottom: 16px;">❌</div>
        <div class="badge">Not Approved</div>
        <h1 style="color: white; font-size: 32px; font-weight: 800; margin: 20px 0 0 0; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          Community Application Update
        </h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      
      <!-- Greeting -->
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 16px; font-weight: 700;">
          Hi ${creatorData.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8; margin-bottom: 12px;">
          Thank you for your interest in creating a community on Rwanda Research Hub and for taking the time to submit your application.
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          After careful review by our admin team, we regret to inform you that your community <strong style="color: #ef4444;">"${communityData.name}"</strong> was not approved at this time.
        </p>
      </div>

      <!-- Alert Box -->
      <div class="alert-box">
        <h3 style="color: #991b1b; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 28px; margin-right: 12px;">⚠️</span>
          Application Not Approved
        </h3>
        <p style="color: #7f1d1d; font-size: 15px; line-height: 1.8; margin: 0;">
          Your community application does not meet our current community guidelines and platform standards. Please review the feedback below and consider making improvements before resubmitting.
        </p>
      </div>

      ${reason ? `
      <!-- Reason Box -->
      <div class="reason-box">
        <h4 style="color: #991b1b; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 10px;">📋</span>
          Reason for Rejection
        </h4>
        <div style="background: white; border-radius: 8px; padding: 20px; border: 2px solid #fecaca;">
          <p style="color: #7f1d1d; font-size: 15px; line-height: 1.8; margin: 0; font-weight: 500;">
            ${reason}
          </p>
        </div>
      </div>
      ` : `
      <!-- No Reason Provided -->
      <div class="reason-box">
        <h4 style="color: #991b1b; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 10px;">ℹ️</span>
          Additional Information
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.8; margin: 0;">
          For specific details about why your application was not approved, please contact our support team. We're here to help you understand and improve your submission.
        </p>
      </div>
      `}

      <!-- Community Card -->
      <div class="community-card">
        <h3 style="color: #1e293b; font-size: 22px; font-weight: 700; margin: 0 0 12px 0;">
          ${communityData.name}
        </h3>
        
        <p style="color: #64748b; font-size: 14px; margin: 0 0 20px 0; line-height: 1.7;">
          ${communityData.description}
        </p>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div style="background: white; padding: 16px; border-radius: 8px; border: 2px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Category</div>
            <div style="font-size: 15px; color: #1e293b; font-weight: 700;">${communityData.category}</div>
          </div>
          <div style="background: white; padding: 16px; border-radius: 8px; border: 2px solid #e2e8f0;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Type</div>
            <div style="font-size: 15px; color: #1e293b; font-weight: 700;">${communityData.community_type}</div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- What You Can Do Next -->
      <div class="info-box">
        <h4 style="color: #1e40af; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 10px;">💡</span>
          What You Can Do Next
        </h4>
        <ul style="color: #1e3a8a; font-size: 15px; line-height: 2; margin: 0; padding-left: 24px;">
          <li><strong>Review our community guidelines</strong> - Understand platform requirements</li>
          <li><strong>Revise your community description</strong> - Make it clear and compelling</li>
          <li><strong>Ensure content aligns with academic standards</strong> - Professional focus</li>
          <li><strong>Check category and type settings</strong> - Verify they're appropriate</li>
          <li><strong>Submit a new application</strong> - Try again with improvements</li>
          <li><strong>Contact support for guidance</strong> - Get personalized assistance</li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin: 40px 0;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 24px 0;">
          Ready to Try Again?
        </h3>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/create" class="btn-primary">
            🔄 Create New Community
          </a>
        </div>
        
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" class="btn-secondary">
            💬 Contact Support Team
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities" class="btn-secondary">
            🔍 Explore Communities
          </a>
        </div>
      </div>

      <!-- Guidelines Box -->
      <div class="guidelines-box">
        <h4 style="color: #92400e; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 10px;">📚</span>
          Community Guidelines & Best Practices
        </h4>
        <p style="color: #78350f; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
          Before creating a new community, please review our comprehensive guidelines to ensure your application meets all requirements:
        </p>
        
        <div style="background: white; border-radius: 12px; padding: 20px; margin-top: 16px; border: 2px solid #fde68a;">
          <h5 style="color: #92400e; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
            ✅ Communities Should:
          </h5>
          <ul style="color: #78350f; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Promote academic collaboration and research sharing</li>
            <li>Have clear, appropriate names and descriptions</li>
            <li>Focus on professional networking and learning</li>
            <li>Follow platform content policies</li>
            <li>Provide value to the academic community</li>
            <li>Have proper categorization</li>
          </ul>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; margin-top: 12px; border: 2px solid #fde68a;">
          <h5 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
            ❌ Communities Should NOT:
          </h5>
          <ul style="color: #7f1d1d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li>Contain inappropriate or offensive content</li>
            <li>Duplicate existing communities</li>
            <li>Be overly promotional or commercial</li>
            <li>Violate academic integrity standards</li>
            <li>Have vague or misleading descriptions</li>
            <li>Target non-academic purposes</li>
          </ul>
        </div>

        <div style="margin-top: 20px; text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/guidelines" style="display: inline-block; color: #d97706; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 24px; background: white; border-radius: 8px; border: 2px solid #fbbf24; transition: all 0.3s ease;">
            📖 Read Full Community Guidelines →
          </a>
        </div>
      </div>

      <!-- Support Section -->
      <div style="background: #f0fdf4; border-left: 6px solid #10b981; border-radius: 12px; padding: 28px; margin: 28px 0;">
        <h4 style="color: #065f46; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 10px;">🤝</span>
          We're Here to Help!
        </h4>
        <p style="color: #047857; font-size: 15px; line-height: 1.8; margin: 0 0 16px 0;">
          Don't be discouraged! Our team wants to help you succeed. If you have questions about this decision or need guidance on improving your application, please reach out to us.
        </p>
        <div style="background: white; border-radius: 8px; padding: 16px; border: 2px solid #86efac;">
          <p style="color: #065f46; font-size: 14px; margin: 0;">
            <strong>📧 Email:</strong> support@researchhub.rw<br>
            <strong>📞 Phone:</strong> +250 XXX XXX XXX<br>
            <strong>💬 Response Time:</strong> Within 24 hours
          </p>
        </div>
      </div>

      <!-- Alternative Options -->
      <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin: 28px 0; border: 2px solid #bfdbfe;">
        <h4 style="color: #1e40af; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          🌟 Meanwhile, You Can:
        </h4>
        <div style="display: grid; gap: 12px; margin-top: 16px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities" style="display: block; padding: 14px; background: white; border-radius: 8px; text-decoration: none; color: #1e293b; border: 2px solid #dbeafe; transition: all 0.3s ease;">
            <strong style="color: #2563eb;">🔍 Explore Existing Communities</strong><br>
            <span style="font-size: 13px; color: #64748b;">Join communities in your field of interest</span>
          </a>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/research/create" style="display: block; padding: 14px; background: white; border-radius: 8px; text-decoration: none; color: #1e293b; border: 2px solid #dbeafe; transition: all 0.3s ease;">
            <strong style="color: #2563eb;">📝 Share Your Research</strong><br>
            <span style="font-size: 13px; color: #64748b;">Publish papers and connect with peers</span>
          </a>
          
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/networking" style="display: block; padding: 14px; background: white; border-radius: 8px; text-decoration: none; color: #1e293b; border: 2px solid #dbeafe; transition: all 0.3s ease;">
            <strong style="color: #2563eb;">👥 Network with Researchers</strong><br>
            <span style="font-size: 13px; color: #64748b;">Build your professional network</span>
          </a>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="support-box">
        <h4 style="color: #e2e8f0; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
          📞 Questions? We're Here to Help
        </h4>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          Our support team is available 24/7 to answer your questions and provide guidance on creating a successful community application.
        </p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" style="display: inline-block; background: rgba(255,255,255,0.1); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid rgba(255,255,255,0.2); transition: all 0.3s ease;">
          Contact Support Team
        </a>
      </div>

      <div style="margin: 32px 0;">
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s; text-decoration: none;">📘</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s; text-decoration: none;">🐦</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s; text-decoration: none;">📷</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s; text-decoration: none;">💼</a>
      </div>

      <div style="margin-top: 28px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 16px; line-height: 1.6; font-weight: 600;">
          Rwanda Research Hub
        </p>
        <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
          Building Rwanda's Academic Community Together
        </p>
        <p style="margin: 0; color: #64748b; font-size: 13px;">
          📧 support@researchhub.rw • 📞 +250 XXX XXX XXX
        </p>
      </div>

      <div style="margin-top: 24px;">
        <p style="margin: 0; color: #64748b; font-size: 11px; line-height: 1.8;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
          •
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences" style="color: #667eea; text-decoration: none;">Email Preferences</a>
          •
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/privacy" style="color: #667eea; text-decoration: none;">Privacy Policy</a>
          •
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/terms" style="color: #667eea; text-decoration: none;">Terms</a>
        </p>
      </div>

      <p style="margin: 20px 0 0 0; color: #475569; font-size: 11px; line-height: 1.6;">
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