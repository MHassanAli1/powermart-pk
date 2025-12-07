import type { Response } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserById,
} from '../services/auth.service.ts';
import {
  verifyEmailOTP,
  resendEmailVerificationOTP,
} from '../services/verification.service.ts';
import {
  requestPasswordReset,
  resetPassword,
  changePassword,
} from '../services/password.service.ts';
import type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from '../types/auth.types.ts';

/**
 * Register a new user
 * POST /api/auth/register
 */
export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data: RegisterRequest = req.body;

    const result = await registerUser(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    });
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const data: LoginRequest = req.body;

    const result = await loginUser(data);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    });
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    const result = await refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Token refresh failed',
    });
  }
}

/**
 * Logout user
 * POST /api/auth/logout
 */
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    await logoutUser(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    });
  }
}

/**
 * Get user profile
 * GET /api/auth/profile
 */
export async function getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const user = await getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile',
    });
  }
}

/**
 * Verify email with OTP
 * POST /api/auth/verify-email
 */
export async function verifyEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, otpCode }: VerifyEmailRequest = req.body;

    if (!email || !otpCode) {
      res.status(400).json({
        success: false,
        error: 'Email and OTP code are required',
      });
      return;
    }

    const result = await verifyEmailOTP(email, otpCode);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Email verification failed',
    });
  }
}

/**
 * Resend email verification OTP
 * POST /api/auth/resend-verification
 */
export async function resendVerification(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email }: ResendVerificationRequest = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    const result = await resendEmailVerificationOTP(email);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend verification',
    });
  }
}

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email }: ForgotPasswordRequest = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    const result = await requestPasswordReset(email);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process password reset',
    });
  }
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export async function resetPasswordHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { token, newPassword }: ResetPasswordRequest = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Token and new password are required',
      });
      return;
    }

    const result = await resetPassword(token, newPassword);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password',
    });
  }
}

/**
 * Change password (authenticated)
 * POST /api/auth/change-password
 */
export async function changePasswordHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
      return;
    }

    const result = await changePassword(req.user.userId, currentPassword, newPassword);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password',
    });
  }
}
