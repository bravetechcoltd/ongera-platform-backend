// @ts-nocheck

export class NewsletterTemplate {
  static getNewsletterTemplate(newsData: any, unsubscribeLink: string = '#'): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${newsData.title} - Zola Real Estate</title>
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .header { padding: 20px 15px !important; }
          .content { padding: 20px 15px !important; }
          .news-card { margin: 15px 0 !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;" class="container">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1B4332 0%, #2d6a4f 100%); color: white; padding: 30px 20px; text-align: center;" class="header">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <div style="font-size: 24px;">🏠</div>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Zola Real Estate</h1>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Rwanda Market Insights</p>
            </div>
          </div>
          <h2 style="margin: 10px 0 0 0; font-size: 18px; font-weight: 300; opacity: 0.9;">Latest Market Update</h2>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;" class="content">
          
          <!-- News Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <span style="background: #e7f5f1; color: #1B4332; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
              ${newsData.category.replace('_', ' ')}
            </span>
            <h1 style="color: #1B4332; margin: 15px 0 10px 0; font-size: 24px; line-height: 1.4;">${newsData.title}</h1>
            <div style="color: #666; font-size: 14px;">
              ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} • ${newsData.read_time || '3 min read'}
            </div>
          </div>

          <!-- Featured Image -->
          ${newsData.featured_image ? `
          <div style="margin-bottom: 25px; text-align: center;">
            <img src="${newsData.featured_image}" alt="${newsData.title}" 
                 style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          </div>
          ` : ''}

          <!-- Summary -->
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 16px; display: flex; align-items: center;">
              <span style="margin-right: 10px;">💡</span>
              Key Insights
            </h3>
            <p style="color: #333; line-height: 1.6; margin: 0; font-size: 14px;">${newsData.summary}</p>
          </div>

          <!-- Content -->
          <div style="color: #333; line-height: 1.7; margin-bottom: 30px;">
            ${newsData.content.split('\n').map(paragraph => 
              `<p style="margin-bottom: 15px; font-size: 15px;">${paragraph}</p>`
            ).join('')}
          </div>

          <!-- Call to Action -->
          <div style="background: linear-gradient(135deg, #1B4332 0%, #2d6a4f 100%); color: white; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 25px;">
            <h3 style="margin-top: 0; font-size: 18px;">Want More Detailed Analysis?</h3>
            <p style="margin-bottom: 20px; opacity: 0.9; font-size: 14px;">
              Visit our website for comprehensive market reports, investment guides, and personalized consultation.
            </p>
            <a href="https://yourwebsite.com/market-news/${newsData.news_id}" 
               style="display: inline-block; background: white; color: #1B4332; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
              Read Full Analysis
            </a>
          </div>

          <!-- Additional Resources -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 20px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 16px;">You Might Also Like</h3>
            <div style="display: grid; gap: 15px; margin-top: 15px;">
              <a href="#" style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; text-decoration: none; color: #333; border: 1px solid #e9ecef;">
                <span style="margin-right: 12px;">📊</span>
                <div>
                  <strong style="color: #1B4332;">Q3 2024 Market Report</strong>
                  <div style="font-size: 12px; color: #666;">Complete analysis of Rwanda's real estate performance</div>
                </div>
              </a>
              <a href="#" style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; text-decoration: none; color: #333; border: 1px solid #e9ecef;">
                <span style="margin-right: 12px;">🏘️</span>
                <div>
                  <strong style="color: #1B4332;">Top 5 Investment Areas in Kigali</strong>
                  <div style="font-size: 12px; color: #666;">Where to invest for maximum returns</div>
                </div>
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1B4332; color: white; padding: 25px 20px; text-align: center;">
          <h3 style="margin-top: 0; font-size: 16px;">Stay Connected</h3>
          <div style="margin: 20px 0;">
            <a href="#" style="display: inline-block; margin: 0 8px; color: white; text-decoration: none; font-size: 20px;">📘</a>
            <a href="#" style="display: inline-block; margin: 0 8px; color: white; text-decoration: none; font-size: 20px;">🐦</a>
            <a href="#" style="display: inline-block; margin: 0 8px; color: white; text-decoration: none; font-size: 20px;">📷</a>
            <a href="#" style="display: inline-block; margin: 0 8px; color: white; text-decoration: none; font-size: 20px;">💼</a>
          </div>
          <p style="margin: 15px 0 0 0; font-size: 12px; opacity: 0.8;">
            Zola Real Estate Consultancy Rwanda LTD • RDB Licensed & Registered<br>
            📧 ndisanzemarine@gmail.com • 📱 +250 788 XXX XXX
          </p>
          <p style="margin: 15px 0 0 0; font-size: 11px; opacity: 0.6;">
            You're receiving this email because you subscribed to Rwanda real estate market updates.<br>
            <a href="${unsubscribeLink}" style="color: #D4AF37; text-decoration: none;">Unsubscribe</a> 
            or 
            <a href="#" style="color: #D4AF37; text-decoration: none;">update preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}