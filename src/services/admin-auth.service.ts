/**
 * Admin Authentication Service
 * Handles JWT-based authentication for admin users
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AdminUser, AdminCredentials, AdminLoginResponse, JWTPayload } from '../types/admin.types';
import { PrismaClient } from '@prisma/client';
import { loggingService } from './logging.service';

const prisma = new PrismaClient();

class AdminAuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = '24h' as const;
  private readonly SALT_ROUNDS: number = 10;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    if (this.JWT_SECRET === 'your-secret-key-change-in-production') {
      loggingService.warn('Using default JWT secret. Please set JWT_SECRET in .env for production!', {
        service: 'AdminAuthService'
      });
    }
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(user: AdminUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const options: SignOptions = {
      expiresIn: this.JWT_EXPIRES_IN
    };
    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      loggingService.logError('AdminAuthService', error as Error, {
        operation: 'verifyToken'
      });
      return null;
    }
  }

  /**
   * Login admin user
   */
  async login(credentials: AdminCredentials): Promise<AdminLoginResponse> {
    const { username, password } = credentials;

    // Find admin user by username
    const adminUser = await (prisma as any).adminUser.findUnique({
      where: { username }
    });

    if (!adminUser) {
      loggingService.warn('Login attempt with invalid username', {
        service: 'AdminAuthService',
        username
      });
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(password, adminUser.passwordHash);

    if (!isPasswordValid) {
      loggingService.warn('Login attempt with invalid password', {
        service: 'AdminAuthService',
        username
      });
      throw new Error('Invalid username or password');
    }

    // Update last login
    await (prisma as any).adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate token
    const token = this.generateToken({
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role as 'admin' | 'super_admin',
      createdAt: adminUser.createdAt
    });

    loggingService.info('Admin user logged in successfully', {
      service: 'AdminAuthService',
      userId: adminUser.id,
      username: adminUser.username
    });

    return {
      token,
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role as 'admin' | 'super_admin',
        createdAt: adminUser.createdAt.toISOString()
      },
      expiresIn: this.JWT_EXPIRES_IN
    };
  }

  /**
   * Create admin user (for initial setup)
   */
  async createAdmin(
    username: string,
    email: string,
    password: string,
    role: 'admin' | 'super_admin' = 'admin'
  ): Promise<AdminUser> {
    // Check if username already exists
    const existingUser = await (prisma as any).adminUser.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await (prisma as any).adminUser.findUnique({
      where: { email }
    });

    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create admin user
    const adminUser = await (prisma as any).adminUser.create({
      data: {
        username,
        email,
        passwordHash,
        role
      }
    });

    loggingService.info('Admin user created', {
      service: 'AdminAuthService',
      userId: adminUser.id,
      username: adminUser.username,
      role: adminUser.role
    });

    return {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role as 'admin' | 'super_admin',
      createdAt: adminUser.createdAt
    };
  }

  /**
   * Change admin password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const adminUser = await (prisma as any).adminUser.findUnique({
      where: { id: userId }
    });

    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    // Verify old password
    const isOldPasswordValid = await this.comparePassword(oldPassword, adminUser.passwordHash);

    if (!isOldPasswordValid) {
      throw new Error('Invalid old password');
    }

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    await (prisma as any).adminUser.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    loggingService.info('Admin password changed', {
      service: 'AdminAuthService',
      userId: adminUser.id
    });
  }

  /**
   * Get admin user by ID
   */
  async getAdminById(userId: string): Promise<AdminUser | null> {
    const adminUser = await (prisma as any).adminUser.findUnique({
      where: { id: userId }
    });

    if (!adminUser) {
      return null;
    }

    return {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: adminUser.role as 'admin' | 'super_admin',
      createdAt: adminUser.createdAt
    };
  }

  /**
   * List all admin users
   */
  async listAdmins(): Promise<AdminUser[]> {
    const adminUsers = await (prisma as any).adminUser.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return adminUsers.map((user: any) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role as 'admin' | 'super_admin',
      createdAt: user.createdAt
    }));
  }
}

export const adminAuthService = new AdminAuthService();
