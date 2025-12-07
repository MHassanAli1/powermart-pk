import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email configuration from environment variables
 * Uses SMPT_ prefix to match existing .env configuration
 */
const smtpPort = parseInt(process.env.SMPT_PORT ?? '465');
const emailConfig = {
  host: process.env.SMPT_HOST ?? 'smtp.gmail.com',
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMPT_MAIL ?? '',
    pass: process.env.SMPT_PASSWORD ?? '',
  },
};

const fromEmail = process.env.SMPT_MAIL ?? 'noreply@powermart.pk';
const appName = process.env.APP_NAME ?? 'PowerMart';

/**
 * Create email transporter
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(emailConfig);
  }
  return transporter;
}

/**
 * Send an email
 */
async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<boolean> {
  try {
    const info = await getTransporter().sendMail({
      from: `"${appName}" <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Send email verification OTP
 */
export async function sendVerificationEmail(
  email: string,
  otpCode: string,
  userName?: string
): Promise<boolean> {
  const subject = `${appName} - Verify Your Email`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .otp-box { background: #4F46E5; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="content">
          <h2>Verify Your Email Address</h2>
          <p>Hello${userName ? ` ${userName}` : ''},</p>
          <p>Thank you for registering with ${appName}. Please use the following OTP to verify your email address:</p>
          <div class="otp-box">${otpCode}</div>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <p>If you didn't create an account with us, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${appName} - Verify Your Email

Hello${userName ? ` ${userName}` : ''},

Thank you for registering with ${appName}. Your verification code is:

${otpCode}

This code will expire in 5 minutes.

If you didn't create an account with us, please ignore this email.
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  userName?: string
): Promise<boolean> {
  const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const subject = `${appName} - Reset Your Password`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .token-box { background: #e5e7eb; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello${userName ? ` ${userName}` : ''},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </p>
          <p>Or copy this link to your browser:</p>
          <div class="token-box">${resetUrl}</div>
          <p>This link will expire in <strong>1 hour</strong>.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${appName} - Reset Your Password

Hello${userName ? ` ${userName}` : ''},

We received a request to reset your password. Visit this link to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.
  `;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(
  email: string,
  userName?: string
): Promise<boolean> {
  const subject = `${appName} - Password Changed Successfully`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Password Changed</h1>
        </div>
        <div class="content">
          <p>Hello${userName ? ` ${userName}` : ''},</p>
          <p>Your password has been changed successfully.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({ to: email, subject, html });
}

/**
 * Send email verification success confirmation
 */
export async function sendEmailVerifiedSuccess(
  email: string,
  userName?: string
): Promise<boolean> {
  const subject = `${appName} - Email Verified Successfully! 🎉`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; text-align: center; }
        .checkmark { font-size: 64px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${appName}</h1>
        </div>
        <div class="content">
          <div class="checkmark">✅</div>
          <h2>Email Verified Successfully!</h2>
          <p>Hello${userName ? ` ${userName}` : ''},</p>
          <p>Congratulations! Your email has been verified successfully.</p>
          <p>You now have full access to all features of ${appName}.</p>
          <p>Start exploring and enjoy your shopping experience!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${appName} - Email Verified Successfully!

Hello${userName ? ` ${userName}` : ''},

Congratulations! Your email has been verified successfully.
You now have full access to all features of ${appName}.

Start exploring and enjoy your shopping experience!
  `;

  return sendEmail({ to: email, subject, html, text });
}
