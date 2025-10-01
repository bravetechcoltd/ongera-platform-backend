interface JoinRequestData {
  community_name: string;
  community_description: string;
  community_id: string;
  cover_image_url?: string;
  requester: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
    account_type: string;
    profile?: {
      institution_name?: string;
      field_of_study?: string;
    };
  };
  request_id: string;
  requested_at: Date;
}

interface CreatorData {
  first_name: string;
  email: string;
}

interface ApprovedMemberData {
  first_name: string;
  email: string;
}

export class ApproveUserRequestToJoinCommunityTemplate {
  // Email to creator when user requests to join
  static getJoinRequestNotification(
    requestData: JoinRequestData,
    creatorData: CreatorData
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Member Request</title>
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
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      padding: 48px 32px;
      text-align: center;
      position: relative;
    }
    .badge {
      display: inline-block;
      background: #dbeafe;
      border: 3px solid #93c5fd;
      color: #1e40af;
      padding: 16px 32px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content { padding: 48px 36px; }
    .alert-box {
      background: #dbeafe;
      border-left: 6px solid #3b82f6;
      border-radius: 12px;
      padding: 24px;
      margin: 28px 0;
    }
    .member-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 3px solid #e2e8f0;
      border-radius: 20px;
      padding: 32px;
      margin: 32px 0;
    }
    .profile-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 24px;
    }
    .profile-pic {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #3b82f6;
    }
    .profile-placeholder {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 32px;
      font-weight: 700;
      border: 4px solid #93c5fd;
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
      margin: 8px;
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
      margin: 8px;
    }
    .footer {
      background: #1e293b;
      color: #94a3b8;
      padding: 40px 28px;
      text-align: center;
    }
    @media only screen and (max-width: 600px) {
      .profile-header { flex-direction: column; text-align: center; }
      .info-grid { grid-template-columns: 1fr; }
      .btn-approve, .btn-reject { 
        display: block; 
        width: 100%; 
        margin: 8px 0; 
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 64px; margin-bottom: 16px;">👋</div>
      <div class="badge">New Join Request</div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
        Someone Wants to Join Your Community
      </h1>
    </div>

    <div class="content">
      <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
        Hi ${creatorData.first_name},
      </h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.8;">
        A member has requested to join <strong>${requestData.community_name}</strong>. Please review their profile and decide whether to approve their request.
      </p>

      <div class="alert-box">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
          ⏰ Action Required
        </h3>
        <p style="color: #1e3a8a; font-size: 14px; line-height: 1.7; margin: 0;">
          The user is waiting for your approval. Please review and respond as soon as possible.
        </p>
      </div>

      <div class="member-card">
        <div class="profile-header">
          ${requestData.requester.profile_picture_url ? `
            <img src="${requestData.requester.profile_picture_url}" alt="${requestData.requester.first_name}" class="profile-pic">
          ` : `
            <div class="profile-placeholder">
              ${requestData.requester.first_name[0]}${requestData.requester.last_name[0]}
            </div>
          `}
          <div style="flex: 1;">
            <h3 style="color: #1e293b; font-size: 24px; font-weight: 800; margin: 0 0 8px 0;">
              ${requestData.requester.first_name} ${requestData.requester.last_name}
            </h3>
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              ${requestData.requester.account_type}
            </p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px;">
              📧 Email
            </div>
            <div style="font-size: 14px; color: #1e293b; font-weight: 600;">
              ${requestData.requester.email}
            </div>
          </div>
          ${requestData.requester.profile?.institution_name ? `
          <div class="info-item">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px;">
              🏛️ Institution
            </div>
            <div style="font-size: 14px; color: #1e293b; font-weight: 600;">
              ${requestData.requester.profile.institution_name}
            </div>
          </div>
          ` : ''}
          ${requestData.requester.profile?.field_of_study ? `
          <div class="info-item">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px;">
              📚 Field of Study
            </div>
            <div style="font-size: 14px; color: #1e293b; font-weight: 600;">
              ${requestData.requester.profile.field_of_study}
            </div>
          </div>
          ` : ''}
          <div class="info-item">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 8px;">
              ⏰ Requested
            </div>
            <div style="font-size: 14px; color: #1e293b; font-weight: 600;">
              ${new Date(requestData.requested_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 24px 0;">
          What would you like to do?
        </h3>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/user/communities/join-requests/${requestData.community_id}" class="btn-approve">
          ✅ Approve Request
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/user/communities/join-requests/${requestData.community_id}" class="btn-reject">
          ❌ Reject Request
        </a>
      </div>
    </div>

    <div class="footer">
      <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        Rwanda Research Hub
      </p>
      <p style="margin: 0; color: #64748b; font-size: 11px;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Email to user when approved
  static getMembershipApprovedTemplate(
    communityData: { name: string; description: string; community_id: string; cover_image_url?: string },
    memberData: ApprovedMemberData
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${communityData.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
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
    }
    .content { padding: 48px 36px; }
    .btn-visit {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 18px 40px;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 700;
      font-size: 16px;
      box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
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
      <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
      <h1 style="color: white; font-size: 32px; font-weight: 800;">
        Welcome to ${communityData.name}!
      </h1>
    </div>

    <div class="content">
      <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
        Hi ${memberData.first_name},
      </h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.8; margin-bottom: 24px;">
        Great news! Your request to join <strong>${communityData.name}</strong> has been approved. You are now a member of this community and can start sharing research, ideas, projects, blogs, and more!
      </p>

      <div style="background: #f0fdf4; border-left: 6px solid #10b981; border-radius: 12px; padding: 24px; margin: 28px 0;">
        <h3 style="color: #065f46; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
          🚀 What's Next?
        </h3>
        <ul style="color: #047857; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Explore community posts and discussions</li>
          <li>Share your research projects</li>
          <li>Connect with fellow researchers</li>
          <li>Participate in community events</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/user/communities/dashboard/${communityData.community_id}" class="btn-visit">
          🏠 Visit Community Now
        </a>
      </div>
    </div>

    <div class="footer">
      <p style="color: #e2e8f0; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
        Rwanda Research Hub
      </p>
      <p style="margin: 0; color: #64748b; font-size: 11px;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }
}