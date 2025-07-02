const nodemailer = require('nodemailer');
require('dotenv').config();
const emailConfig = {
//   service: 'gmail', // or 'outlook', 'yahoo', etc.
  host: 'lionelagency.com' ,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER ,
    pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
  }
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify email configuration
transporter.verify(function(error, success) {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    console.log('Email server is ready to take our messages');
  }
});

// Email templates
const getEmailTemplate = (type, data) => {
  const baseStyle = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Learning Management System</h1>
        <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Modern Learning Platform</p>
      </div>
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
  `;

  const baseFooter = `
      </div>
      <div style="text-align: center; padding: 20px; color: #64748b; font-size: 14px;">
        <p>This is an automated message from Learning Management System.</p>
        <p>Please do not reply to this email. For support, contact your administrator.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p>&copy; ${new Date().getFullYear()} Learning Management System. All rights reserved.</p>
      </div>
    </div>
  `;

  switch (type) {
    case 'teacher_created':
      return `
        ${baseStyle}
        <h2 style="color: #1e293b; margin-top: 0;">Welcome to Our Teaching Platform!</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Congratulations! Your teacher account has been successfully created in our Learning Management System.
        </p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Your Login Credentials:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace; background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Password:</td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace; background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${data.password}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Role:</td>
              <td style="padding: 8px 0; color: #1e293b;">Teacher</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
          <h4 style="color: #92400e; margin-top: 0;">🔒 Important Security Notice:</h4>
          <p style="color: #92400e; margin-bottom: 0;">
            For your security, please change this temporary password immediately after your first login.
          </p>
        </div>

        <h3 style="color: #334155;">What you can do as a Teacher:</h3>
        <ul style="color: #475569; line-height: 1.8;">
          <li>📚 Create and manage courses</li>
          <li>👥 Add and manage students</li>
          <li>📅 Schedule and conduct sessions</li>
          <li>📝 Review and approve student projects</li>
          <li>📊 Track student attendance and progress</li>
          <li>🧾 Generate payment receipts</li>
          <li>🏆 Issue certificates upon course completion</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold;
                    display: inline-block;">
            Login to Your Account
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          If you have any questions or need assistance, please contact the system administrator.
        </p>
        ${baseFooter}
      `;

    case 'student_created':
      return `
        ${baseStyle}
        <h2 style="color: #1e293b; margin-top: 0;">Welcome to Your Learning Journey!</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Great news! Your student account has been successfully created in our Learning Management System.
        </p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Your Login Credentials:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace; background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Password:</td>
              <td style="padding: 8px 0; color: #1e293b; font-family: monospace; background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${data.password}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Role:</td>
              <td style="padding: 8px 0; color: #1e293b;">Student</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
          <h4 style="color: #92400e; margin-top: 0;">🔒 Important Security Notice:</h4>
          <p style="color: #92400e; margin-bottom: 0;">
            For your security, please change this temporary password immediately after your first login.
          </p>
        </div>

        <h3 style="color: #334155;">What you can do as a Student:</h3>
        <ul style="color: #475569; line-height: 1.8;">
          <li>📖 Access enrolled courses and sessions</li>
          <li>📝 Submit projects and assignments</li>
          <li>🤖 Chat with AI coding assistant for help</li>
          <li>📊 Track your learning progress</li>
          <li>🏆 Download certificates upon completion</li>
          <li>💳 View payment receipts</li>
          <li>👤 Manage your profile</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold;
                    display: inline-block;">
            Start Learning Today
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          If you have any questions or need assistance, please contact your teacher or the system administrator.
        </p>
        ${baseFooter}
      `;

    case 'registration_confirmation':
      return `
        ${baseStyle}
        <h2 style="color: #1e293b; margin-top: 0;">Registration Successful!</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Welcome to our Learning Management System! Your account has been successfully created.
        </p>
        
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #334155; margin-top: 0;">Account Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Name:</td>
              <td style="padding: 8px 0; color: #1e293b;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; color: #1e293b;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Role:</td>
              <td style="padding: 8px 0; color: #1e293b; text-transform: capitalize;">${data.role}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    font-weight: bold;
                    display: inline-block;">
            Login to Your Account
          </a>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          You can now login with your email and password to start your learning journey!
        </p>
        ${baseFooter}
      `;

    default:
      return `
        ${baseStyle}
        <h2 style="color: #1e293b; margin-top: 0;">Welcome to Learning Management System!</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Your account has been created successfully.
        </p>
        ${baseFooter}
      `;
  }
};

// Send email function
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const mailOptions = {
      from: {
        name: 'Learning Management System',
        address: process.env.EMAIL_USER
      },
      to: to,
      subject: subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email for new users
const sendWelcomeEmail = async (userData, tempPassword = null) => {
  try {
    let emailType, subject;
    
    if (userData.role === 'teacher') {
      emailType = 'teacher_created';
      subject = '🎓 Welcome to Teaching Platform - Your Account is Ready!';
    } else if (userData.role === 'student') {
      emailType = 'student_created';
      subject = '📚 Welcome to Learning Platform - Start Your Journey!';
    } else {
      emailType = 'registration_confirmation';
      subject = '✅ Registration Successful - Welcome to LMS!';
    }

    const emailData = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      ...(tempPassword && { password: tempPassword })
    };

    const htmlContent = getEmailTemplate(emailType, emailData);
    
    const result = await sendEmail(userData.email, subject, htmlContent);
    
    if (result.success) {
      console.log(`Welcome email sent to ${userData.email}`);
    } else {
      console.error(`Failed to send welcome email to ${userData.email}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error in sendWelcomeEmail:', error);
    return { success: false, error: error.message };
  }
};

// Export functions for use in your routes
module.exports = {
  sendEmail,
  sendWelcomeEmail,
  getEmailTemplate
};