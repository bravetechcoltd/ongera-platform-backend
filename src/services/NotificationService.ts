import nodemailer from 'nodemailer';
import { Community } from '../database/models/Community';

export class NotificationService {
  private static transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  static async notifyAdminNewCommunity(community: Community) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) return;

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: adminEmail,
        subject: '🔔 New Community Awaiting Approval - Ongera',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Community Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Admin Notification
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        A new community has been created and is awaiting your approval for publication on the platform.
      </div>
      
      <span style="display: inline-block; background: #ffc107; color: #000; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        ⏰ PENDING APPROVAL
      </span>
      
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          COMMUNITY DETAILS
        </div>
        <div style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin-bottom: 15px;">
          ${community.name}
        </div>
        <div style="color: #4a4a4a; font-size: 14px; line-height: 1.6;">
          ${community.description}
        </div>
      </div>
      
      <div style="background: #f8f9fa; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          SUBMISSION INFORMATION
        </div>
        <div style="color: #212529; font-size: 14px; line-height: 1.8;">
          <strong>Category:</strong> ${community.category}<br>
          <strong>Type:</strong> ${community.community_type}<br>
          <strong>Creator:</strong> ${community.creator.first_name} ${community.creator.last_name}<br>
          <strong>Email:</strong> ${community.creator.email}
        </div>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          ⏰ Action Required
        </div>
        <div style="color: #856404; font-size: 14px; line-height: 1.5;">
          Please review this community submission and approve or reject it based on platform guidelines.
        </div>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard/admin/communities" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          📋 Review Community
        </a>
      </div>
    </div>
    
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Ongera Admin Panel</strong><br>
        Community Management System
      </div>
      <div style="color: #94a3b8; font-size: 12px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
        `
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
    }
  }

  static async notifyCreatorApproval(community: Community) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: community.creator.email,
        subject: '🎉 Your Community Has Been Approved - Ongera',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hello ${community.creator.first_name},
      </div>
      
      <div style="color: #28a745; font-size: 17px; font-weight: 600; margin-bottom: 15px;">
        🎊 Congratulations! Your community has been approved!
      </div>
      
      <span style="display: inline-block; background: #28a745; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        ✅ APPROVED
      </span>
      
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          YOUR COMMUNITY
        </div>
        <div style="color: #1a1a1a; font-size: 18px; font-weight: 600;">
          ${community.name}
        </div>
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Great news! Your community is now live on the Ongera platform and visible to all users.
      </div>
      
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #065f46; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
          ✨ What You Can Do Now:
        </div>
        <div style="color: #064e3b; font-size: 14px; line-height: 1.8;">
          ✅ Your community is visible to all users<br>
          ✅ Members can join and start engaging<br>
          ✅ You can post content and manage members<br>
          ✅ Start building your research community
        </div>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard/admin/communities/${community.id}" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          🏠 Visit Your Community
        </a>
      </div>
      
      <div style="background: white; padding: 18px; border-radius: 8px; margin-top: 20px; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">
          💡 Next Steps
        </div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5;">
          Invite members, create engaging content, and foster meaningful discussions to build a thriving research community!
        </div>
      </div>
    </div>
    
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        Thank you for contributing to our community!
      </div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
        `
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
    }
  }

  static async notifyCreatorRejection(community: Community, reason: string) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: community.creator.email,
        subject: 'Community Submission Update - Ongera',
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Submission Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hello ${community.creator.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Thank you for your interest in creating a community on Ongera. After careful review, we're unable to approve your community submission at this time.
      </div>
      
      <span style="display: inline-block; background: #dc3545; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        ❌ NOT APPROVED
      </span>
      
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          COMMUNITY NAME
        </div>
        <div style="color: #1a1a1a; font-size: 18px; font-weight: 600;">
          ${community.name}
        </div>
      </div>
      
      ${reason ? `
      <div style="background: #fef2f2; border-left: 4px solid #dc3545; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #991b1b; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          REASON FOR REJECTION
        </div>
        <div style="color: #991b1b; font-size: 14px; line-height: 1.6;">
          ${reason}
        </div>
      </div>
      ` : ''}
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        We understand this may be disappointing. If you have questions or would like to submit an updated version that addresses the feedback, please don't hesitate to reach out.
      </div>
      
      <div style="background: #f8f9fa; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #495057; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
          📌 What You Can Do:
        </div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.8;">
          ✓ Review the feedback provided<br>
          ✓ Make necessary improvements<br>
          ✓ Submit a new community proposal<br>
          ✓ Contact support for clarification
        </div>
      </div>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard/admin/communities/create" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          Create New Community
        </a>
      </div>
    </div>
    
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        Questions? Contact us at <a href="mailto:support@ongera.rw" style="color: #0158B7; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
        `
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
    }
  }

  static async createInAppNotification(
    userId: string,
    type: 'community_approved' | 'community_rejected' | 'community_pending',
    message: string,
    link?: string
  ) {
  }
}