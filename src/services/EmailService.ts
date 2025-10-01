import { sendEmail } from '../helpers/utils';

export const sendLoginInstructionsEmail = async (
  email: string,
  name: string,
  username: string, // This will now be the same as email
  password: string
) => {
  const subject = 'Login Instructions for HRIS System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2E7D32; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">HRIS System</h1>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Welcome to HRIS System</h2>
        <p>Dear ${name},</p>
        <p>Your account has been created successfully. Please use your email address and the following password to log in:</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2E7D32;">
          <p style="margin: 5px 0;"><strong>Login Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background-color: #f5f5f5; padding: 2px 4px; border-radius: 3px;">${password}</code></p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>Important:</strong> For security reasons, you will be required to change your password on first login.</p>
        </div>
        
        <p>You can access the system at: <a href="${process.env.APP_URL}" style="color: #2E7D32;">${process.env.APP_URL}</a></p>
        
        <p>If you have any questions, please contact your system administrator.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html
  });
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  otp: string
) => {
  const subject = 'Password Reset Code - HRIS System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2E7D32; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">HRIS System</h1>
      </div>
      
      <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
        <p>Dear ${name},</p>
        <p>You have requested to reset your password. Please use the following code:</p>
        
        <div style="background-color: white; padding: 30px; text-align: center; border-radius: 5px; margin: 20px 0; border: 2px solid #2E7D32;">
          <h1 style="color: #2E7D32; margin: 0; font-size: 36px; letter-spacing: 5px;">${otp}</h1>
        </div>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #721c24;"><strong>Note:</strong> This code will expire in 15 minutes for security reasons.</p>
        </div>
        
        <p>If you didn't request this password reset, please ignore this email or contact your system administrator.</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject,
    html
  });
};
