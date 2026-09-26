import mongoose, { Document, Schema } from 'mongoose';

export interface IMedia extends Document {
  id: string;
  originalName: string;
  fileName: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  source: 'device' | 'url';
  sourceUrl?: string;
  storagePath: string;
  url: string;
  isArchived: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    id: { type: String, required: true, unique: true, index: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true, unique: true },
    type: { type: String, enum: ['image', 'video'], required: true, index: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    source: { type: String, enum: ['device', 'url'], required: true },
    sourceUrl: { type: String },
    storagePath: { type: String, required: true },
    url: { type: String, required: true },
    isArchived: { type: Boolean, default: false, index: true },
    createdBy: { type: String, default: 'admin' },
  },
  {
    timestamps: true,
  }
);

// Search index on originalName
MediaSchema.index({ originalName: 'text' });

import { createPrismaRepository } from './prismaModelBridge.js';
export const Media = createPrismaRepository('media') as any;
export default Media;
