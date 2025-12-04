import type { Request } from 'express';
import type { JwtPayload } from './auth.types.ts';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
