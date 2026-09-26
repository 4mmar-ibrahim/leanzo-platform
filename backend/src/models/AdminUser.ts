import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type AdminRoleType =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'booking_manager'
  | 'content_manager'
  | 'support'
  | 'technician';

export type PermissionLevel = 'hidden' | 'view' | 'edit';

export interface IAdminUser extends Document {
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

const AdminUserSchema = new Schema<IAdminUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      default: 'manager',
      index: true,
    },
    userType: {
      type: String,
      enum: ['admin', 'technician'],
      default: 'admin',
      index: true,
    },
    technicianId: {
      type: String,
      trim: true,
      index: true,
    },
    permissions: { type: Schema.Types.Mixed, default: {} },
    granularPermissions: { type: [String], default: [] },
    mustChangePasswordNextLogin: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80' },
    createdBy: { type: String },
    createdByName: { type: String },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).password;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete (ret as any).password;
        return ret;
      },
    },
  }
);

AdminUserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

AdminUserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

import { createPrismaRepository } from './prismaModelBridge.js';
export const AdminUser = createPrismaRepository('adminUser') as any;
