import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
} from '../controllers/auth.controller.ts';
import { authenticate } from '../middleware/auth.middleware.ts';
import {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  validate,
} from '../middleware/validation.middleware.ts';

const router = Router();

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', refreshTokenValidation, validate, refreshToken);

// Protected routes
router.post('/logout', authenticate, refreshTokenValidation, validate, logout);
router.get('/profile', authenticate, getProfile);

export default router;
