import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  id: string;
  customerName: string;
  customerNameEn?: string;
  avatar?: string;
  image?: string;
  rating?: number;
  date?: string;
  comment: string;
  commentEn?: string;
  serviceName: string;
  serviceNameEn?: string;
  category: 'car' | 'home';
  verified: boolean;
  visible: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    id: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true },
    customerNameEn: { type: String, default: '' },
    avatar: { type: String, default: '' },
    image: { type: String, default: '' },
    rating: { type: Number, default: 5 },
    date: { type: String, default: 'مؤخراً' },
    comment: { type: String, required: true },
    commentEn: { type: String, default: '' },
    serviceName: { type: String, required: true },
    serviceNameEn: { type: String, default: '' },
    category: { type: String, enum: ['car', 'home'], default: 'car', index: true },
    verified: { type: Boolean, default: true },
    visible: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const ReviewModel = createPrismaRepository('review') as any;
export default ReviewModel;
