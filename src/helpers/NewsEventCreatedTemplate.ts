interface EventData {
  title: string;
  description: string;
  event_type: string;
  event_mode: string;
  start_datetime: Date;
  end_datetime: Date;
  timezone: string;
  location_address?: string;
  online_meeting_url?: string;
  cover_image_url?: string;
  is_free: boolean;
  price_amount?: number;
  max_attendees?: number;
  requires_approval: boolean;
  organizer: {
    first_name: string;
    last_name: string;
    profile?: {
      institution_name?: string;
    };
  };
  community: {
    name: string;
    member_count: number;
  };
  event_id: string;
}

interface MemberData {
  first_name: string;
}

export class NewsEventCreatedTemplate {
  static getEventCreatedTemplate(eventData: EventData, memberData: MemberData): string {
    const organizerInitials = `${eventData.organizer.first_name.charAt(0)}${eventData.organizer.last_name.charAt(0)}`;
    
    // Format dates
    const startDate = new Date(eventData.start_datetime);
    const endDate = new Date(eventData.end_datetime);
    
    const eventDateLong = startDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    const eventDateShort = startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const startTime = startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const endTime = endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Calculate event duration
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationText = durationHours > 0 
      ? `${durationHours}h ${durationMinutes}m` 
      : `${durationMinutes}m`;
    
    // Event mode icons and labels
    const modeIcons: Record<string, string> = {
      'Online': '💻',
      'Physical': '📍',
      'Hybrid': '🔄'
    };
    
    const typeIcons: Record<string, string> = {
      'Webinar': '🎥',
      'Conference': '🎯',
      'Workshop': '🛠️',
      'Seminar': '📚',
      'Meetup': '🤝'
    };
    
    const modeIcon = modeIcons[eventData.event_mode] || '📅';
    const typeIcon = typeIcons[eventData.event_type] || '📅';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Event: ${eventData.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      background-color: #f8f9fa; 
      padding: 20px; 
      line-height: 1.6;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff; 
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px; 
      text-align: center; 
    }
    .content { padding: 36px 28px; }
    .footer { 
      background-color: #2d3748; 
      color: #a0aec0; 
      padding: 28px 24px; 
      text-align: center; 
      font-size: 12px; 
    }
    .btn-primary { 
      display: inline-block; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      padding: 15px 36px; 
      text-decoration: none; 
      border-radius: 10px; 
      font-weight: 600; 
      font-size: 15px; 
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
      transition: all 0.3s ease;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.35);
    }
    .btn-secondary { 
      display: inline-block; 
      background-color: #ffffff; 
      color: #4a5568; 
      padding: 11px 22px; 
      text-decoration: none; 
      border-radius: 8px; 
      font-weight: 500; 
      font-size: 14px; 
      border: 2px solid #e2e8f0; 
      transition: all 0.3s ease;
    }
    .btn-secondary:hover {
      border-color: #667eea;
      color: #667eea;
      background-color: #f7faff;
    }
    .badge { 
      display: inline-block; 
      background-color: #eef2ff; 
      color: #5a67d8; 
      padding: 6px 14px; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
      margin-right: 8px;
      border: 1px solid #c3dafe;
    }
    .badge-free { 
      background-color: #d1fae5; 
      color: #065f46; 
      border-color: #a7f3d0;
    }
    .badge-paid { 
      background-color: #fef3c7; 
      color: #92400e; 
      border-color: #fde68a;
    }
    .stat-box { 
      display: inline-block; 
      background-color: #fafbfc; 
      border: 2px solid #edf2f7; 
      border-radius: 12px; 
      padding: 16px 20px; 
      margin: 8px 6px; 
      text-align: center;
      transition: all 0.3s ease;
    }
    .stat-box:hover {
      border-color: #cbd5e0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .stat-number { 
      font-size: 22px; 
      font-weight: 700; 
      color: #667eea; 
      display: block; 
    }
    .stat-label { 
      font-size: 11px; 
      color: #718096; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
      margin-top: 6px;
      font-weight: 500;
    }
    .organizer-card { 
      display: flex; 
      align-items: center; 
      background-color: #f7fafc; 
      border-radius: 12px; 
      padding: 20px; 
      margin: 24px 0; 
      border-left: 5px solid #667eea;
      transition: all 0.3s ease;
    }
    .organizer-card:hover {
      background-color: #eef2ff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .divider { 
      height: 1px; 
      background-color: #e2e8f0; 
      margin: 28px 0; 
    }
    .event-card {
      background-color: #fafcff;
      border: 2px solid #e0e7ff;
      border-radius: 14px;
      padding: 24px;
      margin: 28px 0;
      transition: all 0.3s ease;
    }
    .event-card:hover {
      border-color: #c7d2fe;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.08);
    }
    .cover-image {
      width: 100%;
      height: 250px;
      object-fit: cover;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .date-badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 20px;
    }
    .date-day {
      font-size: 32px;
      font-weight: 700;
      display: block;
    }
    .date-month {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .location-info {
      background-color: #f0f9ff;
      border: 2px solid #bae6fd;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .community-card {
      background-color: #f7fafc;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      padding: 24px;
      margin: 24px 0;
      transition: all 0.3s ease;
    }
    .community-card:hover {
      border-color: #cbd5e0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
    }
    .action-card {
      background-color: #fef3c7;
      border: 2px solid #fde68a;
      border-radius: 14px;
      padding: 24px;
      margin: 28px 0;
    }
    .action-item {
      display: flex;
      align-items: center;
      padding: 14px;
      background: white;
      border-radius: 10px;
      text-decoration: none;
      color: #4a5568;
      border: 2px solid #e2e8f0;
      margin-bottom: 12px;
      transition: all 0.3s ease;
    }
    .action-item:last-child {
      margin-bottom: 0;
    }
    .action-item:hover {
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
      transform: translateX(4px);
    }
    .header-logo {
      width: 52px;
      height: 52px;
      background-color: rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 14px;
      backdrop-filter: blur(10px);
    }
    .notification-badge {
      background-color: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 10px;
      padding: 14px;
      margin-top: 20px;
      backdrop-filter: blur(10px);
    }
    .highlight-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      border: 2px solid #fbbf24;
    }
    
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 12px; }
      .content { padding: 28px 20px !important; }
      .header { padding: 28px 20px !important; }
      .btn-primary { padding: 13px 28px !important; font-size: 14px !important; }
      .stat-box { margin: 6px 4px !important; padding: 14px 16px !important; }
      .event-card { padding: 20px !important; }
      .community-card { padding: 20px !important; }
      .action-card { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Header -->
    <div class="header">
      <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <div style="text-align: left;">
          <h1 style="color: white; font-size: 23px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">Research Hub</h1>
          <p style="color: rgba(255,255,255,0.95); font-size: 12px; margin: 0; font-weight: 500;">Rwanda Academic Network</p>
        </div>
      </div>
      <div class="notification-badge">
        <p style="color: white; font-size: 13px; margin: 0; font-weight: 600;">✨ New Event in Your Community</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="content">
      
      <!-- Greeting -->
      <div style="margin-bottom: 28px;">
        <h2 style="color: #1a202c; font-size: 20px; margin-bottom: 10px; font-weight: 700;">Hi ${memberData.first_name},</h2>
        <p style="color: #718096; font-size: 15px; line-height: 1.7; margin: 0;">
          Exciting news! A new event has been scheduled in 
          <strong style="color: #667eea; font-weight: 600;">${eventData.community.name}</strong>. 
          Don't miss out! 🎉
        </p>
      </div>

      <!-- Event Card -->
      <div class="event-card">
        
        ${eventData.cover_image_url ? `<img src="${eventData.cover_image_url}" alt="${eventData.title}" class="cover-image">` : ''}
        
        <!-- Date Badge -->
        <div class="date-badge">
          <span class="date-day">${startDate.getDate()}</span>
          <span class="date-month">${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        </div>

        <!-- Event Badges -->
        <div style="margin-bottom: 16px;">
          <span class="badge">${typeIcon} ${eventData.event_type}</span>
          <span class="badge">${modeIcon} ${eventData.event_mode}</span>
          <span class="badge ${eventData.is_free ? 'badge-free' : 'badge-paid'}">${eventData.is_free ? '🎁 Free' : `💰 $${eventData.price_amount}`}</span>
        </div>

        <!-- Event Title -->
        <h3 style="color: #5a67d8; font-size: 21px; font-weight: 700; margin-bottom: 14px; line-height: 1.4; letter-spacing: -0.3px;">
          ${eventData.title}
        </h3>

        <!-- Event Description -->
        <p style="color: #4a5568; font-size: 14px; line-height: 1.7; margin-bottom: 20px;">
          ${eventData.description.substring(0, 250)}${eventData.description.length > 250 ? '...' : ''}
        </p>

        <!-- Event Stats -->
        <div style="text-align: center; margin: 24px 0;">
          <div class="stat-box">
            <span class="stat-number">📅</span>
            <span class="stat-label">${eventDateShort}</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">⏰</span>
            <span class="stat-label">${startTime}</span>
          </div>
          <div class="stat-box">
            <span class="stat-number">${durationText}</span>
            <span class="stat-label">Duration</span>
          </div>
        </div>

        <!-- Location/Meeting Info -->
        ${eventData.event_mode === 'Online' || eventData.event_mode === 'Hybrid' ? `
        <div class="location-info">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 20px; margin-right: 10px;">💻</span>
            <strong style="color: #0369a1; font-size: 14px;">Online Meeting</strong>
          </div>
          <p style="color: #64748b; font-size: 13px; margin: 0;">
            Meeting link will be provided after registration
          </p>
        </div>
        ` : ''}

        ${eventData.event_mode === 'Physical' || eventData.event_mode === 'Hybrid' ? `
        <div class="location-info" style="background-color: #fef3c7; border-color: #fde68a;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 20px; margin-right: 10px;">📍</span>
            <strong style="color: #92400e; font-size: 14px;">Event Location</strong>
          </div>
          <p style="color: #78350f; font-size: 13px; margin: 0;">
            ${eventData.location_address || 'Location will be announced'}
          </p>
        </div>
        ` : ''}

        ${eventData.max_attendees ? `
        <div class="highlight-box">
          <p style="color: #92400e; font-size: 13px; margin: 0; text-align: center; font-weight: 600;">
            ⚡ Limited Seats: ${eventData.max_attendees} attendees maximum
          </p>
        </div>
        ` : ''}

        ${eventData.requires_approval ? `
        <div style="background-color: #fef3c7; border: 2px solid #fde68a; border-radius: 10px; padding: 14px; margin: 16px 0;">
          <p style="color: #92400e; font-size: 13px; margin: 0; text-align: center; font-weight: 600;">
            ⚠️ This event requires organizer approval
          </p>
        </div>
        ` : ''}

        <!-- CTA Button -->
        <div style="text-align: center; margin-top: 24px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventData.event_id}" class="btn-primary">
            🎟️ Register Now
          </a>
        </div>
      </div>

      <!-- Full Event Details -->
      <div style="background-color: #f7fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h4 style="color: #1a202c; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">📋 Event Details</h4>
        <div style="color: #4a5568; font-size: 14px; line-height: 1.8;">
          <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${eventDateLong}</p>
          <p style="margin: 8px 0;"><strong>🕐 Time:</strong> ${startTime} - ${endTime} (${eventData.timezone})</p>
          <p style="margin: 8px 0;"><strong>🎯 Type:</strong> ${eventData.event_type}</p>
          <p style="margin: 8px 0;"><strong>🌐 Mode:</strong> ${eventData.event_mode}</p>
          ${eventData.max_attendees ? `<p style="margin: 8px 0;"><strong>👥 Capacity:</strong> ${eventData.max_attendees} attendees</p>` : ''}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Organizer Information -->
      <div class="organizer-card">
        <div style="flex: 1;">
          <h4 style="color: #1a202c; font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">
            Organized by ${eventData.organizer.first_name} ${eventData.organizer.last_name}
          </h4>
          <p style="color: #a0aec0; font-size: 13px; margin: 0; font-weight: 500;">
            🏛️ ${eventData.organizer.profile?.institution_name || 'Research Institution'}
          </p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Community Information -->
      <div class="community-card">
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="color: #1a202c; font-size: 17px; font-weight: 600; margin: 0 0 4px 0;">
              ${eventData.community.name}
            </h4>
            <p style="color: #718096; font-size: 13px; margin: 0; font-weight: 500;">
              ${eventData.community.member_count} members
            </p>
          </div>
        </div>
        <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 16px 0 20px 0;">
          Join your community members at this exciting event and expand your network!
        </p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/communities/${eventData.community.name.toLowerCase().replace(/\s+/g, '-')}" class="btn-secondary">
          Visit Community →
        </a>
      </div>

      <!-- Quick Actions -->
      <div class="action-card">
        <h4 style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0 0 20px 0; display: flex; align-items: center;">
          <span style="margin-right: 10px;">⚡</span>
          Quick Actions
        </h4>
        <div>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventData.event_id}" class="action-item">
            <span style="margin-right: 14px; font-size: 20px;">🎟️</span>
            <div style="flex: 1; text-align: left;">
              <strong style="color: #1a202c; font-size: 14px; display: block; font-weight: 600;">Register for Event</strong>
              <span style="color: #718096; font-size: 12px;">Secure your spot now</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventData.event_id}#agenda" class="action-item">
            <span style="margin-right: 14px; font-size: 20px;">📋</span>
            <div style="flex: 1; text-align: left;">
              <strong style="color: #1a202c; font-size: 14px; display: block; font-weight: 600;">View Event Agenda</strong>
              <span style="color: #718096; font-size: 12px;">See what's planned</span>
            </div>
          </a>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/events" class="action-item">
            <span style="margin-right: 14px; font-size: 20px;">🔍</span>
            <div style="flex: 1; text-align: left;">
              <strong style="color: #1a202c; font-size: 14px; display: block; font-weight: 600;">Explore More Events</strong>
              <span style="color: #718096; font-size: 12px;">Discover upcoming events</span>
            </div>
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <h4 style="color: #e2e8f0; font-size: 15px; margin: 0 0 16px 0; font-weight: 600;">Stay Connected</h4>
      <div style="margin: 20px 0;">
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">📘</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">🐦</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">📷</a>
        <a href="#" style="display: inline-block; margin: 0 10px; color: #a0aec0; text-decoration: none; font-size: 26px; transition: transform 0.2s;">💼</a>
      </div>
      <p style="margin: 20px 0 10px 0; color: #a0aec0; line-height: 1.6;">
        Rwanda Research Hub • Academic Collaboration Platform<br>
        📧 support@researchhub.rw
      </p>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #4a5568;">
        <p style="margin: 0 0 10px 0; color: #718096; font-size: 11px; line-height: 1.5;">
          You're receiving this email because you're a member of <strong>${eventData.community.name}</strong>.
        </p>
        <p style="margin: 0; color: #718096; font-size: 11px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/unsubscribe" style="color: #667eea; text-decoration: none; font-weight: 500;">Unsubscribe from community notifications</a>
          •
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/preferences" style="color: #667eea; text-decoration: none; font-weight: 500;">Update email preferences</a>
        </p>
      </div>
      <p style="margin: 20px 0 0 0; color: #4a5568; font-size: 10px; line-height: 1.5;">
        © ${new Date().getFullYear()} Rwanda Research Hub. All rights reserved.<br>
        KN 123 St, Kigali, Rwanda
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }
}