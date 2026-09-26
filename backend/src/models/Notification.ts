import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  target: 'admin' | 'customer';
  userId?: string; // If customer specific
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  type: 'order' | 'customer' | 'system' | 'technician' | 'offer' | 'info';
  read: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    target: { type: String, enum: ['admin', 'customer'], required: true, index: true },
    userId: { type: String, index: true },
    title: { type: String, required: true },
    titleEn: { type: String, required: true },
    message: { type: String, required: true },
    messageEn: { type: String, required: true },
    type: { type: String, enum: ['order', 'customer', 'system', 'technician', 'offer', 'info'], default: 'order' },
    read: { type: Boolean, default: false, index: true },
    link: { type: String },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const Notification = createPrismaRepository('notification') as any;
