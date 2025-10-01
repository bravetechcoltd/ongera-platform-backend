interface UserData {
  first_name: string;
  last_name: string;
  email: string;
  account_type: string;
  profile?: {
    institution_name?: string;
    academic_level?: string;
  };
}

export class ActivateDeactivateDeleteUserTemplate {
  static getStatusChangeTemplate(
    userData: UserData,
    isActivation: boolean,
    reason?: string
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
  <title>Account ${statusText}</title>
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
    .content { padding: 48px 36px; }
    .alert-box {
      background: ${statusBg};
      border-left: 6px solid ${statusColor};
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .user-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 3px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin: 32px 0;
      position: relative;
      overflow: hidden;
    }
    .user-card::before {
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
    }
    @media only screen and (max-width: 600px) {
      .container { border-radius: 16px; }
      .content { padding: 32px 24px !important; }
      .header { padding: 36px 24px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <div class="header">
      <div style="position: relative; z-index: 1;">
        <div style="font-size: 64px; margin-bottom: 16px;">${statusEmoji}</div>
        <div class="status-badge">
          Account ${statusText}
        </div>
        <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
          Rwanda Research Hub
        </h1>
      </div>
    </div>

    <div class="content">
      
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${userData.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          ${isActivation 
            ? `Great news! Your account has been <strong style="color: #10b981;">activated</strong> and is now fully operational. 🎉` 
            : `We're writing to inform you that your account has been <strong style="color: #ef4444;">deactivated</strong>.`
          }
        </p>
      </div>

      <div class="alert-box">
        <h3 style="color: ${statusColor}; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">${statusEmoji}</span>
          ${isActivation ? 'Account is Now Active' : 'Account is No Longer Active'}
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          ${isActivation 
            ? `You now have full access to all platform features including research projects, communities, events, and collaboration tools.` 
            : `Your account access has been temporarily suspended. You won't be able to log in or access platform features.`
          }
        </p>
      </div>

      ${!isActivation && reason ? `
      <div style="background: #fef2f2; border-left: 6px solid #dc2626; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h4 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">ℹ️</span>
          Reason for Deactivation
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0;">
          ${reason}
        </p>
      </div>
      ` : ''}

      <div class="user-card">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 20px 0;">
          Account Information
        </h3>
        
        <div class="info-row">
          <span class="info-label">Full Name</span>
          <span class="info-value">${userData.first_name} ${userData.last_name}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email Address</span>
          <span class="info-value">${userData.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Account Type</span>
          <span class="info-value">${userData.account_type}</span>
        </div>
        ${userData.profile?.institution_name ? `
        <div class="info-row">
          <span class="info-label">Institution</span>
          <span class="info-value">${userData.profile.institution_name}</span>
        </div>
        ` : ''}
        ${userData.profile?.academic_level ? `
        <div class="info-row">
          <span class="info-label">Academic Level</span>
          <span class="info-value">${userData.profile.academic_level}</span>
        </div>
        ` : ''}
      </div>

      <div style="height: 2px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 32px 0;"></div>

      <div class="action-card">
        <h4 style="color: #92400e; font-size: 18px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 24px;">🎯</span>
          ${isActivation ? 'Next Steps' : 'Need Help?'}
        </h4>
        
        ${isActivation ? `
        <div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">🚀</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Login to Your Account</strong>
              <span style="color: #64748b; font-size: 13px;">Start exploring the platform</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">👤</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Complete Your Profile</strong>
              <span style="color: #64748b; font-size: 13px;">Add more details to your account</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">🌐</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Join Communities</strong>
              <span style="color: #64748b; font-size: 13px;">Connect with researchers</span>
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
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/appeal" class="action-item">
            <span style="margin-right: 16px; font-size: 24px;">📝</span>
            <div style="flex: 1; text-align: left;">
              <strong style="font-size: 16px; display: block; font-weight: 700;">Submit an Appeal</strong>
              <span style="color: #64748b; font-size: 13px;">Request account review</span>
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
        <a href="mailto:support@researchhub.rw" style="display: inline-block; padding: 12px 24px; background: white; color: #dc2626; border: 2px solid #fecaca; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Contact Admin Team
        </a>
      </div>
      ` : ''}

    </div>

    <div class="footer">
      <div class="support-box">
        <h4 style="color: #e2e8f0; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          📞 Need Help?
        </h4>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          Our support team is available 24/7 to assist you
        </p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/support" style="display: inline-block; padding: 12px 24px; background: rgba(255,255,255,0.1); color: white; border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; text-decoration: none; font-weight: 600;">
          Get Support
        </a>
      </div>

      <div style="margin: 32px 0;">
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px;">📘</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px;">🐦</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px;">📷</a>
        <a href="#" style="display: inline-block; margin: 0 12px; font-size: 28px;">💼</a>
      </div>

      <div style="margin-top: 28px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,0.1);">
        <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 14px;">
          Rwanda Research Hub • Academic Collaboration Platform
        </p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          📧 support@researchhub.rw • 📞 +250 XXX XXX XXX
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

  static getDeletionTemplate(userData: UserData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Deleted</title>
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
      position: relative;
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
      position: relative;
      z-index: 1;
    }
    .content { padding: 48px 36px; }
    .alert-box {
      background: #fef2f2;
      border-left: 6px solid #dc2626;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .user-card {
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
        Account Deleted
      </div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
        Rwanda Research Hub
      </h1>
    </div>

    <div class="content">
      
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${userData.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8;">
          We're writing to inform you that your account with Rwanda Research Hub has been <strong style="color: #dc2626;">permanently deleted</strong>.
        </p>
      </div>

      <div class="alert-box">
        <h3 style="color: #dc2626; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
          Account Permanently Deleted
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          Your account and all associated data have been removed from our system. You will no longer be able to access the platform with this email address.
        </p>
      </div>

      <div class="user-card">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 20px 0;">
          Deleted Account Information
        </h3>
        
        <div class="info-row">
          <span style="font-size: 14px; color: #64748b; font-weight: 600;">Full Name</span>
          <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${userData.first_name} ${userData.last_name}</span>
        </div>
        <div class="info-row">
          <span style="font-size: 14px; color: #64748b; font-weight: 600;">Email Address</span>
          <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${userData.email}</span>
        </div>
        <div class="info-row">
          <span style="font-size: 14px; color: #64748b; font-weight: 600;">Account Type</span>
          <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${userData.account_type}</span>
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
            <span>All your research projects, posts, and contributions have been removed</span>
          </li>
          <li style="padding: 12px 0; color: #78350f; font-size: 14px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">•</span>
            <span>Your community memberships and event registrations have been cancelled</span>
          </li>
          <li style="padding: 12px 0; color: #78350f; font-size: 14px; display: flex; align-items: start;">
            <span style="margin-right: 12px;">•</span>
            <span>You won't be able to log in with this email address</span>
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
          Thank you for being part of Rwanda Research Hub.<br>
          We hope to see you again in the future.
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