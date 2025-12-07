import type { Request } from 'express';
import type { JwtPayload } from './auth.types.ts';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  vendor?: {
    id: string;
    userId: string;
    businessName: string | null;
    businessAddress: string | null;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}
