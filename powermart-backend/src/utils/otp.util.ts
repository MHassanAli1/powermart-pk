import crypto from 'crypto';

/**
 * Generate a random numeric OTP code
 * @param length - Length of the OTP (default 6)
 * @returns OTP string
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  
  return otp;
}

/**
 * Generate a secure random token for password reset
 * @returns Hex token string
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get expiration date for OTP (default 5 minutes)
 * @param minutes - Minutes until expiration
 * @returns Date object
 */
export function getOTPExpiration(minutes: number = 5): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Get expiration date for password reset token (default 1 hour)
 * @param hours - Hours until expiration
 * @returns Date object
 */
export function getResetTokenExpiration(hours: number = 1): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Check if OTP/token is expired
 * @param expiresAt - Expiration date
 * @returns boolean
 */
export function isExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Maximum OTP verification attempts
 */
export const MAX_OTP_ATTEMPTS = 5;
