import { Event } from "../database/models/Event";

export class ActivateDeactivateCancelEventTemplate {
  /**
   * Template for event activation/deactivation
   */
  static getStatusChangeTemplate(
    event: Event,
    isActivation: boolean,
    reason?: string
  ): string {
    const statusText = isActivation ? 'Activated' : 'Cancelled';
    const statusEmoji = isActivation ? '✅' : '⚠️';
    const statusColor = isActivation ? '#10b981' : '#f59e0b';
    const statusBg = isActivation ? '#d1fae5' : '#fef3c7';
    const statusBorder = isActivation ? '#6ee7b7' : '#fbbf24';

    const eventDate = new Date(event.start_datetime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const eventTime = new Date(event.start_datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event ${statusText}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
    
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 48px 32px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 16px;">${statusEmoji}</div>
      <div style="display: inline-block; background: ${statusBg}; border: 3px solid ${statusBorder}; color: ${statusColor}; padding: 16px 32px; border-radius: 50px; font-size: 18px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
        Event ${statusText}
      </div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
        Rwanda Research Hub
      </h1>
    </div>

    <div style="padding: 48px 36px;">
      
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${event.organizer.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0;">
          ${isActivation 
            ? `Great news! Your event has been <strong style="color: #10b981;">activated</strong> and is now visible to the community. 🎉` 
            : `We're writing to inform you that your event has been <strong style="color: #f59e0b;">cancelled</strong>.`
          }
        </p>
      </div>

      <div style="background: ${statusBg}; border-left: 6px solid ${statusColor}; border-radius: 12px; padding: 24px; margin: 28px 0;">
        <h3 style="color: ${statusColor}; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">${statusEmoji}</span>
          ${isActivation ? 'Event is Now Active' : 'Event Has Been Cancelled'}
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          ${isActivation 
            ? `Your event is now publicly accessible. Attendees can register and view event details.` 
            : `Your event has been cancelled and is no longer visible to attendees. All registered attendees will be notified.`
          }
        </p>
      </div>

      ${!isActivation && reason ? `
      <div style="background: #fef2f2; border-left: 6px solid #dc2626; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h4 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">ℹ️</span>
          Reason for Cancellation
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0;">
          ${reason}
        </p>
      </div>
      ` : ''}

      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 3px solid #e2e8f0; border-radius: 20px; padding: 32px; margin: 32px 0; position: relative;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, ${statusColor} 0%, ${statusBg} 100%);"></div>
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 20px 0;">
          Event Information
        </h3>
        
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Event Title</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.title}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Event Type</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.event_type}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Event Mode</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.event_mode}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Date</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${eventDate}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Time</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${eventTime} ${event.timezone}</span>
          </div>
        </div>
        <div style="padding: 12px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Status</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.status}</span>
          </div>
        </div>
      </div>

      <div style="background: ${isActivation ? '#d1fae5' : '#fef3c7'}; border: 3px solid ${isActivation ? '#6ee7b7' : '#fbbf24'}; border-radius: 16px; padding: 28px; margin: 28px 0;">
        <h4 style="color: ${isActivation ? '#065f46' : '#92400e'}; font-size: 18px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 24px;">🎯</span>
          ${isActivation ? 'What You Can Do Now' : 'Need Help?'}
        </h4>
        
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}" style="display: flex; align-items: center; padding: 18px; background: white; border-radius: 12px; text-decoration: none; color: #1e293b; border: 2px solid ${isActivation ? '#a7f3d0' : '#fed7aa'}; margin-bottom: 12px;">
          <span style="margin-right: 16px; font-size: 24px;">${isActivation ? '👁️' : '📅'}</span>
          <div style="flex: 1; text-align: left;">
            <strong style="font-size: 16px; display: block; font-weight: 700;">${isActivation ? 'View Your Event' : 'View Event Details'}</strong>
            <span style="color: #64748b; font-size: 13px;">${isActivation ? 'See how it appears to attendees' : 'Review event information'}</span>
          </div>
        </a>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events" style="display: flex; align-items: center; padding: 18px; background: white; border-radius: 12px; text-decoration: none; color: #1e293b; border: 2px solid ${isActivation ? '#a7f3d0' : '#fed7aa'};">
          <span style="margin-right: 16px; font-size: 24px;">📊</span>
          <div style="flex: 1; text-align: left;">
            <strong style="font-size: 16px; display: block; font-weight: 700;">Manage Your Events</strong>
            <span style="color: #64748b; font-size: 13px;">View all your organized events</span>
          </div>
        </a>
      </div>

    </div>

    <div style="background: #1e293b; color: #94a3b8; padding: 40px 28px; text-align: center;">
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

  /**
   * Template for permanent event cancellation
   */
  static getCancellationTemplate(event: Event, reason: string): string {
    const eventDate = new Date(event.start_datetime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const eventTime = new Date(event.start_datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
    
    <div style="background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%); padding: 48px 32px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 16px;">🚨</div>
      <div style="display: inline-block; background: #fee2e2; border: 3px solid #fecaca; color: #dc2626; padding: 16px 32px; border-radius: 50px; font-size: 18px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
        Event Cancelled
      </div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
        Rwanda Research Hub
      </h1>
    </div>

    <div style="padding: 48px 36px;">
      
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          Hi ${event.organizer.first_name},
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0;">
          We're writing to inform you that your event has been <strong style="color: #dc2626;">permanently cancelled</strong> by the platform administrators.
        </p>
      </div>

      <div style="background: #fef2f2; border-left: 6px solid #dc2626; border-radius: 12px; padding: 24px; margin: 28px 0;">
        <h3 style="color: #dc2626; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
          Event Permanently Cancelled
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          Your event has been cancelled and is no longer accessible. All registered attendees have been notified about this cancellation.
        </p>
      </div>

      <div style="background: #fff7ed; border-left: 6px solid #f59e0b; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h4 style="color: #92400e; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 20px; margin-right: 10px;">ℹ️</span>
          Reason for Cancellation
        </h4>
        <p style="color: #78350f; font-size: 14px; line-height: 1.7; margin: 0;">
          ${reason}
        </p>
      </div>

      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 3px solid #e2e8f0; border-radius: 20px; padding: 32px; margin: 32px 0;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 20px 0;">
          Cancelled Event Information
        </h3>
        
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Event Title</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.title}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Event Type</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.event_type}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Event Mode</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.event_mode}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Scheduled Date</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${eventDate}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Scheduled Time</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${eventTime} ${event.timezone}</span>
          </div>
        </div>
        <div style="padding: 12px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Organizer</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.organizer.first_name} ${event.organizer.last_name}</span>
          </div>
        </div>
      </div>

      <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 16px; padding: 24px; margin: 28px 0;">
        <h4 style="color: #991b1b; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          📧 Questions or Concerns?
        </h4>
        <p style="color: #7f1d1d; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
          If you have questions about this cancellation or believe it was done in error, please contact our support team.
        </p>
        <a href="mailto:support@researchhub.rw" style="display: inline-block; padding: 14px 28px; background: white; color: #dc2626; border: 2px solid #fecaca; border-radius: 10px; text-decoration: none; font-weight: 600;">
          Contact Support Team
        </a>
      </div>

    </div>

    <div style="background: #1e293b; color: #94a3b8; padding: 40px 28px; text-align: center;">
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