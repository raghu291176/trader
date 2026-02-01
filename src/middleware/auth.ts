/**
 * Clerk Authentication Middleware
 * Protects API routes and provides user context
 */

import { Request, Response, NextFunction } from 'express';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        sessionId?: string;
        orgId?: string;
      };
    }
  }
}

/**
 * Require authentication for route
 * Adds req.auth with userId
 */
export const requireAuth = ClerkExpressRequireAuth();

/**
 * Optional authentication
 * Allows both authenticated and public access
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  // Try to get user from Clerk but don't fail if not authenticated
  next();
};

/**
 * Extract user ID from authenticated request
 */
export function getUserId(req: Request): string {
  if (!req.auth?.userId) {
    throw new Error('Unauthorized: No user ID found');
  }
  return req.auth.userId;
}
