import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAddress {
  _id?: string;
  label: string;
  governorate: string;
  city: string;
  area: string;
  building?: string;
  floor?: string;
  apartment?: string;
  details?: string;
  isDefault?: boolean;
}

export interface IUser extends Document {
  name: string;
  phone: string;
  password?: string;
  email?: string;
  avatar?: string;
  addresses: IAddress[];
  status: 'active' | 'inactive' | 'suspended' | 'deleted' | 'disabled';
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deletionReason?: string;
  source: 'website' | 'whatsapp' | 'social_media' | 'other';
  notes: Array<{ id: string; text: string; date: string; author: string }>;
  tags: string[];
  discount?: number;
  totalSpent: number;
  ordersCount: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const AddressSchema = new Schema<IAddress>({
  label: { type: String, required: true, default: 'المنزل' },
  governorate: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, required: true },
  building: { type: String },
  floor: { type: String },
  apartment: { type: String },
  details: { type: String },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80' },
    addresses: [AddressSchema],
    status: { type: String, enum: ['active', 'inactive', 'suspended', 'deleted', 'disabled'], default: 'active', index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    deletionReason: { type: String },
    source: { type: String, enum: ['website', 'whatsapp', 'social_media', 'other'], default: 'website' },
    notes: [
      {
        id: { type: String, default: () => `note-${Date.now()}` },
        text: String,
        date: String,
        author: String,
      },
    ],
    tags: [{ type: String }],
    discount: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
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

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

import { createPrismaRepository } from './prismaModelBridge.js';
export const User = createPrismaRepository('user') as any;
