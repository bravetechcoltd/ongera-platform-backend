// services/NotificationService.ts
// This service handles sending notifications to users

import nodemailer from 'nodemailer';
import { Community } from '../database/models/Community';
import { User } from '../database/models/User';

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

  /**
   * Notify admin when a new community is created
   */
  static async notifyAdminNewCommunity(community: Community) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (!adminEmail) return;

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: adminEmail,
        subject: '🔔 New Community Awaiting Approval',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">New Community Submission</h2>
            <p>A new community has been created and is awaiting approval:</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${community.name}</h3>
              <p><strong>Category:</strong> ${community.category}</p>
              <p><strong>Type:</strong> ${community.community_type}</p>
              <p><strong>Creator:</strong> ${community.creator.first_name} ${community.creator.last_name}</p>
              <p><strong>Description:</strong> ${community.description}</p>
            </div>
            
            <a href="${process.env.FRONTEND_URL}/dashboard/admin/communities" 
               style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
              Review Community
            </a>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Admin notification sent for new community');
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error);
    }
  }

  /**
   * Notify creator when their community is approved
   */
  static async notifyCreatorApproval(community: Community) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: community.creator.email,
        subject: '🎉 Your Community Has Been Approved!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Congratulations!</h2>
            <p>Hi ${community.creator.first_name},</p>
            <p>Great news! Your community <strong>${community.name}</strong> has been approved and is now live on the platform.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #059669;">
              <p>✅ Your community is now visible to all users</p>
              <p>✅ Members can join and start engaging</p>
              <p>✅ You can start posting content</p>
            </div>
            
            <a href="${process.env.FRONTEND_URL}/dashboard/communities/${community.id}" 
               style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
              Visit Your Community
            </a>
            
            <p style="margin-top: 30px; color: #6b7280;">
              Thank you for contributing to our community!<br>
              - The Team
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Approval notification sent to creator');
    } catch (error) {
      console.error('❌ Failed to send approval notification:', error);
    }
  }

  /**
   * Notify creator when their community is rejected
   */
  static async notifyCreatorRejection(community: Community, reason: string) {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: community.creator.email,
        subject: 'Community Submission Update',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Community Submission Not Approved</h2>
            <p>Hi ${community.creator.first_name},</p>
            <p>Thank you for your interest in creating a community on our platform. Unfortunately, we're unable to approve your community <strong>${community.name}</strong> at this time.</p>
            
            ${reason ? `
              <div style="background: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #dc2626;">
                <p><strong>Reason:</strong></p>
                <p>${reason}</p>
              </div>
            ` : ''}
            
            <p>If you have questions or would like to submit an updated version, please don't hesitate to reach out to our support team.</p>
            
            <a href="${process.env.FRONTEND_URL}/dashboard/communities/create" 
               style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px;">
              Create New Community
            </a>
            
            <p style="margin-top: 30px; color: #6b7280;">
              Best regards,<br>
              - The Team
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Rejection notification sent to creator');
    } catch (error) {
      console.error('❌ Failed to send rejection notification:', error);
    }
  }

  /**
   * Send in-app notification (if you have a notification system)
   */
  static async createInAppNotification(
    userId: string,
    type: 'community_approved' | 'community_rejected' | 'community_pending',
    message: string,
    link?: string
  ) {
    // Implementation depends on your notification system
    // This is a placeholder for in-app notifications
    console.log(`📬 In-app notification for user ${userId}: ${message}`);
    
    // Example implementation:
    // const notificationRepo = dbConnection.getRepository(Notification);
    // await notificationRepo.save({
    //   user: { id: userId },
    //   type,
    //   message,
    //   link,
    //   is_read: false
    // });
  }
}