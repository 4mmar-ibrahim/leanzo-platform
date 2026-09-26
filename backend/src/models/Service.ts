import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
  id: string; // e.g. 'car-wash-steam'
  category: string;
  subCategory?: string;
  title: string;
  titleEn: string;
  shortDescription: string;
  shortDescriptionEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  price: number;
  originalPrice?: number;
  duration: number; // in minutes (legacy alias)
  serviceDurationMinutes?: number; // actual service duration
  travelTimeMinutes?: number; // technician transit buffer
  totalOccupiedMinutes?: number; // serviceDurationMinutes + travelTimeMinutes
  rating: number;
  reviewCount: number;
  popular: boolean;
  available: boolean;
  isArchived: boolean;
  discount?: number;
  features: string[];
  featuresEn: string[];
  inclusions: string[];
  inclusionsEn: string[];
  importantNotes?: string[];
  importantNotesEn?: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    id: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, index: true },
    subCategory: { type: String },
    title: { type: String, required: true },
    titleEn: { type: String, required: true },
    shortDescription: { type: String, default: '' },
    shortDescriptionEn: { type: String, default: '' },
    description: { type: String, default: '' },
    descriptionEn: { type: String, default: '' },
    image: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number },
    duration: { type: Number, required: true, min: 5, default: 45 }, // minutes
    serviceDurationMinutes: { type: Number, min: 1, default: 45 },
    travelTimeMinutes: { type: Number, min: 0, default: 15 },
    totalOccupiedMinutes: { type: Number, default: 60 },
    rating: { type: Number, default: 5.0 },
    reviewCount: { type: Number, default: 0 },
    popular: { type: Boolean, default: false },
    available: { type: Boolean, default: true, index: true },
    isArchived: { type: Boolean, default: false, index: true },
    discount: { type: Number, default: 0 },
    features: [{ type: String }],
    featuresEn: [{ type: String }],
    inclusions: [{ type: String }],
    inclusionsEn: [{ type: String }],
    importantNotes: [{ type: String }],
    importantNotesEn: [{ type: String }],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Synchronize durations before save
ServiceSchema.pre('save', function (next) {
  if (this.serviceDurationMinutes === undefined || this.serviceDurationMinutes === null) {
    this.serviceDurationMinutes = this.duration || 45;
  }
  if (this.travelTimeMinutes === undefined || this.travelTimeMinutes === null) {
    this.travelTimeMinutes = 15;
  }
  this.duration = this.serviceDurationMinutes;
  this.totalOccupiedMinutes = this.serviceDurationMinutes + this.travelTimeMinutes;
  next();
});

import { createPrismaRepository } from './prismaModelBridge.js';
export const Service = createPrismaRepository('service') as any;
