import mongoose, { Schema, Document } from 'mongoose';

export type GalleryDisplayMode =
  | 'featured_hero'
  | 'editorial'
  | 'before_after'
  | 'horizontal_slider'
  | 'full_width'
  | 'standard_card';

export interface IPortfolioItem extends Document {
  id: string;
  title: string;
  titleEn: string;
  category: 'car' | 'home';
  subCategory: string;
  image: string;
  beforeImage?: string;
  afterImage?: string;
  description: string;
  descriptionEn: string;
  displayMode: GalleryDisplayMode;
  featured: boolean;
  homepageFeatured: boolean;
  mobileFeatured: boolean;
  sortOrder: number;
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioItemSchema = new Schema<IPortfolioItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    titleEn: { type: String, required: true },
    category: { type: String, enum: ['car', 'home'], required: true, index: true },
    subCategory: { type: String, default: '' },
    image: { type: String, required: true },
    beforeImage: { type: String },
    afterImage: { type: String },
    description: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    displayMode: {
      type: String,
      enum: ['featured_hero', 'editorial', 'before_after', 'horizontal_slider', 'full_width', 'standard_card'],
      default: 'before_after',
    },
    featured: { type: Boolean, default: false },
    homepageFeatured: { type: Boolean, default: false },
    mobileFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    visible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const PortfolioItem = createPrismaRepository('portfolioItem') as any;
