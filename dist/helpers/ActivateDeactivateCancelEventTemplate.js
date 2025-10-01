"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivateDeactivateCancelEventTemplate = void 0;
class ActivateDeactivateCancelEventTemplate {
    /**
     * Template for event activation/deactivation
     */
    static getStatusChangeTemplate(event, isActivation, reason) {
        const statusText = isActivation ? 'Activated' : 'Cancelled';
        const statusBadge = isActivation ? 'ACTIVATED' : 'CANCELLED';
        const statusColor = isActivation ? '#28a745' : '#ffc107';
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hello ${event.organizer.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        ${isActivation
            ? 'Great news! Your event has been activated and is now visible to the community.'
            : 'We are writing to inform you that your event has been cancelled.'}
      </div>
      
      <span style="display: inline-block; background: ${statusColor}; color: ${isActivation ? 'white' : '#000'}; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        ${statusBadge}
      </span>
      
      <!-- Highlight Box -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">EVENT STATUS UPDATE</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${event.title}</div>
      </div>
      
      <!-- Event Details -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          EVENT INFORMATION
        </div>
        <div style="color: #212529; font-size: 15px;">
          <strong>Event Type:</strong> ${event.event_type}<br>
          <strong>Event Mode:</strong> ${event.event_mode}<br>
          <strong>Date:</strong> ${eventDate}<br>
          <strong>Time:</strong> ${eventTime} ${event.timezone}<br>
          <strong>Status:</strong> ${event.status}
        </div>
      </div>
      
      ${!isActivation && reason ? `
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-weight: 600; font-size: 14px; margin-bottom: 8px;">REASON FOR CANCELLATION</div>
        <div style="color: #856404; font-size: 15px;">${reason}</div>
      </div>
      ` : ''}
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        ${isActivation
            ? 'Your event is now publicly accessible and attendees can register.'
            : 'All registered attendees will be notified about this cancellation.'}
      </div>
      
      <!-- Action Button -->
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        View Event Details
      </a>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        Manage all your events from your dashboard.
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
     * Template for permanent event cancellation
     */
    static getCancellationTemplate(event, reason) {
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hello ${event.organizer.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        We are writing to inform you that your event has been permanently cancelled by the platform administrators.
      </div>
      
      <span style="display: inline-block; background: #dc3545; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        PERMANENTLY CANCELLED
      </span>
      
      <!-- Highlight Box -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">CANCELLED EVENT</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${event.title}</div>
      </div>
      
      <!-- Event Details -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          EVENT INFORMATION
        </div>
        <div style="color: #212529; font-size: 15px;">
          <strong>Event Type:</strong> ${event.event_type}<br>
          <strong>Event Mode:</strong> ${event.event_mode}<br>
          <strong>Scheduled Date:</strong> ${eventDate}<br>
          <strong>Scheduled Time:</strong> ${eventTime} ${event.timezone}<br>
          <strong>Organizer:</strong> ${event.organizer.first_name} ${event.organizer.last_name}
        </div>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-weight: 600; font-size: 14px; margin-bottom: 8px;">REASON FOR CANCELLATION</div>
        <div style="color: #856404; font-size: 15px;">${reason}</div>
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        All registered attendees have been notified about this cancellation.
      </div>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <!-- Support Box -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin-top: 20px; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 8px;">📧 Questions or Concerns?</div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.5;">
          If you have questions about this cancellation or believe it was done in error, please contact our support team at support@ongera.com
        </div>
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
exports.ActivateDeactivateCancelEventTemplate = ActivateDeactivateCancelEventTemplate;
