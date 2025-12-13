/**
 * Admin Authentication Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { adminAuthService } from '../../services/admin-auth.service';
import { loggingService } from '../../services/logging.service';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/admin/login
 * Admin login endpoint
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username and password are required'
      });
    }

    // Attempt login
    const loginResponse = await adminAuthService.login({ username, password });

    res.json(loginResponse);
  } catch (error) {
    if ((error as Error).message === 'Invalid username or password') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password'
      });
    }
    next(error);
  }
});

/**
 * GET /api/admin/me
 * Get current admin user info
 */
router.get('/me', authenticateAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Not authenticated'
      });
    }

    const adminUser = await adminAuthService.getAdminById(req.admin.userId);

    if (!adminUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Admin user not found'
      });
    }

    res.json(adminUser);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/change-password
 * Change admin password
 */
router.post('/change-password', authenticateAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Not authenticated'
      });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Old password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 8 characters'
      });
    }

    await adminAuthService.changePassword(req.admin.userId, oldPassword, newPassword);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    if ((error as Error).message === 'Invalid old password') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid old password'
      });
    }
    next(error);
  }
});

/**
 * GET /api/admin/users
 * List all admin users (super_admin only)
 */
router.get('/users', authenticateAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Not authenticated'
      });
    }

    // Only super_admin can list users
    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Super admin access required'
      });
    }

    const adminUsers = await adminAuthService.listAdmins();

    res.json({
      data: adminUsers,
      total: adminUsers.length
    });
  } catch (error) {
    next(error);
  }
});

export { router as adminAuthRoutes };
