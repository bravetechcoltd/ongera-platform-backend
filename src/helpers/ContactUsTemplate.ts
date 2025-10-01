import { formatDate } from './utils';

export class ContactUsTemplate {

  static getUserConfirmationTemplate(contactData: any): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thank You for Contacting Zola Real Estate</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1B4332 0%, #D4AF37 100%); color: white; padding: 30px 20px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <div style="font-size: 24px;">🏠</div>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Zola Real Estate</h1>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Rwanda Investment Experts</p>
            </div>
          </div>
          <h2 style="margin: 0; font-size: 28px; font-weight: bold;">Thank You for Your Inquiry!</h2>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 20px;">Hello ${contactData.first_name}!</h3>
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              We've received your message and truly appreciate you reaching out to Zola Real Estate. 
              Your inquiry is important to us, and we're excited to help you with your ${contactData.category.replace('_', ' ')} needs.
            </p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #1B4332;">
              <h4 style="color: #1B4332; margin-top: 0; font-size: 16px;">Your Inquiry Summary:</h4>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #666; font-weight: bold; width: 30%;">Reference ID:</td>
                  <td style="padding: 5px 0; color: #333;">#ZRE-${contactData.contact_id || 'PENDING'}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666; font-weight: bold;">Subject:</td>
                  <td style="padding: 5px 0; color: #333;">${contactData.subject}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666; font-weight: bold;">Category:</td>
                  <td style="padding: 5px 0; color: #333;">${contactData.category.replace('_', ' ').toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666; font-weight: bold;">Submitted:</td>
                  <td style="padding: 5px 0; color: #333;">${formatDate(new Date())}</td>
                </tr>
              </table>
            </div>
          </div>

          <!-- What Happens Next -->
          <div style="background: linear-gradient(135deg, #e7f5f1 0%, #d1f2eb 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 18px; display: flex; align-items: center;">
              <span style="margin-right: 10px;">⏱️</span>
              What Happens Next?
            </h3>
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: flex-start;">
<div style="
  color: #1B4332; 
  border-radius: 50%; 
  width: 24px; 
  height: 24px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 12px; 
  font-weight: bold; 
  margin-right: 15px; 
  flex-shrink: 0; 
  line-height: 1;
">
  1
</div>

                <div>
                  <strong style="color: #1B4332;">Quick Review (Within 2 hours)</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Our expert team will review your inquiry and assign the right specialist.</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
<div style="
   color: #1B4332; 

  border-radius: 50%; 
  width: 24px; 
  height: 24px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 12px; 
  font-weight: bold; 
  margin-right: 15px; 
  flex-shrink: 0; 
">
  2
</div>

                <div>
                  <strong style="color: #1B4332;">Personal Response (Within 24 hours)</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">You'll receive a detailed response from our investment consultant.</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
<div style="
   color: #1B4332; 
 
  border-radius: 50%; 
  width: 24px; 
  height: 24px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 12px; 
  font-weight: bold; 
  margin-right: 15px; 
  flex-shrink: 0; 
  line-height: 1;
">
  3
</div>

                <div>
                  <strong style="color: #1B4332;">Free Consultation Call</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">We'll schedule a complimentary consultation to discuss your investment goals.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Resources -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 18px;">While You Wait - Useful Resources</h3>
            <div style="display: grid; gap: 12px;">
              <a href="#" style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; text-decoration: none; color: #333; border: 1px solid #e9ecef;margin-bottom: 10px">
                <span style="margin-right: 12px;">📊</span>
                <div>
                  <strong>Rwanda Property Market Report 2025</strong>
                  <div style="font-size: 12px; color: #666;">Latest market trends and investment insights</div>
                </div>
              </a>
              <a href="#" style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; text-decoration: none; color: #333; border: 1px solid #e9ecef; margin-bottom: 10px">
                <span style="margin-right: 12px;">📚</span>
                <div>
                  <strong>Foreign Investor's Guide to Rwanda</strong>
                  <div style="font-size: 12px; color: #666;">Complete legal and process information</div>
                </div>
              </a>
              <a href="#" style="display: flex; align-items: center; padding: 12px; background: white; border-radius: 8px; text-decoration: none; color: #333; border: 1px solid #e9ecef; margin-bottom: 10px">
                <span style="margin-right: 12px;">🏘️</span>
                <div>
                  <strong>Featured Properties Catalog</strong>
                  <div style="font-size: 12px; color: #666;">Browse our latest investment opportunities</div>
                </div>
              </a>
            </div>
          </div>

          <!-- Contact Information -->
          <div style="background: linear-gradient(135deg, #1B4332 0%, #2d5a3d 100%); color: white; border-radius: 12px; padding: 25px; text-align: center;">
            <h3 style="margin-top: 0; font-size: 18px;">Need Immediate Assistance?</h3>
            <div style="display: grid; gap: 15px; margin-top: 20px;">
              <div style="display: flex; align-items: center; justify-content: center;">
                <span style="margin-right: 10px;">📱</span>
                <div>
                  <strong>WhatsApp:</strong> +250 788 XXX XXX
                  <div style="font-size: 12px; opacity: 0.8;">Quick responses during business hours</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: center;">
                <span style="margin-right: 10px;">📧</span>
                <div>
                  <strong>Email:</strong> ndisanzemarine@gmail.com
                  <div style="font-size: 12px; opacity: 0.8;">For detailed inquiries</div>
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: center;">
                <span style="margin-right: 10px;">🕒</span>
                <div>
                  <strong>Office Hours:</strong> Mon-Fri, 8:00 AM - 6:00 PM CAT
                  <div style="font-size: 12px; opacity: 0.8;">Kigali, Rwanda</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
            <strong>Zola Real Estate Consultancy Rwanda LTD</strong>
          </p>
          <p style="margin: 0 0 15px 0; color: #666; font-size: 12px;">
            RDB Licensed & Registered | Your Trusted Investment Partner
          </p>
          <div style="margin: 15px 0;">
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">📘</a>
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">🐦</a>
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">📷</a>
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">💼</a>
          </div>
          <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">
            This email was sent because you contacted us through our website. 
            If you have any questions, please reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  static getAdminNotificationTemplate(contactData: any): string {
    const priorityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };

    const priorityColor = priorityColors[contactData.priority as keyof typeof priorityColors] || '#6c757d';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Contact Us Inquiry - Zola Real Estate</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">🚨 New Contact Us Inquiry</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Priority: ${contactData.priority.toUpperCase()}</p>
        </div>

        <!-- Priority Badge -->
        <div style="padding: 15px 20px 0 20px;">
          <div style="display: inline-block; background: ${priorityColor}; color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold;">
            ${contactData.priority.toUpperCase()} PRIORITY
          </div>
        </div>

        <!-- Contact Information -->
        <div style="padding: 20px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #1B4332; margin-top: 0; font-size: 18px;">Contact Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold; width: 30%; border-bottom: 1px solid #eee;">Name:</td>
                <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee;"><strong>${contactData.first_name} ${contactData.last_name}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td>
                <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee;"><a href="mailto:${contactData.email}" style="color: #1B4332;">${contactData.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold; border-bottom: 1px solid #eee;">Phone:</td>
                <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee;">${contactData.phone || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold; border-bottom: 1px solid #eee;">Company:</td>
                <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee;">${contactData.company || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold; border-bottom: 1px solid #eee;">Category:</td>
                <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee;"><span style="background: #e7f5f1; color: #1B4332; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${contactData.category.replace('_', ' ').toUpperCase()}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold; border-bottom: 1px solid #eee;">Subject:</td>
                <td style="padding: 8px 0; color: #333; border-bottom: 1px solid #eee;"><strong>${contactData.subject}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666; font-weight: bold;">Submitted:</td>
                <td style="padding: 8px 0; color: #333;">${formatDate(new Date())}</td>
              </tr>
            </table>
          </div>

          <!-- Message Content -->
          <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 16px;">Message:</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #1B4332;">
              <p style="margin: 0; color: #333; line-height: 1.6; white-space: pre-wrap;">${contactData.message}</p>
            </div>
          </div>

          <!-- Investment Details -->
          ${contactData.investment_budget || contactData.location_interest || contactData.property_type_interest || contactData.timeline ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #856404; margin-top: 0; font-size: 16px;">Investment Details:</h3>
            <table style="width: 100%;">
              ${contactData.investment_budget ? `
              <tr>
                <td style="padding: 5px 0; color: #856404; font-weight: bold; width: 30%;">Budget:</td>
                <td style="padding: 5px 0; color: #333;">${contactData.investment_budget}</td>
              </tr>` : ''}
              ${contactData.location_interest ? `
              <tr>
                <td style="padding: 5px 0; color: #856404; font-weight: bold;">Location:</td>
                <td style="padding: 5px 0; color: #333;">${contactData.location_interest}</td>
              </tr>` : ''}
              ${contactData.property_type_interest ? `
              <tr>
                <td style="padding: 5px 0; color: #856404; font-weight: bold;">Property Type:</td>
                <td style="padding: 5px 0; color: #333;">${contactData.property_type_interest}</td>
              </tr>` : ''}
              ${contactData.timeline ? `
              <tr>
                <td style="padding: 5px 0; color: #856404; font-weight: bold;">Timeline:</td>
                <td style="padding: 5px 0; color: #333;">${contactData.timeline}</td>
              </tr>` : ''}
            </table>
          </div>` : ''}

          <!-- Contact Preferences -->
          ${contactData.preferred_contact_method || contactData.preferred_contact_time ? `
          <div style="background: #e7f5f1; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 16px;">Contact Preferences:</h3>
            <table style="width: 100%;">
              ${contactData.preferred_contact_method ? `
              <tr>
                <td style="padding: 5px 0; color: #1B4332; font-weight: bold; width: 30%;">Method:</td>
                <td style="padding: 5px 0; color: #333;">${contactData.preferred_contact_method}</td>
              </tr>` : ''}
              ${contactData.preferred_contact_time ? `
              <tr>
                <td style="padding: 5px 0; color: #1B4332; font-weight: bold;">Time:</td>
                <td style="padding: 5px 0; color: #333;">${contactData.preferred_contact_time}</td>
              </tr>` : ''}
            </table>
          </div>` : ''}

          <!-- Attachments -->
          ${contactData.attachments && contactData.attachments.length > 0 ? `
          <div style="background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1565c0; margin-top: 0; font-size: 16px;">📎 Attachments (${contactData.attachments.length}):</h3>
            <div style="display: grid; gap: 10px;">
              ${contactData.attachments.map((attachment: any, index: number) => `
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <strong>${attachment.originalName}</strong>
                    <div style="font-size: 12px; color: #666;">
                      ${attachment.fileType?.toUpperCase()} • ${Math.round(attachment.fileSize / 1024)} KB
                    </div>
                  </div>
                  <a href="${attachment.url}" target="_blank" style="background: #1565c0; color: white; padding: 6px 12px; text-decoration: none; border-radius: 4px; font-size: 12px;">Download</a>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          <!-- Technical Details -->
          <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #666; margin-top: 0; font-size: 14px;">Technical Information:</h4>
            <table style="width: 100%; font-size: 12px;">
     
              <tr>
                <td style="padding: 3px 0; color: #666;">IP Address:</td>
                <td style="padding: 3px 0; color: #333;">${contactData.ip_address || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #666;">User Agent:</td>
                <td style="padding: 3px 0; color: #333;">${contactData.user_agent ? contactData.user_agent.substring(0, 50) + '...' : 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #666;">Source:</td>
                <td style="padding: 3px 0; color: #333;">${contactData.source || 'Website Contact Form'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #666;">Newsletter:</td>
                <td style="padding: 3px 0; color: #333;">${contactData.is_newsletter_subscribed ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <td style="padding: 3px 0; color: #666;">Marketing Consent:</td>
                <td style="padding: 3px 0; color: #333;">${contactData.is_marketing_consent ? 'Yes' : 'No'}</td>
              </tr>
            </table>
          </div>

          <!-- Action Buttons -->
          <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 16px;">Quick Actions:</h3>
            <div style="margin-top: 15px;">
              <a href="mailto:${contactData.email}?subject=Re: ${contactData.subject} - Ref: #ZRE-${contactData.contact_id}" style="display: inline-block; background: #1B4332; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Reply via Email</a>
              ${contactData.phone ? `<a href="tel:${contactData.phone}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">Call Now</a>` : ''}
              <a href="#" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 5px; font-weight: bold;">View in Dashboard</a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1B4332; color: white; padding: 15px; text-align: center;">
          <p style="margin: 0; font-size: 12px;">
            This notification was automatically generated by the Zola Real Estate Contact Management System.
          </p>
          <p style="margin: 5px 0 0 0; font-size: 11px; opacity: 0.8;">
            Sent at ${formatDate(new Date())}
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  static getAdminResponseTemplate(contactData: any, responseMessage: string, adminName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Response to Your Inquiry - Zola Real Estate</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1B4332 0%, #D4AF37 100%); color: white; padding: 30px 20px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <div style="font-size: 24px;">🏠</div>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Zola Real Estate</h1>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Rwanda Investment Experts</p>
            </div>
          </div>
          <h2 style="margin: 0; font-size: 28px; font-weight: bold;">Response to Your Inquiry</h2>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 20px;">Hello ${contactData.first_name}!</h3>
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              Thank you for your inquiry about <strong>"${contactData.subject}"</strong>. 
              I'm ${adminName} from the Zola Real Estate team, and I'm here to help you with your ${contactData.category.replace('_', ' ')} needs.
            </p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; border-left: 4px solid #1B4332;">
              <h4 style="color: #1B4332; margin-top: 0; font-size: 16px;">Personal Response from ${adminName}:</h4>
              <div style="color: #333; line-height: 1.7; white-space: pre-wrap;">${responseMessage}</div>
            </div>
          </div>

          <!-- Next Steps -->
          <div style="background: linear-gradient(135deg, #e7f5f1 0%, #d1f2eb 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 18px;">Let's Move Forward Together</h3>
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Based on your inquiry, I'd love to schedule a complimentary consultation to discuss your investment goals in detail.
            </p>
            <div style="text-align: center;">
              <a href="#" style="display: inline-block; background: #1B4332; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">Schedule Free Consultation</a>
              <a href="mailto:ndisanzemarine@gmail.com" style="display: inline-block; background: white; color: #1B4332; border: 2px solid #1B4332; padding: 13px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">Reply to This Email</a>
            </div>
          </div>

          <!-- Contact Info -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 18px;">Direct Contact Information</h3>
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: center;">
                <span style="margin-right: 12px; font-size: 20px;">📧</span>
                <div>
                  <strong>Email:</strong> ndisanzemarine@gmail.com
                  <div style="font-size: 12px; color: #666;">Best for detailed discussions</div>
                </div>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="margin-right: 12px; font-size: 20px;">📱</span>
                <div>
                  <strong>WhatsApp:</strong> +250 788 XXX XXX
                  <div style="font-size: 12px; color: #666;">Quick questions and updates</div>
                </div>
              </div>
              <div style="display: flex; align-items: center;">
                <span style="margin-right: 12px; font-size: 20px;">🕒</span>
                <div>
                  <strong>Available:</strong> Monday - Friday, 8:00 AM - 6:00 PM CAT
                  <div style="font-size: 12px; color: #666;">Kigali, Rwanda timezone</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
            <strong>Zola Real Estate Consultancy Rwanda LTD</strong>
          </p>
          <p style="margin: 0 0 15px 0; color: #666; font-size: 12px;">
            RDB Licensed & Registered | Reference: #ZRE-${contactData.contact_id}
          </p>
          <div style="margin: 15px 0;">
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">📘</a>
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">🐦</a>
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">📷</a>
            <a href="#" style="display: inline-block; margin: 0 10px; color: #1B4332; text-decoration: none; font-size: 24px;">💼</a>
          </div>
          <p style="margin: 10px 0 0 0; color: #999; font-size: 11px;">
            This email is a personal response to your inquiry. You can reply directly to continue our conversation.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  static getNewsletterConfirmationTemplate(email: string, firstName: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Zola Real Estate Newsletter</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1B4332 0%, #D4AF37 100%); color: white; padding: 30px 20px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <div style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
              <div style="font-size: 24px;">📧</div>
            </div>
            <div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Zola Real Estate</h1>
              <p style="margin: 0; font-size: 12px; opacity: 0.9;">Rwanda Investment Experts</p>
            </div>
          </div>
          <h2 style="margin: 0; font-size: 28px; font-weight: bold;">Welcome to Our Newsletter!</h2>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Stay informed about Rwanda's real estate market</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 30px 20px;">
          <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 20px;">Hello ${firstName}!</h3>
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              Thank you for subscribing to the Zola Real Estate newsletter! You've just taken the first step toward staying informed about Rwanda's dynamic real estate market and exciting investment opportunities.
            </p>
          </div>

          <!-- What You'll Receive -->
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 18px;">What You'll Receive:</h3>
            <div style="display: grid; gap: 15px;">
              <div style="display: flex; align-items: flex-start;">
                <div style=" color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">📈</div>
                <div>
                  <strong style="color: #1B4332;">Weekly Market Insights</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Latest trends, price movements, and market analysis</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
                <div style=" color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">🏘️</div>
                <div>
                  <strong style="color: #1B4332;">Exclusive Property Listings</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">First access to premium investment opportunities</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
                <div style=" color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">⚖️</div>
                <div>
                  <strong style="color: #1B4332;">Legal & Regulatory Updates</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Important changes affecting foreign investors</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
                <div style=" color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">💡</div>
                <div>
                  <strong style="color: #1B4332;">Investment Tips & Strategies</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Expert advice for maximizing your returns</p>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
                <div style=" color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 15px; flex-shrink: 0;">🎫</div>
                <div>
                  <strong style="color: #1B4332;">Exclusive Event Invitations</strong>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Property viewings, investor meetups, and seminars</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Welcome Gift -->
          <div style="background: linear-gradient(135deg, #e7f5f1 0%, #d1f2eb 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 18px;">🎁 Welcome Gift</h3>
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              As a new subscriber, you'll receive our comprehensive <strong>"Foreign Investor's Guide to Rwanda Real Estate"</strong> in your next newsletter - a $50 value, completely free!
            </p>
            <div style="background: white; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                📚 Complete legal framework guide<br>
                🏦 Financing options for foreign investors<br>
                📊 ROI analysis templates<br>
                🗺️ Prime location insights
              </p>
            </div>
          </div>

          <!-- Contact Information -->
          <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; text-align: center;">
            <h3 style="color: #1B4332; margin-top: 0; font-size: 18px;">Stay Connected</h3>
            <p style="color: #666; margin-bottom: 20px;">Follow us on social media for daily updates and behind-the-scenes content:</p>
            <div style="margin: 20px 0;">
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background: #1877f2; color: white; text-decoration: none; border-radius: 8px; font-size: 12px;">Facebook</a>
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background: #1da1f2; color: white; text-decoration: none; border-radius: 8px; font-size: 12px;">Twitter</a>
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background: #e4405f; color: white; text-decoration: none; border-radius: 8px; font-size: 12px;">Instagram</a>
              <a href="#" style="display: inline-block; margin: 0 10px; padding: 10px; background: #0077b5; color: white; text-decoration: none; border-radius: 8px; font-size: 12px;">LinkedIn</a>
            </div>
            <div style="margin-top: 20px;">
              <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Questions? Need immediate assistance?</p>
              <p style="color: #1B4332; font-size: 14px; margin: 0;">
                📧 ndisanzemarine@gmail.com<br>
                📱 +250 788 XXX XXX (WhatsApp)
              </p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
            <strong>Zola Real Estate Consultancy Rwanda LTD</strong>
          </p>
          <p style="margin: 0 0 15px 0; color: #666; font-size: 12px;">
            RDB Licensed & Registered | Your Trusted Investment Partner
          </p>
          <p style="margin: 10px 0 5px 0; color: #999; font-size: 11px;">
            You're receiving this email because you subscribed to our newsletter at ${email}.
          </p>
          <p style="margin: 0; color: #999; font-size: 11px;">
            You can <a href="#" style="color: #1B4332;">unsubscribe</a> or <a href="#" style="color: #1B4332;">update your preferences</a> at any time.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}