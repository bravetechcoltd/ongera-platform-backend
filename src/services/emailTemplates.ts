import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Email Verification OTP Template
export const sendVerificationOTP = async (
  email: string,
  firstName: string,
  lastName: string,
  otp: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Ongera Platform</title>
</head>
<body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px;">
        Verify Your Email
      </h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 12px 0 0 0; font-size: 16px;">
        Welcome to Ongera Research Platform
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      
      <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 16px 0; font-weight: 700;">
        Hi ${firstName} ${lastName},
      </h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
        Thank you for registering with Ongera! To complete your account setup and start collaborating with researchers across Rwanda, please verify your email address.
      </p>

      <!-- OTP Box -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 3px solid #10b981; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0;">
        <p style="color: #065f46; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
          Your Verification Code
        </p>
        <div style="font-family: 'Courier New', monospace; font-size: 42px; font-weight: bold; color: #10b981; letter-spacing: 12px; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #059669; font-size: 13px; margin: 12px 0 0 0;">
          ⏱️ Expires in 10 minutes
        </p>
      </div>

      <!-- Instructions -->
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #1e40af; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          📋 How to verify:
        </h3>
        <ol style="color: #475569; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Enter the 6-digit code on the verification page</li>
          <li>Create your new password (minimum 8 characters)</li>
          <li>Your email will be verified automatically</li>
        </ol>
      </div>

      <!-- Security Notice -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>🔒 Security Notice:</strong> If you didn't request this verification, please ignore this email and contact our support team immediately.
        </p>
      </div>

      <!-- Why Verify -->
      <div style="margin: 32px 0;">
        <h3 style="color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">
          Why verify your email?
        </h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <span style="font-size: 24px;">✅</span>
            <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">
              <strong style="color: #1e293b;">Secure your account</strong> - Protect your research and collaborations
            </p>
          </div>
          <div style="display: flex; align-items: start; gap: 12px;">
            <span style="font-size: 24px;">📧</span>
            <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">
              <strong style="color: #1e293b;">Receive updates</strong> - Stay informed about your projects and community
            </p>
          </div>
          <div style="display: flex; align-items: start; gap: 12px;">
            <span style="font-size: 24px;">🎓</span>
            <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">
              <strong style="color: #1e293b;">Full access</strong> - Unlock all platform features and resources
            </p>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 32px 30px; text-align: center; border-top: 2px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0;">
        Need help? Contact us at <a href="mailto:support@ongera.rw" style="color: #10b981; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.<br>
        Empowering Rwanda's research community
      </p>
    </div>

  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔐 Verify Your Email - Ongera Platform',
      html
    });
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

// Password Change OTP Template
export const sendPasswordChangeOTP = async (
  email: string,
  firstName: string,
  lastName: string,
  otp: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Change Your Password - Ongera Platform</title>
</head>
<body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">🔑</div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px;">
        Change Your Password
      </h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 12px 0 0 0; font-size: 16px;">
        Secure your account with a new password
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      
      <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 16px 0; font-weight: 700;">
        Hi ${firstName},
      </h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
        You requested to change your password. Use the verification code below to proceed with setting your new password.
      </p>

      <!-- OTP Box -->
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 3px solid #3b82f6; border-radius: 12px; padding: 32px; text-align: center; margin: 32px 0;">
        <p style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
          Your Verification Code
        </p>
        <div style="font-family: 'Courier New', monospace; font-size: 42px; font-weight: bold; color: #3b82f6; letter-spacing: 12px; margin: 16px 0;">
          ${otp}
        </div>
        <p style="color: #2563eb; font-size: 13px; margin: 12px 0 0 0;">
          ⏱️ Expires in 10 minutes
        </p>
      </div>

      <!-- Security Tips -->
      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <h3 style="color: #065f46; font-size: 16px; font-weight: 700; margin: 0 0 12px 0;">
          🛡️ Password Security Tips:
        </h3>
        <ul style="color: #064e3b; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Use at least 8 characters</li>
          <li>Include uppercase and lowercase letters</li>
          <li>Add numbers and special characters</li>
          <li>Avoid using personal information</li>
        </ul>
      </div>

      <!-- Security Warning -->
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>⚠️ Important:</strong> If you didn't request this password change, please secure your account immediately by contacting support.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 32px 30px; text-align: center; border-top: 2px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0;">
        Need help? Contact us at <a href="mailto:support@ongera.rw" style="color: #3b82f6; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🔑 Change Your Password - Ongera Platform',
      html
    });
    return true;
  } catch (error) {
    console.error('Error sending password change email:', error);
    return false;
  }
};

// Email Verified Success Template
export const sendEmailVerifiedNotification = async (
  email: string,
  firstName: string,
  lastName: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verified Successfully - Ongera Platform</title>
</head>
<body style="margin: 0; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
      <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
      <h1 style="color: white; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -1px;">
        Email Verified Successfully!
      </h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 12px 0 0 0; font-size: 16px;">
        Welcome to the Ongera community
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 30px;">
      
      <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 16px 0; font-weight: 700;">
        Congratulations, ${firstName}!
      </h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
        Your email has been verified and your account is now fully activated. You can now access all features of the Ongera Research Platform.
      </p>

      <!-- Success Badge -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 3px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
        <p style="color: #065f46; font-size: 18px; font-weight: 700; margin: 0;">
          Account Activated
        </p>
      </div>

      <!-- Next Steps -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #1e293b; font-size: 18px; font-weight: 700; margin: 0 0 16px 0;">
          🚀 What's Next?
        </h3>
        <div style="display: grid; gap: 16px;">
          <div style="display: flex; align-items: start; gap: 12px;">
            <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">1</span>
            <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
              Complete your profile to help others discover your research interests
            </p>
          </div>
          <div style="display: flex; align-items: start; gap: 12px;">
            <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">2</span>
            <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
              Explore research projects and connect with fellow researchers
            </p>
          </div>
          <div style="display: flex; align-items: start; gap: 12px;">
            <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0;">3</span>
            <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
              Join communities that align with your research areas
            </p>
          </div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
          Go to Dashboard
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 32px 30px; text-align: center; border-top: 2px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0 0 12px 0;">
        Need assistance? We're here to help at <a href="mailto:support@ongera.rw" style="color: #10b981; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </p>
    </div>

  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🎉 Welcome to Ongera - Email Verified!',
      html
    });
    return true;
  } catch (error) {
    console.error('Error sending verification success email:', error);
    return false;
  }
};