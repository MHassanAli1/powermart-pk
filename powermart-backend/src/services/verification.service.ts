import { prisma } from '../../lib/prisma.ts';
import { sendVerificationEmail, sendEmailVerifiedSuccess } from '../../lib/email.ts';
import {
  generateOTP,
  getOTPExpiration,
  isExpired,
  MAX_OTP_ATTEMPTS,
} from '../utils/otp.util.ts';
import type { MessageResponse } from '../types/auth.types.ts';

/**
 * Send email verification OTP to user
 */
export async function sendEmailVerificationOTP(
  userId: string,
  email: string,
  userName?: string | null
): Promise<MessageResponse> {
  // Check if user is already verified
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.isVerified) {
    return { success: true, message: 'Email is already verified' };
  }

  // Invalidate any existing OTPs for this user
  await prisma.emailOTP.updateMany({
    where: {
      userId,
      verified: false,
    },
    data: {
      verified: true, // Mark as used/invalid
    },
  });

  // Generate new OTP
  const otpCode = generateOTP(6);
  const expiresAt = getOTPExpiration(5); // 5 minutes

  // Save OTP to database
  await prisma.emailOTP.create({
    data: {
      userId,
      email,
      otpCode,
      expiresAt,
    },
  });

  // Send email
  const sent = await sendVerificationEmail(email, otpCode, userName ?? undefined);

  if (!sent) {
    throw new Error('Failed to send verification email. Please try again.');
  }

  return { success: true, message: 'Verification code sent to your email' };
}

/**
 * Verify email OTP
 */
export async function verifyEmailOTP(
  email: string,
  otpCode: string
): Promise<MessageResponse> {
  // Find the most recent unverified OTP for this email
  const emailOTP = await prisma.emailOTP.findFirst({
    where: {
      email,
      verified: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: true,
    },
  });

  if (!emailOTP) {
    throw new Error('No pending verification found. Please request a new code.');
  }

  // Check if expired
  if (isExpired(emailOTP.expiresAt)) {
    throw new Error('Verification code has expired. Please request a new one.');
  }

  // Check attempts
  if (emailOTP.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error('Too many failed attempts. Please request a new code.');
  }

  // Verify OTP
  if (emailOTP.otpCode !== otpCode) {
    // Increment attempts
    await prisma.emailOTP.update({
      where: { id: emailOTP.id },
      data: { attempts: emailOTP.attempts + 1 },
    });
    
    const remainingAttempts = MAX_OTP_ATTEMPTS - emailOTP.attempts - 1;
    throw new Error(`Invalid verification code. ${remainingAttempts} attempts remaining.`);
  }

  // Mark OTP as verified and update user
  await prisma.$transaction([
    prisma.emailOTP.update({
      where: { id: emailOTP.id },
      data: { verified: true },
    }),
    prisma.user.update({
      where: { id: emailOTP.userId },
      data: { isVerified: true },
    }),
  ]);

  // Send success confirmation email (fire and forget)
  sendEmailVerifiedSuccess(email, emailOTP.user.name ?? undefined).catch(console.error);

  return { success: true, message: 'Email verified successfully' };
}

/**
 * Resend email verification OTP
 */
export async function resendEmailVerificationOTP(
  email: string
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Don't reveal if user exists or not for security
    return { success: true, message: 'If this email is registered, a verification code will be sent.' };
  }

  if (user.isVerified) {
    return { success: true, message: 'Email is already verified' };
  }

  return sendEmailVerificationOTP(user.id, user.email, user.name);
}
