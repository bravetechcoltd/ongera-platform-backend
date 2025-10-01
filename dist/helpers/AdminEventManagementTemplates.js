"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminEventManagementTemplates = void 0;
const utils_1 = require("./utils");
class AdminEventManagementTemplates {
    /**
     * Template for event date extension
     */
    static getDateExtendedTemplate(event, data, recipientType) {
        const oldStartDate = (0, utils_1.formatDate)(new Date(event.start_datetime));
        const oldEndDate = (0, utils_1.formatDate)(new Date(event.end_datetime));
        const newStartDate = (0, utils_1.formatDate)(data.start_datetime);
        const newEndDate = (0, utils_1.formatDate)(data.end_datetime);
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
    static getEventClosedTemplate(event, data) {
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
    static getEventPostponedTemplate(event, data, recipientType) {
        const oldStartDate = new Date(data.oldDates.start_datetime).toLocaleDateString();
        const oldEndDate = new Date(data.oldDates.end_datetime).toLocaleDateString();
        const newStartDate = new Date(data.newDates.start_datetime).toLocaleDateString();
        const newEndDate = new Date(data.newDates.end_datetime).toLocaleDateString();
        const isOrganizer = recipientType === 'organizer';
        const title = isOrganizer ? 'Event Postponed Successfully' : 'Event Schedule Update';
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
              body { 
                  font-family: 'Arial', sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 20px;
                  background-color: #f4f4f4;
              }
              .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  padding: 30px; 
                  border-radius: 10px; 
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .header { 
                  text-align: center; 
                  padding: 20px 0; 
                  border-bottom: 2px solid #eaeaea;
                  margin-bottom: 30px;
              }
              .header h1 { 
                  color: #2c3e50; 
                  margin: 0;
                  font-size: 28px;
              }
              .content { 
                  margin: 20px 0; 
              }
              .event-card {
                  background: #f8f9fa;
                  border-left: 4px solid #3498db;
                  padding: 20px;
                  margin: 20px 0;
                  border-radius: 5px;
              }
              .date-change {
                  background: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 15px 0;
                  border-radius: 5px;
              }
              .info-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 15px;
                  margin: 20px 0;
              }
              .info-item {
                  padding: 10px;
                  background: #f8f9fa;
                  border-radius: 5px;
              }
              .label {
                  font-weight: bold;
                  color: #2c3e50;
                  display: block;
                  margin-bottom: 5px;
              }
              .reason-box {
                  background: #e8f4fd;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
                  border-left: 4px solid #3498db;
              }
              .button {
                  display: inline-block;
                  padding: 12px 30px;
                  background: #3498db;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                  font-weight: bold;
              }
              .footer { 
                  text-align: center; 
                  margin-top: 30px; 
                  padding-top: 20px;
                  border-top: 1px solid #eaeaea;
                  color: #7f8c8d;
                  font-size: 14px;
              }
              .highlight {
                  background: #fff3cd;
                  padding: 10px;
                  border-radius: 5px;
                  margin: 10px 0;
                  text-align: center;
                  font-weight: bold;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>📅 ${title}</h1>
                  <p>${isOrganizer ? 'Your event has been postponed' : 'An event you registered for has been postponed'}</p>
              </div>
              
              <div class="content">
                  <div class="event-card">
                      <h2 style="color: #2c3e50; margin-top: 0;">${event.title}</h2>
                      <p><strong>Event Type:</strong> ${event.event_type}</p>
                      <p><strong>Mode:</strong> ${event.event_mode}</p>
                      ${event.location_address ? `<p><strong>Location:</strong> ${event.location_address}</p>` : ''}
                      ${event.online_meeting_url ? `<p><strong>Online Link:</strong> ${event.online_meeting_url}</p>` : ''}
                  </div>
                  
                  <div class="date-change">
                      <h3 style="color: #e67e22; margin-top: 0;">📅 Date Changes</h3>
                      <div class="info-grid">
                          <div class="info-item">
                              <span class="label">Previous Start:</span>
                              ${oldStartDate}
                          </div>
                          <div class="info-item">
                              <span class="label">New Start:</span>
                              <strong style="color: #27ae60;">${newStartDate}</strong>
                          </div>
                          <div class="info-item">
                              <span class="label">Previous End:</span>
                              ${oldEndDate}
                          </div>
                          <div class="info-item">
                              <span class="label">New End:</span>
                              <strong style="color: #27ae60;">${newEndDate}</strong>
                          </div>
                      </div>
                  </div>
                  
                  <div class="reason-box">
                      <h4 style="margin-top: 0; color: #2c3e50;">📋 Reason for Postponement</h4>
                      <p>${data.reason}</p>
                  </div>
                  
                  ${isOrganizer ? `
                  <div class="highlight">
                      💡 As the event organizer, you can update event details if needed.
                  </div>
                  ` : `
                  <div class="highlight">
                      🔔 Your registration remains valid for the new dates.
                  </div>
                  `}
                  
                  <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        View Event Details
      </a>
                  </div>
              </div>
              
              <div class="footer">
                  <p>If you have any questions, please contact our support team.</p>
                  <p>&copy; ${new Date().getFullYear()} Your Platform Name. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
    }
    /**
     * Get template for ownership transfer notification
     */
    static getOwnershipTransferredTemplate(event, data, recipientType) {
        const isOldOrganizer = recipientType === 'old_organizer';
        const title = isOldOrganizer ? 'Event Ownership Transferred' : 'You are Now Event Organizer';
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
              body { 
                  font-family: 'Arial', sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 20px;
                  background-color: #f4f4f4;
              }
              .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  padding: 30px; 
                  border-radius: 10px; 
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .header { 
                  text-align: center; 
                  padding: 20px 0; 
                  border-bottom: 2px solid #eaeaea;
                  margin-bottom: 30px;
              }
              .header h1 { 
                  color: #2c3e50; 
                  margin: 0;
                  font-size: 28px;
              }
              .content { 
                  margin: 20px 0; 
              }
              .event-card {
                  background: #f8f9fa;
                  border-left: 4px solid #3498db;
                  padding: 20px;
                  margin: 20px 0;
                  border-radius: 5px;
              }
              .organizer-change {
                  background: #e8f4fd;
                  padding: 20px;
                  border-radius: 5px;
                  margin: 20px 0;
                  border-left: 4px solid #3498db;
              }
              .user-card {
                  background: white;
                  padding: 15px;
                  margin: 10px 0;
                  border-radius: 5px;
                  border: 1px solid #eaeaea;
              }
              .reason-box {
                  background: #fff3cd;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
                  border-left: 4px solid #ffc107;
              }
              .button {
                  display: inline-block;
                  padding: 12px 30px;
                  background: #3498db;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                  font-weight: bold;
              }
              .footer { 
                  text-align: center; 
                  margin-top: 30px; 
                  padding-top: 20px;
                  border-top: 1px solid #eaeaea;
                  color: #7f8c8d;
                  font-size: 14px;
              }
              .highlight {
                  background: #d4edda;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 15px 0;
                  text-align: center;
                  font-weight: bold;
                  color: #155724;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔄 ${title}</h1>
                  <p>${isOldOrganizer ? 'Event ownership has been transferred' : 'You have been assigned as the new organizer'}</p>
              </div>
              
              <div class="content">
                  <div class="event-card">
                      <h2 style="color: #2c3e50; margin-top: 0;">${event.title}</h2>
                      <p><strong>Event Type:</strong> ${event.event_type}</p>
                      <p><strong>Start Date:</strong> ${new Date(event.start_datetime).toLocaleDateString()}</p>
                      <p><strong>End Date:</strong> ${new Date(event.end_datetime).toLocaleDateString()}</p>
                      ${event.location_address ? `<p><strong>Location:</strong> ${event.location_address}</p>` : ''}
                  </div>
                  
                  <div class="organizer-change">
                      <h3 style="color: #2c3e50; margin-top: 0;">👥 Organizer Change</h3>
                      
                      <div class="user-card">
                          <strong>Previous Organizer:</strong><br>
                          ${data.oldOrganizer.first_name} ${data.oldOrganizer.last_name}<br>
                          ${data.oldOrganizer.email}
                      </div>
                      
                      <div style="text-align: center; margin: 10px 0; font-size: 20px;">↓</div>
                      
                      <div class="user-card" style="background: #d4edda;">
                          <strong>New Organizer:</strong><br>
                          ${data.newOrganizer.first_name} ${data.newOrganizer.last_name}<br>
                          ${data.newOrganizer.email}
                      </div>
                  </div>
                  
                  <div class="reason-box">
                      <h4 style="margin-top: 0; color: #2c3e50;">📋 Reason for Transfer</h4>
                      <p>${data.reason}</p>
                  </div>
                  
                  ${isOldOrganizer ? `
                  <div style="background: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24;">
                      ⚠️ You are no longer the organizer of this event. You will lose access to organizer features.
                  </div>
                  ` : `
                  <div class="highlight">
                      🎉 You now have full control over this event. You can manage attendees, agenda, and event settings.
                  </div>
                  `}
                  
                  <div style="text-align: center;">
                      <a href="${process.env.FRONTEND_URL || 'https://yourapp.com'}/events/${event.id}" class="button">
                          ${isOldOrganizer ? 'View Event' : 'Manage Event'}
                      </a>
                  </div>
              </div>
              
              <div class="footer">
                  <p>If you have any questions about this transfer, please contact our support team.</p>
                  <p>&copy; ${new Date().getFullYear()} Your Platform Name. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
    }
    /**
     * Get template for bulk attendee actions
     */
    static getBulkActionTemplate(event, data) {
        const isApproved = data.action === 'approve';
        const title = isApproved ? 'Registration Approved' : 'Registration Update';
        const statusColor = isApproved ? '#27ae60' : '#e74c3c';
        const statusIcon = isApproved ? '✅' : '❌';
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
              body { 
                  font-family: 'Arial', sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 20px;
                  background-color: #f4f4f4;
              }
              .container { 
                  max-width: 600px; 
                  margin: 0 auto; 
                  background: white; 
                  padding: 30px; 
                  border-radius: 10px; 
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .header { 
                  text-align: center; 
                  padding: 20px 0; 
                  border-bottom: 2px solid #eaeaea;
                  margin-bottom: 30px;
              }
              .header h1 { 
                  color: #2c3e50; 
                  margin: 0;
                  font-size: 28px;
              }
              .content { 
                  margin: 20px 0; 
              }
              .status-banner {
                  background: ${isApproved ? '#d4edda' : '#f8d7da'};
                  color: ${isApproved ? '#155724' : '#721c24'};
                  padding: 20px;
                  border-radius: 5px;
                  text-align: center;
                  margin: 20px 0;
                  border-left: 4px solid ${statusColor};
              }
              .event-card {
                  background: #f8f9fa;
                  border-left: 4px solid #3498db;
                  padding: 20px;
                  margin: 20px 0;
                  border-radius: 5px;
              }
              .details-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 15px;
                  margin: 20px 0;
              }
              .detail-item {
                  padding: 10px;
                  background: #f8f9fa;
                  border-radius: 5px;
              }
              .label {
                  font-weight: bold;
                  color: #2c3e50;
                  display: block;
                  margin-bottom: 5px;
              }
              .reason-box {
                  background: #fff3cd;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
                  border-left: 4px solid #ffc107;
              }
              .button {
                  display: inline-block;
                  padding: 12px 30px;
                  background: ${statusColor};
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
                  font-weight: bold;
              }
              .footer { 
                  text-align: center; 
                  margin-top: 30px; 
                  padding-top: 20px;
                  border-top: 1px solid #eaeaea;
                  color: #7f8c8d;
                  font-size: 14px;
              }
              .next-steps {
                  background: #e8f4fd;
                  padding: 15px;
                  border-radius: 5px;
                  margin: 20px 0;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>${statusIcon} ${title}</h1>
                  <p>Your event registration status has been updated</p>
              </div>
              
              <div class="content">
                  <div class="status-banner">
                      <h2 style="margin: 0; font-size: 24px;">
                          Registration ${isApproved ? 'Approved' : 'Not Approved'}
                      </h2>
                      <p style="margin: 10px 0 0 0; font-size: 16px;">
                          ${isApproved ? 'Congratulations! Your registration has been approved.' : 'Your registration request was not approved for this event.'}
                      </p>
                  </div>
                  
                  <div class="event-card">
                      <h3 style="color: #2c3e50; margin-top: 0;">Event Details</h3>
                      <div class="details-grid">
                          <div class="detail-item">
                              <span class="label">Event:</span>
                              ${event.title}
                          </div>
                          <div class="detail-item">
                              <span class="label">Type:</span>
                              ${event.event_type}
                          </div>
                          <div class="detail-item">
                              <span class="label">Start Date:</span>
                              ${new Date(event.start_datetime).toLocaleDateString()}
                          </div>
                          <div class="detail-item">
                              <span class="label">End Date:</span>
                              ${new Date(event.end_datetime).toLocaleDateString()}
                          </div>
                          ${event.location_address ? `
                          <div class="detail-item">
                              <span class="label">Location:</span>
                              ${event.location_address}
                          </div>
                          ` : ''}
                          ${event.max_attendees ? `
                          <div class="detail-item">
                              <span class="label">Capacity:</span>
                              ${event.max_attendees} attendees
                          </div>
                          ` : ''}
                      </div>
                  </div>
                  
                  ${data.reason ? `
                  <div class="reason-box">
                      <h4 style="margin-top: 0; color: #2c3e50;">📋 Administrator Note</h4>
                      <p>${data.reason}</p>
                  </div>
                  ` : ''}
                  
                  ${isApproved ? `
                  <div class="next-steps">
                      <h4 style="margin-top: 0; color: #2c3e50;">🎯 Next Steps</h4>
                      <p>You are now confirmed to attend this event. Please mark your calendar and prepare accordingly.</p>
                      ${event.location_address ? `<p><strong>Location:</strong> ${event.location_address}</p>` : ''}
                      ${event.online_meeting_url ? `<p><strong>Join URL:</strong> ${event.online_meeting_url}</p>` : ''}
                  </div>
                  ` : `
                  <div class="next-steps">
                      <h4 style="margin-top: 0; color: #2c3e50;">ℹ️ Additional Information</h4>
                      <p>If you believe this is an error or would like more information, please contact the event organizer.</p>
                  </div>
                  `}
                  
                  <div style="text-align: center;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${event.id}" 
         style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; margin: 20px 0;">
        View Event Details
      </a>
                  </div>
              </div>
              
              <div class="footer">
                  <p>This is an automated notification. Please do not reply to this email.</p>
                  <p>&copy; ${new Date().getFullYear()} Your Platform Name. All rights reserved.</p>
              </div>
          </div>
      </body>
      </html>
    `;
    }
}
exports.AdminEventManagementTemplates = AdminEventManagementTemplates;
