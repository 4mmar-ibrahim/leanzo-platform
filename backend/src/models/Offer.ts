import mongoose, { Schema, Document } from 'mongoose';

export interface IOffer extends Document {
  id: string; // e.g. 'ramadan-special'
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  discountPercentage: number;
  code: string;
  expiresAt: string; // YYYY-MM-DD
  startDate?: string;
  badge: string;
  badgeEn: string;
  serviceId?: string;
  category?: 'car' | 'home';
  image: string;
  active: boolean;
  isArchived: boolean;
  promoCode?: string;
  usageLimit?: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    titleEn: { type: String, required: true },
    description: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    discountPercentage: { type: Number, required: true, min: 1, max: 100 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    expiresAt: { type: String, required: true, index: true },
    startDate: { type: String, index: true },
    badge: { type: String, default: 'عرض خاص' },
    badgeEn: { type: String, default: 'Special Offer' },
    serviceId: { type: String },
    category: { type: String, enum: ['car', 'home'] },
    image: { type: String, required: true },
    active: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    promoCode: { type: String, index: true },
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const Offer = createPrismaRepository('offer') as any;
