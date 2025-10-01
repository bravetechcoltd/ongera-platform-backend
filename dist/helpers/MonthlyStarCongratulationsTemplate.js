"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyStarCongratulationsTemplate = void 0;
class MonthlyStarCongratulationsTemplate {
    static getCongratulationsEmail(data) {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Monthly Star Award</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.1;">
        <div style="position: absolute; top: 10%; left: 10%; width: 100px; height: 100px; background: white; border-radius: 50%;"></div>
        <div style="position: absolute; bottom: 20%; right: 15%; width: 60px; height: 60px; background: white; border-radius: 50%;"></div>
      </div>
      <div style="position: relative; z-index: 1;">
        <h1 style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 10px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
          🌟 Congratulations! 🌟
        </h1>
        <p style="color: white; font-size: 18px; margin: 0; opacity: 0.95;">
          You're Our Monthly Star!
        </p>
      </div>
    </div>
    
    <!-- Body -->
    <div style="padding: 40px 30px; background: white;">
      <div style="font-size: 18px; color: #1a1a1a; margin-bottom: 25px;">
        Dear ${data.user.first_name},
      </div>
      
      <div style="color: #4a4a4a; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
        We are thrilled to announce that you have been selected as the <strong style="color: #FFD700;">Monthly Star</strong> for <strong>${data.month} ${data.year}</strong>${data.community_name ? ` in the <strong>${data.community_name}</strong> community` : ' across the entire Ongera platform'}!
      </div>
      
      <!-- Badge Image -->
      ${data.badge_image_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <img src="${data.badge_image_url}" alt="Monthly Star Badge" style="max-width: 200px; height: auto; border-radius: 12px; box-shadow: 0 8px 24px rgba(255, 215, 0, 0.3);" />
      </div>
      ` : ''}
      
      <!-- Admin Description -->
      <div style="background: linear-gradient(135deg, #FFF9E6 0%, #FFE6B3 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #FFD700;">
        <h3 style="color: #D4AF37; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          ✨ Your Achievements
        </h3>
        <div style="color: #5a4a2a; font-size: 15px; line-height: 1.7;">
          ${data.description}
        </div>
      </div>
      
      <!-- Statistics Cards -->
      <div style="margin: 30px 0;">
        <h3 style="color: #2c3e50; font-size: 18px; margin: 0 0 20px 0; text-align: center; font-weight: 600;">
          📊 Your Outstanding Performance
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${data.statistics.projects_count}</div>
            <div style="font-size: 13px; opacity: 0.9;">Projects Uploaded</div>
          </div>
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${data.statistics.blogs_count}</div>
            <div style="font-size: 13px; opacity: 0.9;">Blog Posts</div>
          </div>
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${data.statistics.events_count}</div>
            <div style="font-size: 13px; opacity: 0.9;">Events Attended</div>
          </div>
          <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
            <div style="font-size: 32px; font-weight: bold; margin-bottom: 5px;">${data.statistics.followers_count}</div>
            <div style="font-size: 13px; opacity: 0.9;">New Followers</div>
          </div>
        </div>
        <div style="margin-top: 15px; text-align: center;">
          <div style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 15px 30px; border-radius: 25px; color: white;">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 3px;">Total Score</div>
            <div style="font-size: 28px; font-weight: bold;">${data.statistics.total_score} Points</div>
          </div>
        </div>
      </div>
      
      <!-- Rewards Section -->
      ${data.rewards ? `
      <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 4px solid #4CAF50;">
        <h3 style="color: #2E7D32; font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">
          🎁 Your Rewards
        </h3>
        <div style="color: #1B5E20; font-size: 15px; line-height: 1.7;">
          ${data.rewards}
        </div>
      </div>
      ` : ''}
      
      <!-- Motivational Message -->
      <div style="background: #f8f9fa; padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
        <p style="color: #495057; font-size: 15px; line-height: 1.7; margin: 0;">
          Your dedication to advancing research and fostering collaboration is truly inspiring. Keep up the excellent work and continue to shine as a beacon of excellence in our community!
        </p>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);">
          Visit Your Dashboard
        </a>
      </div>
      
      <div style="height: 1px; background: linear-gradient(to right, transparent, #e9ecef, transparent); margin: 30px 0;"></div>
      
      <div style="color: #6c757d; font-size: 14px; text-align: center; line-height: 1.6;">
        Thank you for being an outstanding member of the Ongera community!
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); padding: 30px; text-align: center;">
      <div style="color: white; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
        <strong>Ongera Research Platform</strong><br>
        Empowering Rwanda's Research Community
      </div>
      <div style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin-bottom: 15px;">
        Connecting Researchers • Advancing Knowledge • Building the Future
      </div>
      <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px;">
        © ${new Date().getFullYear()} Ongera. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
    `;
    }
}
exports.MonthlyStarCongratulationsTemplate = MonthlyStarCongratulationsTemplate;
