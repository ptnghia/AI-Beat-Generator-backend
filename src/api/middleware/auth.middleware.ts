/**
 * Admin Authentication Middleware
 * Protects admin routes with JWT verification
 */

import { Request, Response, NextFunction } from 'express';
import { adminAuthService } from '../../services/admin-auth.service';
import { loggingService } from '../../services/logging.service';
import { JWTPayload } from '../../types/admin.types';

// Extend Express Request to include admin user
declare global {
  namespace Express {
    interface Request {
      admin?: JWTPayload;
    }
  }
}

/**
 * Middleware to verify JWT token
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = adminAuthService.verifyToken(token);

    if (!payload) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      return;
    }

    // Attach admin info to request
    req.admin = payload;

    next();
  } catch (error) {
    loggingService.logError('AdminAuthMiddleware', error as Error, {
      path: req.path
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check if admin is super_admin
 */
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.admin) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
    return;
  }

  if (req.admin.role !== 'super_admin') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Super admin access required'
    });
    return;
  }

  next();
};
