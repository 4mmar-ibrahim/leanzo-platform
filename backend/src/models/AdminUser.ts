import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export type AdminRoleType =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'booking_manager'
  | 'content_manager'
  | 'support'
  | 'technician';

export type PermissionLevel = 'hidden' | 'view' | 'edit';

export interface IAdminUser extends RepositoryRecord {
  name: string;
  username: string;
  email: string;
  phone?: string;
  password?: string;
  role: AdminRoleType | string;
  permissions?: Record<string, PermissionLevel>;
  granularPermissions?: string[];
  mustChangePasswordNextLogin?: boolean;
  status: 'active' | 'inactive';
  userType?: 'admin' | 'technician';
  technicianId?: string;
  avatar?: string;
  createdBy?: string;
  createdByName?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export const AdminUser = createPrismaRepository('adminUser') as any;
