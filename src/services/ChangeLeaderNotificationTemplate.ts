import { transporter } from "../helpers/utils";

export const ChangeLeaderNotificationTemplate = (
  userName: string,
  newLeaderName: string
) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HR System Leadership Change</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background-color: #f4f8fc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #d6e4f0;
            border-radius: 8px;
            background-color: #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .header {
            text-align: center;
            background: linear-gradient(90deg, #1E88E5, #1565C0);
            color: white;
            padding: 15px;
            border-radius: 8px 8px 0 0;
        }
        .content {
            padding: 20px;
            background-color: #ffffff;
        }
        .alert {
            background-color: #E3F2FD;
            color: #0D47A1;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            border-left: 4px solid #1E88E5;
            font-weight: 500;
        }
        .footer {
            text-align: center;
            font-size: 12px;
            color: #607d8b;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #d6e4f0;
        }
        ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        li {
            margin-bottom: 6px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>HR System Leadership Update</h1>
        </div>
        <div class="content">
            <p>Dear ${userName},</p>
            
            <div class="alert">
                <strong>Notice:</strong> Your role as HR System Leader has been changed. You no longer have System Leader access in the HR Management Platform.
            </div>
            
            <p>We wish to inform you that you have been removed from the System Leader role. <strong>${newLeaderName}</strong> has been assigned as the new System Leader.</p>
            
            <p>As a result of this change:</p>
            <ul>
                <li>Your HR System Leader login credentials are no longer active.</li>
                <li>You cannot access the system with your previous account.</li>
                <li>Any pending HR-related tasks or responsibilities will be transferred to the new System Leader.</li>
            </ul>
            
            <p>If you believe this change was made in error, please contact your HR administrator for clarification.</p>
            
            <p>Thank you for your contribution as System Leader.</p>
            
            <p>Best regards,<br>HR Management System Team</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} HR Management System. All rights reserved.
        </div>
    </div>
</body>
</html>
`;

export const sendChangeLeaderNotificationEmail = async (
  email: string,
  userName: string,
  newLeaderName: string
) => {
  const subject = 'Important: HR System Leadership Change Notification';

  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@hrmanagementsystem.com',
    to: email,
    subject,
    html: ChangeLeaderNotificationTemplate(userName, newLeaderName),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
