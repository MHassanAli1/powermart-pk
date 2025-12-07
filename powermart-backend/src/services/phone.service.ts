import { prisma } from '../../lib/prisma.ts';
import { sendVendorPhoneOTP, isSMSConfigured } from '../../lib/sms.ts';
import {
  generateOTP,
  getOTPExpiration,
  isExpired,
  MAX_OTP_ATTEMPTS,
} from '../utils/otp.util.ts';
import type { MessageResponse } from '../types/auth.types.ts';

/**
 * Send phone verification OTP to vendor
 */
export async function sendPhoneVerificationOTP(
  vendorId: string,
  phoneNumber: string,
  vendorName?: string | null
): Promise<MessageResponse> {
  // Check if SMS is configured
  if (!isSMSConfigured()) {
    throw new Error('SMS service is not configured. Please contact support.');
  }

  // Check if vendor exists
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  if (vendor.phoneVerified && vendor.phoneNumber === phoneNumber) {
    return { success: true, message: 'Phone number is already verified' };
  }

  // Invalidate any existing OTPs for this vendor
  await prisma.phoneOTP.updateMany({
    where: {
      vendorId,
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
  await prisma.phoneOTP.create({
    data: {
      vendorId,
      phoneNumber,
      otpCode,
      expiresAt,
    },
  });

  // Send SMS
  const result = await sendVendorPhoneOTP(phoneNumber, otpCode, vendorName ?? undefined);

  if (!result.success) {
    throw new Error(result.error ?? 'Failed to send verification SMS. Please try again.');
  }

  return { success: true, message: 'Verification code sent to your phone' };
}

/**
 * Verify phone OTP for vendor
 */
export async function verifyPhoneOTP(
  vendorId: string,
  phoneNumber: string,
  otpCode: string
): Promise<MessageResponse> {
  // Find the most recent unverified OTP for this vendor and phone
  const phoneOTP = await prisma.phoneOTP.findFirst({
    where: {
      vendorId,
      phoneNumber,
      verified: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!phoneOTP) {
    throw new Error('No pending verification found. Please request a new code.');
  }

  // Check if expired
  if (isExpired(phoneOTP.expiresAt)) {
    throw new Error('Verification code has expired. Please request a new one.');
  }

  // Check attempts
  if (phoneOTP.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error('Too many failed attempts. Please request a new code.');
  }

  // Verify OTP
  if (phoneOTP.otpCode !== otpCode) {
    // Increment attempts
    await prisma.phoneOTP.update({
      where: { id: phoneOTP.id },
      data: { attempts: phoneOTP.attempts + 1 },
    });
    
    const remainingAttempts = MAX_OTP_ATTEMPTS - phoneOTP.attempts - 1;
    throw new Error(`Invalid verification code. ${remainingAttempts} attempts remaining.`);
  }

  // Mark OTP as verified and update vendor
  await prisma.$transaction([
    prisma.phoneOTP.update({
      where: { id: phoneOTP.id },
      data: { verified: true },
    }),
    prisma.vendor.update({
      where: { id: vendorId },
      data: {
        phoneNumber,
        phoneVerified: true,
      },
    }),
  ]);

  return { success: true, message: 'Phone number verified successfully' };
}

/**
 * Resend phone verification OTP
 */
export async function resendPhoneVerificationOTP(
  vendorId: string
): Promise<MessageResponse> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  if (vendor.phoneVerified) {
    return { success: true, message: 'Phone number is already verified' };
  }

  return sendPhoneVerificationOTP(vendorId, vendor.phoneNumber, vendor.name);
}

/**
 * Update vendor phone number and send verification OTP
 */
export async function updateAndVerifyPhone(
  vendorId: string,
  newPhoneNumber: string
): Promise<MessageResponse> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
  });

  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Check if phone number is already taken by another vendor
  const existingVendor = await prisma.vendor.findFirst({
    where: {
      phoneNumber: newPhoneNumber,
      id: { not: vendorId },
    },
  });

  if (existingVendor) {
    throw new Error('This phone number is already registered to another vendor');
  }

  // Update phone number (mark as unverified) and send OTP
  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      phoneNumber: newPhoneNumber,
      phoneVerified: false,
    },
  });

  return sendPhoneVerificationOTP(vendorId, newPhoneNumber, vendor.name);
}
