import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/express.types.ts';
import { verifyAccessToken } from '../utils/jwt.util.ts';
import { UserRole } from '../../prisma/generated/enums.ts';

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'No authorization header provided',
      });
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Use: Bearer <token>',
      });
      return;
    }

    const token = parts[1];
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token not provided',
      });
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
}

/**
 * Authorization middleware - checks user roles
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}
