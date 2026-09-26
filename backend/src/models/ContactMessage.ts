import mongoose, { Schema, Document } from 'mongoose';

export type ContactStatus = 'new' | 'read' | 'replied' | 'closed';

export interface IContactMessage extends Document {
  name: string;
  phone: string;
  email?: string;
  message: string;
  source: string;
  status: ContactStatus;
  ip?: string;
  replyNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    message: { type: String, required: true },
    source: { type: String, default: 'contact_page' },
    status: { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new', index: true },
    ip: { type: String },
    replyNote: { type: String },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const ContactMessage = createPrismaRepository('contactMessage') as any;
