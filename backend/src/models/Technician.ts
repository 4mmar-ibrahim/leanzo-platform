import mongoose, { Schema, Document } from 'mongoose';

export interface ITechnician extends Document {
  id: string; // e.g. 'tech-1'
  name: string;
  phone: string;
  email?: string;
  avatar: string;
  rating: number;
  specialty: string;
  specialtiesList: string[];
  status: 'available' | 'busy' | 'offline';
  active: boolean;
  completedOrders: number;
  assignedOrders: number;
  bio?: string;
  nationalId?: string;
  joinedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TechnicianSchema = new Schema<ITechnician>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true },
    avatar: { type: String, default: '/uploads/images/default-avatar.png' },
    rating: { type: Number, default: 5.0 },
    specialty: { type: String, default: 'غسيل سيارات وتنظيف منازل' },
    specialtiesList: [{ type: String }],
    status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available', index: true },
    active: { type: Boolean, default: true, index: true },
    completedOrders: { type: Number, default: 0 },
    assignedOrders: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    nationalId: { type: String, default: '' },
    joinedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const Technician = createPrismaRepository('technician') as any;
