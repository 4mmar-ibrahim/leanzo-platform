import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export interface CustomerTokenPayload {
  id: string;
  phone: string;
  type: 'customer';
}

export interface CustomerRefreshTokenPayload {
  id: string;
  phone: string;
  type: 'customer_refresh';
}

export interface AdminTokenPayload {
  id: string;
  username: string;
  role: string;
  userType?: string;
  technicianId?: string;
  type: 'admin';
}

export interface AdminRefreshTokenPayload {
  id: string;
  username: string;
  role: string;
  userType?: string;
  technicianId?: string;
  type: 'admin_refresh';
}

export function generateCustomerToken(payload: Omit<CustomerTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'customer' }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload {
  const decoded = jwt.verify(token, ENV.JWT_SECRET) as CustomerTokenPayload;
  if (!decoded || decoded.type !== 'customer') {
    throw new Error('INVALID_CUSTOMER_TOKEN');
  }
  return decoded;
}

export function generateCustomerRefreshToken(payload: Omit<CustomerRefreshTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'customer_refresh' }, ENV.CUSTOMER_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyCustomerRefreshToken(token: string): CustomerRefreshTokenPayload {
  const decoded = jwt.verify(token, ENV.CUSTOMER_REFRESH_SECRET) as CustomerRefreshTokenPayload;
  if (!decoded || decoded.type !== 'customer_refresh') {
    throw new Error('INVALID_CUSTOMER_REFRESH_TOKEN');
  }
  return decoded;
}

export function generateAdminToken(payload: Omit<AdminTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'admin' }, ENV.ADMIN_JWT_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES_IN as any,
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, ENV.ADMIN_JWT_SECRET) as AdminTokenPayload;
  if (!decoded || decoded.type !== 'admin') {
    throw new Error('INVALID_ADMIN_TOKEN');
  }
  return decoded;
}

export function generateAdminRefreshToken(payload: Omit<AdminRefreshTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'admin_refresh' }, ENV.ADMIN_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyAdminRefreshToken(token: string): AdminRefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, ENV.ADMIN_REFRESH_SECRET) as AdminRefreshTokenPayload;
    if (decoded && decoded.type === 'admin_refresh') {
      return decoded;
    }
  } catch (err: any) {
    // If signed with admin JWT secret as fallback
    try {
      const fallbackDecoded = jwt.verify(token, ENV.ADMIN_JWT_SECRET) as any;
      if (fallbackDecoded && (fallbackDecoded.type === 'admin' || fallbackDecoded.role)) {
        return {
          id: fallbackDecoded.id,
          username: fallbackDecoded.username,
          role: fallbackDecoded.role,
          type: 'admin_refresh',
        };
      }
    } catch {}
    throw err;
  }
  throw new Error('INVALID_ADMIN_REFRESH_TOKEN');
}

