import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

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

export interface IUser extends RepositoryRecord {
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
  source: 'website' | 'whatsapp' | 'facebook' | 'instagram' | 'telegram' | 'tiktok' | 'social_media' | 'other';
  notes: Array<{ id: string; text: string; date: string; author: string }>;
  tags: string[];
  discount?: number;
  totalSpent: number;
  ordersCount: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export const User = createPrismaRepository('user') as any;
