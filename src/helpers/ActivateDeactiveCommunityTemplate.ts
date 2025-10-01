interface CommunityData {
  name: string;
  description: string;
  category: string;
  member_count: number;
  cover_image_url?: string;
  creator: {
    first_name: string;
    last_name: string;
    profile?: {
      institution_name?: string;
    };
  };
  community_id: string;
  is_active: boolean;
  reason?: string;
}

interface UserData {
  first_name: string;
  email: string;
}

export class ActivateDeactiveCommunityTemplate {
  static getStatusChangeTemplate(
    communityData: CommunityData,
    userData: UserData,
    isActivation: boolean
  ): string {
    const statusText = isActivation ? 'Activated' : 'Deactivated';
    const statusEmoji = isActivation ? '✅' : '⚠️';
    const statusColor = isActivation ? '#10b981' : '#ef4444';
    const statusBg = isActivation ? '#d1fae5' : '#fee2e2';
    const statusBorder = isActivation ? '#6ee7b7' : '#fecaca';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community ${statusText}</title>
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
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
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
    .content { 
      padding: 48px 36px;
      background: #ffffff;
    }
    .alert-box {
      background: ${statusBg};
      border-left: 6px solid ${statusColor};
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
      background: linear-gradient(90deg, ${statusColor} 0%, ${statusBg} 100%);
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
      border-color: ${statusColor};
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
      margin: 0 8px;
    }
    .btn-secondary:hover {
      border-color: #667eea;
      color: #667eea;
      background: #f7faff;
    }
    .divider {
      height: 2px;
      background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
      margin: 32px 0;
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
    .action-item:hover {
      border-color: #fb923c;
      transform: translateX(6px);
      box-shadow: 0 4px 12px rgba(251, 146, 60, 0.2);
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
    @media only screen and (max-width: 600px) {
      .container { border-radius: 16px; }
      .content { padding: 32px 24px !important; }
      .header { padding: 36px 24px !important; }
      .info-grid { grid-template-columns: 1fr; }
      .btn-primary { padding: 16px 32px; font-size: 14px; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <div class="header">
      <div style="position: relative; z-index: 1;">
        <div style="font-size: 64px; margin-bottom: 16px;">${statusEmoji}</div>
        <div class="status-badge">
          Community ${statusText}
        </div>
        <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0; letter-spacing: -1px;">
          ${communityData.name}
        </h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      
      <!-- Greeting -->
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${userData.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          ${isActivation 
            ? `Great news! The community <strong style="color: #667eea;">"${communityData.name}"</strong> has been activated and is now live! 🎉` 
            : `We're writing to inform you that the community <strong style="color: #ef4444;">"${communityData.name}"</strong> has been deactivated.`
          }
        </p>
      </div>

      <!-- Alert Box -->
      <div class="alert-box">
        <h3 style="color: ${statusColor}; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">${statusEmoji}</span>
          ${isActivation ? 'Community is Now Active' : 'Community is No Longer Active'}
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          ${isActivation 
            ? `You can now access all community features, create posts, participate in discussions, and connect with ${communityData.member_count} members!` 
            : `This community is currently unavailable. All posts, discussions, and member activities have been suspended.`
          }
        </p>
      </div>

      ${!isActivation && communityData.reason ? `
      <div style="background: #fef2f2; border-left: 6px solid #dc2626; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h4 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">ℹ️</span>
          Reason for Deactivation
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0;">
          ${communityData.reason}
        </p>
      </div>
      ` : ''}

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
            <span class="info-icon">👥</span>
            <div class="info-label">Members</div>
            <div class="info-value">${communityData.member_count}</div>
          </div>
          <div class="info-item">
            <span class="info-icon">🏷️</span>
            <div class="info-label">Category</div>
            <div class="info-value">${communityData.category}</div>
          </div>
        </div>

        <div style="background: white; border-radius: 12px; padding: 20px; margin-top: 20px; border: 2px solid #e2e8f0;">
          <h4 style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">
            Created by ${communityData.creator.first_name} ${communityData.creator.last_name}
          </h4>
          <p style="color: #64748b; font-size: 13px; margin: 0;">
            🏛️ ${communityData.creator.profile?.institution_name || 'Research Institution'}
          </p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Action Card -->
      <div class="action-card">
        <h4 style="color: #92400e; font-size: 18px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 24px;">🎯</span>
          ${isActivation ? 'Next Steps' : 'Need Help?'}
        </h4>
        
        ${isActivation ? `
        <div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${communityData.community_id}" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">🚀</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Visit Community</strong>
              <span style="color: #64748b; font-size: 13px;">Start exploring and engaging</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${communityData.community_id}/create-post" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">✍️</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Create First Post</strong>
              <span style="color: #64748b; font-size: 13px;">Share your thoughts</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${communityData.community_id}/members" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">👥</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">View Members</strong>
              <span style="color: #64748b; font-size: 13px;">Connect with peers</span>
            </div>
          </a>
        </div>
        ` : `
        <div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">💬</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Contact Support</strong>
              <span style="color: #64748b; font-size: 13px;">Get help from our team</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">🔍</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Explore Other Communities</strong>
              <span style="color: #64748b; font-size: 13px;">Find alternative communities</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/faq" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">❓</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">View FAQs</strong>
              <span style="color: #64748b; font-size: 13px;">Common questions answered</span>
            </div>
          </a>
        </div>
        `}
      </div>

      ${!isActivation ? `
      <div class="support-box" style="background: #fef2f2; border-color: #fecaca;">
        <h4 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          📧 Need Assistance?
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          If you have questions about this deactivation or need to appeal this decision, please contact our admin team.
        </p>
        <a href="mailto:support@researchhub.rw" class="btn-secondary" style="background: white; color: #dc2626; border-color: #fecaca;">
          Contact Admin Team
        </a>
      </div>
      ` : ''}

    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="support-box">
        <h4 style="color: #e2e8f0; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          📞 Need Help?
        </h4>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          Our support team is available 24/7 to assist you
        </p>
        <div style="margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" class="btn-secondary" style="color: white; border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);">
            Get Support
          </a>
        </div>
      </div>

      <div style="margin: 32px 0;">
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s;">📘</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s;">🐦</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s;">📷</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px; transition: transform 0.2s;">💼</a>
      </div>

      <div style="margin-top: 28px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
          Rwanda Research Hub • Academic Collaboration Platform
        </p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          📧 support@researchhub.rw • 📞 +250 XXX XXX XXX
        </p>
      </div>

      <div style="margin-top: 24px;">
        <p style="margin: 0; color: #64748b; font-size: 11px; line-height: 1.5;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe" style="color: #667eea; text-decoration: none;">Unsubscribe</a>
          •
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences" style="color: #667eea; text-decoration: none;">Email Preferences</a>
        </p>
      </div>

      <p style="margin: 20px 0 0 0; color: #475569; font-size: 11px;">
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