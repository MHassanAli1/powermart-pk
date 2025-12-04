import { Request } from 'express';
import { JwtPayload } from './auth.types.ts';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
