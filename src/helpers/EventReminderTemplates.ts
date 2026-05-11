import { Event } from "../database/models/Event";
import { User } from "../database/models/User";

export class EventReminderTemplates {
  static get24HourReminderTemplate(event: Event) {
    return (attendee: User) => {
      const eventDate = new Date(event.start_datetime);
      const eventTime = eventDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const eventDateFormatted = eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Reminder: ${event.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: linear-gradient(to right, #0158B7, #5E96D2); padding: 30px; text-align: center;">
      <div style="color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px;">⏰ EVENT TOMORROW</div>
      <div style="color: white; font-size: 14px;">Don't miss out on this exciting event!</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px;">
      <div style="font-size: 16px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hi ${attendee.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
        This is a friendly reminder that <strong style="color: #0158B7;">${event.title}</strong> is happening <strong>TOMORROW!</strong>
      </div>
      
      <!-- Event Details Box -->
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="margin-bottom: 12px;">
          <strong style="color: #0158B7; font-size: 14px; text-transform: uppercase;">📅 DATE & TIME</strong>
        </div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: bold; margin-bottom: 8px;">
          ${eventDateFormatted}
        </div>
        <div style="color: #4a4a4a; font-size: 14px; margin-bottom: 12px;">
          ⏰ <strong>${eventTime}</strong> (${event.timezone})
        </div>
      </div>

      <!-- Event Type and Mode -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">
          EVENT INFORMATION
        </div>
        <div style="color: #212529; font-size: 14px; line-height: 1.8;">
          <div><strong>Type:</strong> ${event.event_type}</div>
          <div><strong>Mode:</strong> ${event.event_mode}</div>
          ${event.location_address ? `<div><strong>Location:</strong> ${event.location_address}</div>` : ''}
          ${event.online_meeting_url && event.event_mode !== 'Physical' ? `
          <div style="margin-top: 8px;">
            <strong>Meeting Link:</strong><br>
            <a href="${event.online_meeting_url}" style="color: #0158B7; text-decoration: none; font-weight: 600;">Join Meeting</a>
          </div>
          ` : ''}
        </div>
      </div>

      <!-- Description -->
      <div style="color: #4a4a4a; font-size: 14px; line-height: 1.6; margin: 15px 0;">
        <strong style="color: #1a1a1a;">Description:</strong><br>
        ${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}
      </div>

      <!-- CTA Button -->
      <a href="${process.env.FRONTEND_URL}/dashboard/user/event/${event.id}" 
         style="display: inline-block; background: linear-gradient(to right, #0158B7, #5E96D2); color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        View Event Details
      </a>

      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>

      <!-- Footer Message -->
      <div style="color: #6c757d; font-size: 13px; text-align: center;">
        <p>See you tomorrow! 🎉</p>
        <p>If you have any questions, please contact the event organizer.</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px;">
        <strong>BWENGE Platform</strong><br>
        Connecting Researchers & Academics Worldwide
      </div>
      <div style="color: #6c757d; font-size: 13px; margin-top: 8px;">
        © ${new Date().getFullYear()} BWENGE. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
      `;
    };
  }

  static get1HourReminderTemplate(event: Event) {
    return (attendee: User) => {
      const eventDate = new Date(event.start_datetime);
      const eventTime = eventDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Starting Soon: ${event.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header - Urgent Red -->
    <div style="background: linear-gradient(to right, #FF6B6B, #FF8E72); padding: 30px; text-align: center;">
      <div style="color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px;">🎯 EVENT STARTS IN 1 HOUR</div>
      <div style="color: white; font-size: 14px;">Get ready - it's time to join!</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px;">
      <div style="font-size: 16px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hi ${attendee.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
        <strong style="color: #FF6B6B;">⚠️ QUICK REMINDER:</strong> <strong>${event.title}</strong> is starting in just <strong>1 HOUR!</strong>
      </div>
      
      <!-- Urgent Info Box -->
      <div style="background: #FFE5E5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B6B;">
        <div style="margin-bottom: 12px;">
          <strong style="color: #FF6B6B; font-size: 14px; text-transform: uppercase;">⏰ EVENT TIME</strong>
        </div>
        <div style="color: #1a1a1a; font-size: 18px; font-weight: bold;">
          ${eventTime}
        </div>
        <div style="color: #4a4a4a; font-size: 14px; margin-top: 8px;">
          ${event.timezone}
        </div>
      </div>

      ${event.online_meeting_url && event.event_mode !== 'Physical' ? `
      <!-- Meeting Link Box -->
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="margin-bottom: 12px;">
          <strong style="color: #0158B7; font-size: 14px; text-transform: uppercase;">💻 JOIN MEETING</strong>
        </div>
        <a href="${event.online_meeting_url}" 
           style="display: inline-block; background: linear-gradient(to right, #0158B7, #5E96D2); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          Click Here to Join
        </a>
        ${event.meeting_id ? `
        <div style="color: #4a4a4a; font-size: 13px; margin-top: 12px;">
          <strong>Meeting ID:</strong> <span style="font-family: monospace; font-weight: bold;">${event.meeting_id}</span><br>
          ${event.meeting_password ? `<strong>Password:</strong> <span style="font-family: monospace; font-weight: bold;">${event.meeting_password}</span>` : ''}
        </div>
        ` : ''}
      </div>
      ` : ''}

      <!-- Event Details -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">
          QUICK DETAILS
        </div>
        <div style="color: #212529; font-size: 14px; line-height: 1.8;">
          <div><strong>Type:</strong> ${event.event_type}</div>
          <div><strong>Mode:</strong> ${event.event_mode}</div>
          ${event.location_address ? `<div><strong>Location:</strong> ${event.location_address}</div>` : ''}
        </div>
      </div>

      <!-- Urgent CTA -->
      <a href="${process.env.FRONTEND_URL}/dashboard/user/event/${event.id}" 
         style="display: block; background: linear-gradient(to right, #FF6B6B, #FF8E72); color: white; text-decoration: none; padding: 16px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0; text-align: center;">
        GET READY - VIEW EVENT
      </a>

      <!-- Preparation Tips -->
      <div style="background: #FFFAF0; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #FFB800;">
        <strong style="color: #FF8C00; display: block; margin-bottom: 8px;">⚡ LAST MINUTE TIPS:</strong>
        <ul style="color: #4a4a4a; font-size: 13px; margin: 8px 0; padding-left: 20px;">
          <li>Check your internet connection</li>
          <li>Test your audio and video (if required)</li>
          <li>Close unnecessary applications</li>
          <li>Find a quiet place to join</li>
        </ul>
      </div>

      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>

      <!-- Footer Message -->
      <div style="color: #6c757d; font-size: 13px; text-align: center;">
        <p>See you in just 1 hour! 🚀</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px;">
        <strong>BWENGE Platform</strong><br>
        Connecting Researchers & Academics Worldwide
      </div>
      <div style="color: #6c757d; font-size: 13px; margin-top: 8px;">
        © ${new Date().getFullYear()} BWENGE. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
      `;
    };
  }
}