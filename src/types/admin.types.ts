/**
 * Admin User Types
 */

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'super_admin';
  createdAt: Date;
}

export interface AdminCredentials {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  user: Omit<AdminUser, 'createdAt'> & { createdAt: string };
  expiresIn: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
