import { prisma } from '../../lib/prisma.ts';
import { sendPasswordResetEmail, sendPasswordChangedEmail } from '../../lib/email.ts';
import { hashPassword, comparePassword, validatePassword } from '../utils/password.util.ts';
import {
  generateResetToken,
  getResetTokenExpiration,
  isExpired,
} from '../utils/otp.util.ts';
import type { MessageResponse } from '../types/auth.types.ts';

/**
 * Request password reset - sends email with reset link
 */
export async function requestPasswordReset(email: string): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Don't reveal if user exists or not for security
  if (!user) {
    return { success: true, message: 'If this email is registered, you will receive a password reset link.' };
  }

  // Invalidate any existing reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      used: false,
    },
    data: {
      used: true,
    },
  });

  // Generate new reset token
  const token = generateResetToken();
  const expiresAt = getResetTokenExpiration(1); // 1 hour

  // Save token to database
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  // Send email
  const sent = await sendPasswordResetEmail(email, token, user.name ?? undefined);

  if (!sent) {
    throw new Error('Failed to send password reset email. Please try again.');
  }

  return { success: true, message: 'If this email is registered, you will receive a password reset link.' };
}

/**
 * Reset password using token from email
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<MessageResponse> {
  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Find the reset token
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    throw new Error('Invalid or expired reset link. Please request a new one.');
  }

  if (resetToken.used) {
    throw new Error('This reset link has already been used. Please request a new one.');
  }

  if (isExpired(resetToken.expiresAt)) {
    throw new Error('This reset link has expired. Please request a new one.');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
    // Invalidate all refresh tokens for security
    prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  // Send confirmation email
  await sendPasswordChangedEmail(resetToken.user.email, resetToken.user.name ?? undefined);

  return { success: true, message: 'Password reset successfully. Please log in with your new password.' };
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<MessageResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValid = await comparePassword(currentPassword, user.password);
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    throw new Error(passwordValidation.errors.join(', '));
  }

  // Hash and update password
  const hashedPassword = await hashPassword(newPassword);
  
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    }),
    // Invalidate all refresh tokens for security
    prisma.refreshToken.deleteMany({
      where: { userId },
    }),
  ]);

  // Send confirmation email
  await sendPasswordChangedEmail(user.email, user.name ?? undefined);

  return { success: true, message: 'Password changed successfully. Please log in again.' };
}
