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

// ============================================
// ENHANCED EMAIL VERIFICATION OTP TEMPLATE
// ============================================
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
  <title>Verify Your Email - Ongera</title>
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
        Hello ${firstName} ${lastName},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Thank you for registering with Ongera! To complete your account setup and start collaborating with researchers across Rwanda, please verify your email address.
      </div>
      
      <!-- Status Badge -->
      <span style="display: inline-block; background: #0158B7; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        🔐 VERIFICATION REQUIRED
      </span>
      
      <!-- OTP Box -->
      <div style="background: #E3F2FD; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7; text-align: center;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
          YOUR VERIFICATION CODE
        </div>
        <div style="font-family: 'Courier New', monospace; font-size: 42px; font-weight: bold; color: #0158B7; letter-spacing: 12px; margin: 16px 0;">
          ${otp}
        </div>
        <div style="color: #5E96D2; font-size: 13px; margin-top: 12px;">
          ⏱️ Expires in 10 minutes
        </div>
      </div>
      
      <!-- Instructions -->
      <div style="background: #f8f9fa; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
          📋 How to verify:
        </div>
        <ol style="color: #4a4a4a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Enter the 6-digit code on the verification page</li>
          <li>Create your new password (minimum 8 characters)</li>
          <li>Your email will be verified automatically</li>
        </ol>
      </div>
      
      <!-- Security Notice -->
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>🔒 Security Notice:</strong> If you didn't request this verification, please ignore this email and contact our support team immediately.
        </div>
      </div>
      
      <!-- Why Verify -->
      <div style="background: white; padding: 18px; border-radius: 8px; margin-top: 20px; border: 2px solid #e9ecef;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 12px;">
          Why verify your email?
        </div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.6;">
          ✅ <strong style="color: #1a1a1a;">Secure your account</strong> - Protect your research and collaborations<br>
          📧 <strong style="color: #1a1a1a;">Receive updates</strong> - Stay informed about your projects<br>
          🎓 <strong style="color: #1a1a1a;">Full access</strong> - Unlock all platform features
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        Need help? Contact us at <a href="mailto:support@ongera.rw" style="color: #0158B7; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
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
    return false;
  }
};

// ============================================
// ENHANCED PASSWORD CHANGE OTP TEMPLATE
// ============================================
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
  <title>Change Your Password - Ongera</title>
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
        Hello ${firstName},
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        You requested to change your password. Use the verification code below to proceed with setting your new password.
      </div>
      
      <!-- Status Badge -->
      <span style="display: inline-block; background: #5E96D2; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        🔑 PASSWORD RESET
      </span>
      
      <!-- OTP Box -->
      <div style="background: #E3F2FD; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #5E96D2; text-align: center;">
        <div style="color: #0362C3; font-weight: 600; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
          YOUR VERIFICATION CODE
        </div>
        <div style="font-family: 'Courier New', monospace; font-size: 42px; font-weight: bold; color: #0362C3; letter-spacing: 12px; margin: 16px 0;">
          ${otp}
        </div>
        <div style="color: #5E96D2; font-size: 13px; margin-top: 12px;">
          ⏱️ Expires in 10 minutes
        </div>
      </div>
      
      <!-- Security Tips -->
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #065f46; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
          🛡️ Password Security Tips:
        </div>
        <ul style="color: #064e3b; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Use at least 8 characters</li>
          <li>Include uppercase and lowercase letters</li>
          <li>Add numbers and special characters</li>
          <li>Avoid using personal information</li>
        </ul>
      </div>
      
      <!-- Security Warning -->
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>⚠️ Important:</strong> If you didn't request this password change, please secure your account immediately by contacting support.
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        Need help? Contact us at <a href="mailto:support@ongera.rw" style="color: #0158B7; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
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
    return false;
  }
};

// ============================================
// ENHANCED EMAIL VERIFIED SUCCESS TEMPLATE
// ============================================
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
  <title>Email Verified - Ongera</title>
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
        Congratulations, ${firstName}!
      </div>
      
      <div style="color: #28a745; font-size: 17px; font-weight: 600; margin-bottom: 15px;">
        🎊 Your email has been verified successfully!
      </div>
      
      <!-- Status Badge -->
      <span style="display: inline-block; background: #28a745; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        ✅ ACCOUNT ACTIVATED
      </span>
      
      <!-- Success Message -->
      <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
        <div style="color: #0158B7; font-size: 18px; font-weight: 700;">
          Welcome to Ongera Community
        </div>
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Your account is now fully activated. You can now access all features of the Ongera Research Platform.
      </div>
      
      <!-- Next Steps -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div style="color: #0158B7; font-weight: 600; font-size: 15px; margin-bottom: 15px;">
          🚀 What's Next?
        </div>
        <div style="color: #6c757d; font-size: 14px; line-height: 1.8;">
          <div style="margin-bottom: 10px;">
            <span style="display: inline-block; background: #0158B7; color: white; width: 22px; height: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; margin-right: 8px;">1</span>
            <strong style="color: #1a1a1a;">Complete your profile</strong> to help others discover your research
          </div>
          <div style="margin-bottom: 10px;">
            <span style="display: inline-block; background: #0158B7; color: white; width: 22px; height: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; margin-right: 8px;">2</span>
            <strong style="color: #1a1a1a;">Explore projects</strong> and connect with researchers
          </div>
          <div>
            <span style="display: inline-block; background: #0158B7; color: white; width: 22px; height: 22px; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; margin-right: 8px;">3</span>
            <strong style="color: #1a1a1a;">Join communities</strong> that align with your research
          </div>
        </div>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          🏠 Go to Dashboard
        </a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        Need assistance? Contact us at <a href="mailto:support@ongera.rw" style="color: #0158B7; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
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
    return false;
  }
};

export const sendInstructorCredentials = async (
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  institutionName: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ongera - Instructor Credentials</title>
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
        Welcome, ${firstName} ${lastName}!
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Your instructor account has been created on the Ongera Research Platform by <strong>${institutionName}</strong>. You can now access the platform and manage student research projects.
      </div>
      
      <!-- Status Badge -->
      <span style="display: inline-block; background: #0158B7; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        👨‍🏫 INSTRUCTOR ACCOUNT
      </span>
      
      <!-- Credentials Box -->
      <div style="background: #E3F2FD; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
          YOUR LOGIN CREDENTIALS
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
          <div style="color: #6B7280; font-size: 12px; margin-bottom: 5px;">Email Address:</div>
          <div style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #0158B7;">
            ${email}
          </div>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
          <div style="color: #6B7280; font-size: 12px; margin-bottom: 5px;">Temporary Password:</div>
          <div style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #0158B7;">
            ${password}
          </div>
        </div>
        
        <div style="color: #5E96D2; font-size: 13px; margin-top: 12px;">
          ⚠️ Please change your password after first login
        </div>
      </div>
      
      <!-- Instructor Responsibilities -->
      <div style="background: #f8f9fa; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
          📋 Your Responsibilities:
        </div>
        <ol style="color: #4a4a4a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Review student research projects assigned to you</li>
          <li>Approve projects for public visibility</li>
          <li>Provide feedback or return projects for revision</li>
          <li>Reject projects that don't meet standards</li>
        </ol>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL}/login" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          🚀 Login to Dashboard
        </a>
      </div>
      
      <!-- Security Notice -->
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>🔒 Security Notice:</strong> Your password is temporary and should be changed immediately after logging in. Never share your credentials with anyone.
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        Need help? Contact us at <a href="mailto:support@ongera.rw" style="color: #0158B7; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '👨‍🏫 Welcome to Ongera - Instructor Credentials',
      html
    });
    return true;
  } catch (error) {
    return false;
  }
};


export const sendStudentCredentials = async (
  email: string,
  firstName: string,
  lastName: string,
  password: string,
  instructorName: string,
  institutionName: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Ongera - Student Credentials</title>
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
        Welcome, ${firstName} ${lastName}!
      </div>
      
      <div style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
        Your student account has been created on the Ongera Research Platform by <strong>${institutionName}</strong>. You can now upload your research projects for review.
      </div>
      
      <!-- Status Badge -->
      <span style="display: inline-block; background: #10b981; color: white; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 10px 0;">
        🎓 STUDENT ACCOUNT
      </span>
      
      <!-- Credentials Box -->
      <div style="background: #E3F2FD; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0158B7;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
          YOUR LOGIN CREDENTIALS
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
          <div style="color: #6B7280; font-size: 12px; margin-bottom: 5px;">Email Address:</div>
          <div style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #0158B7;">
            ${email}
          </div>
        </div>
        
        <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
          <div style="color: #6B7280; font-size: 12px; margin-bottom: 5px;">Temporary Password:</div>
          <div style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: bold; color: #0158B7;">
            ${password}
          </div>
        </div>
        
        <div style="color: #5E96D2; font-size: 13px; margin-top: 12px;">
          ⚠️ Please change your password after first login
        </div>
      </div>
      
      <!-- Instructor Info -->
      <div style="background: #f0fdf4; padding: 18px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
        <div style="color: #065f46; font-weight: 600; font-size: 14px; margin-bottom: 8px;">
          👨‍🏫 Assigned Instructor
        </div>
        <div style="color: #064e3b; font-size: 14px;">
          ${instructorName}
        </div>
        <div style="color: #059669; font-size: 12px; margin-top: 8px;">
          Your projects will be reviewed by this instructor
        </div>
      </div>
      
      <!-- How It Works -->
      <div style="background: #f8f9fa; padding: 18px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #0158B7; font-weight: 600; font-size: 14px; margin-bottom: 12px;">
          📚 How It Works:
        </div>
        <ol style="color: #4a4a4a; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Upload your research project</li>
          <li>Your project will be sent to your instructor for review</li>
          <li>Instructor can: Approve, Reject, or Return for revision</li>
          <li>Approved projects become publicly visible</li>
        </ol>
      </div>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.FRONTEND_URL}/login" 
           style="display: inline-block; background: #0158B7; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 15px;">
          🚀 Login to Dashboard
        </a>
      </div>
      
      <!-- Security Notice -->
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <div style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>🔒 Security Notice:</strong> Your password is temporary and should be changed immediately after logging in. Never share your credentials with anyone.
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 25px 30px; text-align: center; border-top: 2px solid #e9ecef;">
      <div style="color: #6c757d; font-size: 13px; line-height: 1.5; margin-bottom: 8px;">
        <strong>Rwanda Research Hub</strong><br>
        Building Rwanda's Academic Community Together
      </div>
      <div style="color: #6c757d; font-size: 13px;">
        Need help? Contact us at <a href="mailto:support@ongera.rw" style="color: #0158B7; text-decoration: none; font-weight: 600;">support@ongera.rw</a>
      </div>
      <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
        © ${new Date().getFullYear()} Ongera Research Platform. All rights reserved.
      </div>
    </div>
    
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🎓 Welcome to Ongera - Student Credentials',
      html
    });
    return true;
  } catch (error) {
    return false;
  }
};

// ============================================
// APPLICATION RECEIVED (APPLICANT CONFIRMATION)
// ============================================
export const sendApplicationReceivedEmail = async (
  email: string,
  firstName: string,
  lastName: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Application Received - BwengePlus</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#0158B7;padding:25px 30px;text-align:center;">
      <div style="color:white;font-size:26px;font-weight:bold;letter-spacing:1px;">BWENGEPLUS</div>
    </div>
    <div style="padding:30px;">
      <div style="font-size:18px;color:#1a1a1a;margin-bottom:20px;font-weight:600;">Hello ${firstName} ${lastName},</div>
      <div style="color:#4a4a4a;font-size:15px;line-height:1.6;margin-bottom:15px;">
        Thank you for applying to join <strong>BwengePlus</strong>! Your application has been received and is now under review by our admin team.
      </div>
      <span style="display:inline-block;background:#FFA500;color:white;padding:8px 20px;border-radius:20px;font-size:12px;font-weight:600;margin:10px 0;">
        ⏳ APPLICATION PENDING REVIEW
      </span>
      <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:16px;border-radius:6px;margin:20px 0;">
        <div style="color:#856404;font-size:14px;line-height:1.6;">
          <strong>What happens next?</strong><br>
          Our admin team will carefully review your application. You'll receive an email notification as soon as a decision is made. Please do not attempt to log in until your application has been approved.
        </div>
      </div>
      <div style="color:#4a4a4a;font-size:14px;line-height:1.6;margin-top:20px;">
        We appreciate your patience. Most applications are reviewed within 2–5 business days.
      </div>
    </div>
    <div style="background:#f8f9fa;padding:25px 30px;text-align:center;border-top:2px solid #e9ecef;">
      <div style="color:#6c757d;font-size:13px;">Need help? Contact <a href="mailto:support@ongera.rw" style="color:#0158B7;text-decoration:none;">support@ongera.rw</a></div>
      <div style="color:#94a3b8;font-size:12px;margin-top:8px;">© ${new Date().getFullYear()} BwengePlus. All rights reserved.</div>
    </div>
  </div>
</body>
</html>`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '⏳ Your BwengePlus Application Has Been Received',
      html,
    });
    return true;
  } catch {
    return false;
  }
};

// ============================================
// ADMIN NEW APPLICATION NOTIFICATION
// ============================================
export const sendAdminNewApplicationEmail = async (
  adminEmail: string,
  applicant: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
    country?: string;
    date_of_birth?: string;
    gender?: string;
    education_level?: string;
    motivation?: string;
    linkedin_url?: string;
    applied_at?: string;
    applicationId?: string;
  }
): Promise<boolean> => {
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:8px 12px;color:#6c757d;font-size:13px;width:35%;"><strong>${label}</strong></td><td style="padding:8px 12px;color:#1a1a1a;font-size:13px;">${value}</td></tr>`
      : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New BwengePlus Application</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#0158B7;padding:25px 30px;text-align:center;">
      <div style="color:white;font-size:24px;font-weight:bold;">📬 NEW APPLICATION</div>
    </div>
    <div style="padding:30px;">
      <div style="font-size:18px;color:#1a1a1a;margin-bottom:15px;font-weight:600;">A new user has applied to join BwengePlus</div>
      <div style="background:#E3F2FD;padding:18px;border-radius:8px;border-left:4px solid #0158B7;margin:15px 0;">
        <table style="width:100%;border-collapse:collapse;">
          ${row("Name", `${applicant.first_name} ${applicant.last_name}`)}
          ${row("Email", applicant.email)}
          ${row("Phone", applicant.phone_number)}
          ${row("Country", applicant.country)}
          ${row("Date of Birth", applicant.date_of_birth)}
          ${row("Gender", applicant.gender)}
          ${row("Education", applicant.education_level)}
          ${row("LinkedIn", applicant.linkedin_url)}
          ${row("Applied at", applicant.applied_at)}
        </table>
      </div>
      ${applicant.motivation ? `
      <div style="background:#fff;padding:18px;border-radius:8px;border:1px solid #e9ecef;margin-top:15px;">
        <div style="color:#0158B7;font-weight:600;font-size:14px;margin-bottom:8px;">Motivation</div>
        <div style="color:#4a4a4a;font-size:14px;line-height:1.6;white-space:pre-wrap;">${applicant.motivation}</div>
      </div>` : ""}
      <div style="margin-top:25px;text-align:center;color:#6c757d;font-size:13px;">
        Please review this application in the admin dashboard.
      </div>
    </div>
    <div style="background:#f8f9fa;padding:18px 30px;text-align:center;border-top:2px solid #e9ecef;">
      <div style="color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} BwengePlus Admin Notification.</div>
    </div>
  </div>
</body>
</html>`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `📬 New BwengePlus Application — ${applicant.first_name} ${applicant.last_name}`,
      html,
    });
    return true;
  } catch {
    return false;
  }
};

// ============================================
// ACCOUNT APPROVED / ACTIVATED
// ============================================
export const sendAccountActivatedEmail = async (
  email: string,
  firstName: string,
  lastName: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Application Approved - BwengePlus</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#16a34a;padding:25px 30px;text-align:center;">
      <div style="color:white;font-size:26px;font-weight:bold;letter-spacing:1px;">✅ APPROVED</div>
    </div>
    <div style="padding:30px;">
      <div style="font-size:18px;color:#1a1a1a;margin-bottom:20px;font-weight:600;">Congratulations ${firstName} ${lastName}!</div>
      <div style="color:#4a4a4a;font-size:15px;line-height:1.6;margin-bottom:15px;">
        Your application to join <strong>BwengePlus</strong> has been <strong>approved</strong>. You can now log in with your email and password and start exploring the platform.
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${process.env.FRONTEND_URL || '#'}/login" style="display:inline-block;background:#0158B7;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Log In Now</a>
      </div>
      <div style="background:#E8F5E9;border-left:4px solid #16a34a;padding:16px;border-radius:6px;color:#1b5e20;font-size:14px;line-height:1.6;">
        Welcome to the BwengePlus learning community. We're excited to have you onboard!
      </div>
    </div>
    <div style="background:#f8f9fa;padding:25px 30px;text-align:center;border-top:2px solid #e9ecef;">
      <div style="color:#6c757d;font-size:13px;">Need help? Contact <a href="mailto:support@ongera.rw" style="color:#0158B7;text-decoration:none;">support@ongera.rw</a></div>
      <div style="color:#94a3b8;font-size:12px;margin-top:8px;">© ${new Date().getFullYear()} BwengePlus.</div>
    </div>
  </div>
</body>
</html>`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '✅ Your BwengePlus Application Has Been Approved',
      html,
    });
    return true;
  } catch {
    return false;
  }
};

// ============================================
// ACCOUNT REJECTED
// ============================================
export const sendAccountRejectedEmail = async (
  email: string,
  firstName: string,
  lastName: string,
  reason?: string
): Promise<boolean> => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Application Update - BwengePlus</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="background:#dc2626;padding:25px 30px;text-align:center;">
      <div style="color:white;font-size:24px;font-weight:bold;letter-spacing:1px;">APPLICATION UPDATE</div>
    </div>
    <div style="padding:30px;">
      <div style="font-size:18px;color:#1a1a1a;margin-bottom:20px;font-weight:600;">Dear ${firstName} ${lastName},</div>
      <div style="color:#4a4a4a;font-size:15px;line-height:1.6;margin-bottom:15px;">
        Thank you for your interest in joining <strong>BwengePlus</strong>. After careful review, we regret to inform you that your application was <strong>not approved</strong> at this time.
      </div>
      ${reason ? `
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:6px;margin:20px 0;">
        <div style="color:#7f1d1d;font-weight:600;font-size:14px;margin-bottom:6px;">Reason</div>
        <div style="color:#7f1d1d;font-size:14px;line-height:1.6;white-space:pre-wrap;">${reason}</div>
      </div>` : ""}
      <div style="color:#4a4a4a;font-size:14px;line-height:1.6;margin-top:20px;">
        If you believe this was a mistake or would like more information, please contact our support team.
      </div>
    </div>
    <div style="background:#f8f9fa;padding:25px 30px;text-align:center;border-top:2px solid #e9ecef;">
      <div style="color:#6c757d;font-size:13px;">Contact us: <a href="mailto:support@ongera.rw" style="color:#0158B7;text-decoration:none;">support@ongera.rw</a></div>
      <div style="color:#94a3b8;font-size:12px;margin-top:8px;">© ${new Date().getFullYear()} BwengePlus.</div>
    </div>
  </div>
</body>
</html>`;
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'BwengePlus Application Update',
      html,
    });
    return true;
  } catch {
    return false;
  }
};
