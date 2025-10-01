import { Event } from "../database/models/Event";
import { User } from "../database/models/User";
import { formatDate } from "./utils";

interface DateExtensionData {
  start_datetime: Date;
  end_datetime: Date;
  reason: string;
}

interface EventCloseData {
  reason: string;
  send_certificates: boolean;
}

interface PostponementData {
  oldDates: {
    start_datetime: Date;
    end_datetime: Date;
  };
  newDates: {
    start_datetime: Date;
    end_datetime: Date;
  };
  reason: string;
}

interface OwnershipTransferData {
  oldOrganizer: User;
  newOrganizer: User;
  reason: string;
}

interface BulkActionData {
  action: 'approve' | 'reject';
  reason?: string;
  user: User;
}

export class AdminEventManagementTemplates {
  /**
   * Template for event date extension
   */
  static getDateExtendedTemplate(
    event: Event,
    data: DateExtensionData,
    recipientType: 'organizer' | 'attendee'
  ): string {
    const oldStartDate = formatDate(new Date(event.start_datetime));
    const oldEndDate = formatDate(new Date(event.end_datetime));
    const newStartDate = formatDate(data.start_datetime);
    const newEndDate = formatDate(data.end_datetime);

    const title = recipientType === 'organizer' 
      ? 'Event Date Extended' 
      : 'Event Date Changed';

    const greeting = recipientType === 'organizer'
      ? `Hi ${event.organizer.first_name},`
      : 'Hello,';

    const message = recipientType === 'organizer'
      ? `Your event date has been extended by the platform administrators.`
      : `The date for the event you registered for has been changed.`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
    
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 48px 32px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 16px;">📅</div>
      <div style="display: inline-block; background: #dbeafe; border: 3px solid #93c5fd; color: #1e40af; padding: 16px 32px; border-radius: 50px; font-size: 18px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
        ${title}
      </div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 20px 0 0 0;">
        Rwanda Research Hub
      </h1>
    </div>

    <div style="padding: 48px 36px;">
      
      <div style="margin-bottom: 32px;">
        <h2 style="color: #1e293b; font-size: 22px; margin-bottom: 12px; font-weight: 700;">
          ${greeting}
        </h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0;">
          ${message}
        </p>
      </div>

      <div style="background: #dbeafe; border-left: 6px solid #3b82f6; border-radius: 12px; padding: 24px; margin: 28px 0;">
        <h3 style="color: #1e40af; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">📅</span>
          Event Date Updated
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          The event dates have been updated as follows:
        </p>
      </div>

      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 3px solid #e2e8f0; border-radius: 20px; padding: 32px; margin: 32px 0; position: relative;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: linear-gradient(90deg, #3b82f6 0%, #dbeafe 100%);"></div>
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
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Old Start Date</span>
            <span style="font-size: 14px; color: #dc2626; font-weight: 700; text-decoration: line-through;">${oldStartDate}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">New Start Date</span>
            <span style="font-size: 14px; color: #16a34a; font-weight: 700;">${newStartDate}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Old End Date</span>
            <span style="font-size: 14px; color: #dc2626; font-weight: 700; text-decoration: line-through;">${oldEndDate}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">New End Date</span>
            <span style="font-size: 14px; color: #16a34a; font-weight: 700;">${newEndDate}</span>
          </div>
        </div>
        <div style="padding: 12px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Reason for Change</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${data.reason}</span>
          </div>
        </div>
      </div>

      ${recipientType === 'attendee' ? `
      <div style="background: #f0fdf4; border: 3px solid #bbf7d0; border-radius: 16px; padding: 28px; margin: 28px 0;">
        <h4 style="color: #166534; font-size: 18px; font-weight: 700; margin: 0 0 20px 0; display: flex; align-items: center;">
          <span style="margin-right: 12px; font-size: 24px;">ℹ️</span>
          Your Registration Status
        </h4>
        <p style="color: #166534; font-size: 14px; line-height: 1.7; margin: 0;">
          Your registration remains valid for the new dates. If you can no longer attend, 
          please update your registration status.
        </p>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}" 
           style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
          View Event Details
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
   * Template for event closure
   */
  static getEventClosedTemplate(event: Event, data: EventCloseData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Event Closed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
    
    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 48px 32px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
      <div style="display: inline-block; background: #d1fae5; border: 3px solid #a7f3d0; color: #065f46; padding: 16px 32px; border-radius: 50px; font-size: 18px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">
        Event Closed
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
          Your event has been closed by the platform administrators and marked as completed.
        </p>
      </div>

      <div style="background: #d1fae5; border-left: 6px solid #10b981; border-radius: 12px; padding: 24px; margin: 28px 0;">
        <h3 style="color: #065f46; font-size: 18px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center;">
          <span style="font-size: 24px; margin-right: 12px;">✅</span>
          Event Successfully Completed
        </h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.7; margin: 0;">
          The event has been closed and marked as completed. ${data.send_certificates ? 'Certificates have been issued to attendees.' : ''}
        </p>
      </div>

      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 3px solid #e2e8f0; border-radius: 20px; padding: 32px; margin: 32px 0;">
        <h3 style="color: #1e293b; font-size: 20px; font-weight: 800; margin: 0 0 20px 0;">
          Closure Details
        </h3>
        
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Event Title</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${event.title}</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Status</span>
            <span style="font-size: 14px; color: #065f46; font-weight: 700;">Completed</span>
          </div>
        </div>
        <div style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Certificates Issued</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${data.send_certificates ? 'Yes' : 'No'}</span>
          </div>
        </div>
        <div style="padding: 12px 0;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 14px; color: #64748b; font-weight: 600;">Reason</span>
            <span style="font-size: 14px; color: #1e293b; font-weight: 700;">${data.reason}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events" 
           style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
          Manage Your Events
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

  // Additional template methods for other actions...
  static getEventPostponedTemplate(event: Event, data: PostponementData, recipientType: 'organizer' | 'attendee'): string {
    // Implementation similar to above
    return `<html>... Postponement template ...</html>`;
  }

  static getOwnershipTransferredTemplate(event: Event, data: OwnershipTransferData, recipientType: 'old_organizer' | 'new_organizer'): string {
    // Implementation similar to above
    return `<html>... Ownership transfer template ...</html>`;
  }

  static getBulkActionTemplate(event: Event, data: BulkActionData): string {
    // Implementation similar to above
    return `<html>... Bulk action template ...</html>`;
  }
}