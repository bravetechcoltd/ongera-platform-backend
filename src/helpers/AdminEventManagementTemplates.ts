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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        ${greeting}
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        ${message}
      </div>
      
      <span style="display: inline-block; background: #ffc107; color: #000; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        DATE UPDATED
      </span>
      
      <!-- Highlight Box -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">EVENT NAME</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${event.title}</div>
      </div>
      
      <!-- Event Details -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          DATE CHANGES
        </div>
        <div style="color: #212529; font-size: 15px; line-height: 1.8;">
          <div style="margin: 8px 0;">
            <strong>Old Start Date:</strong> <span style="text-decoration: line-through; color: #dc3545;">${oldStartDate}</span>
          </div>
          <div style="margin: 8px 0;">
            <strong>New Start Date:</strong> <span style="color: #28a745; font-weight: 600;">${newStartDate}</span>
          </div>
          <div style="margin: 8px 0;">
            <strong>Old End Date:</strong> <span style="text-decoration: line-through; color: #dc3545;">${oldEndDate}</span>
          </div>
          <div style="margin: 8px 0;">
            <strong>New End Date:</strong> <span style="color: #28a745; font-weight: 600;">${newEndDate}</span>
          </div>
        </div>
      </div>

      <!-- Reason Box -->
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-weight: 600; font-size: 14px; margin-bottom: 8px;">REASON FOR CHANGE</div>
        <div style="color: #856404; font-size: 15px;">${data.reason}</div>
      </div>

      ${recipientType === 'attendee' ? `
      <!-- Status Info -->
      <div style="background: #d1fae5; border-left: 4px solid #28a745; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #065f46; font-weight: 600; font-size: 14px; margin-bottom: 8px;">YOUR REGISTRATION</div>
        <div style="color: #065f46; font-size: 15px;">
          Your registration remains valid for the new dates. If you can no longer attend, please update your registration status.
        </div>
      </div>
      ` : ''}

      <!-- Action Button -->
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        View Event Details
      </a>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        You can view all event details from your dashboard.
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Ongera Platform</strong><br>
        Academic Collaboration Platform
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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header -->
    <div style="background: #0158B7; padding: 25px 30px; text-align: center;">
      <div style="color: white; font-size: 26px; font-weight: bold; letter-spacing: 1px;">ONGERA</div>
    </div>
    
    <!-- Body -->
    <div style="padding: 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px; font-weight: 600;">
        Hi ${event.organizer.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Your event has been closed by the platform administrators and marked as completed.
      </div>
      
      <span style="display: inline-block; background: #28a745; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 5px 0;">
        EVENT COMPLETED
      </span>
      
      <!-- Highlight Box -->
      <div style="background: #E3F2FD; padding: 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 8px;">EVENT NAME</div>
        <div style="color: #1a1a1a; font-size: 16px; font-weight: 600;">${event.title}</div>
      </div>
      
      <!-- Event Status -->
      <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <div style="color: #495057; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          CLOSURE DETAILS
        </div>
        <div style="color: #212529; font-size: 15px; line-height: 1.8;">
          <div style="margin: 8px 0;">
            <strong>Status:</strong> <span style="color: #28a745; font-weight: 600;">Completed</span>
          </div>
          <div style="margin: 8px 0;">
            <strong>Certificates Issued:</strong> ${data.send_certificates ? 'Yes' : 'No'}
          </div>
        </div>
      </div>

      <!-- Reason Box -->
      <div style="background: #d1fae5; border-left: 4px solid #28a745; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #065f46; font-weight: 600; font-size: 14px; margin-bottom: 8px;">CLOSURE REASON</div>
        <div style="color: #065f46; font-size: 15px;">${data.reason}</div>
      </div>

      ${data.send_certificates ? `
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Certificates have been issued to all attendees who met the participation requirements.
      </div>
      ` : ''}

      <!-- Action Button -->
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/events" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        Manage Your Events
      </a>
      
      <div style="height: 1px; background: #e9ecef; margin: 20px 0;"></div>
      
      <div style="color: #6c757d; font-size: 13px;">
        Thank you for organizing this event. We hope it was successful!
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Ongera Platform</strong><br>
        Academic Collaboration Platform
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

  // Additional template methods
  static getEventPostponedTemplate(event: Event, data: PostponementData, recipientType: 'organizer' | 'attendee'): string {
    return `<html>... Postponement template ...</html>`;
  }

  static getOwnershipTransferredTemplate(event: Event, data: OwnershipTransferData, recipientType: 'old_organizer' | 'new_organizer'): string {
    return `<html>... Ownership transfer template ...</html>`;
  }

  static getBulkActionTemplate(event: Event, data: BulkActionData): string {
    return `<html>... Bulk action template ...</html>`;
  }
}