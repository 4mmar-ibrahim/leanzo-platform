import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCategory extends Document {
  id: string; // 'car' | 'home' or slug
  slug: string;
  name: string;
  nameEn: string;
  description?: string;
  descriptionEn?: string;
  icon?: string;
  image?: string;
  active: boolean;
  order: number;
}

const ServiceCategorySchema = new Schema<IServiceCategory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameEn: { type: String, required: true },
    description: { type: String },
    descriptionEn: { type: String },
    icon: { type: String },
    image: { type: String },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const ServiceCategory = createPrismaRepository('serviceCategory') as any;
