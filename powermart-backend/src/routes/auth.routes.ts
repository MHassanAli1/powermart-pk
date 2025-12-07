import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPasswordHandler,
  changePasswordHandler,
} from '../controllers/auth.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  validate,
} from '../middleware/validation.middleware.ts';

const router = Router();

// Public routes - Authentication
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refreshTokenValidation, validate, refreshToken);

// Public routes - Email verification
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

// Public routes - Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordHandler);

// Protected routes
router.post('/logout', authenticate, refreshTokenValidation, validate, logout);
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePasswordHandler);

export default router;
