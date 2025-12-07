import { UserRole, AccountStatus } from '../../prisma/generated/enums.ts';

// Request DTOs
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Email verification
export interface SendVerificationEmailRequest {
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  otpCode: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// Password reset
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Phone verification (for vendors)
export interface SendPhoneOTPRequest {
  phoneNumber: string;
}

export interface VerifyPhoneRequest {
  phoneNumber: string;
  otpCode: string;
}

// Response DTOs
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: AccountStatus;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}
