import mongoose, { Schema, Document } from 'mongoose';

export type BookingStatus = 'pending' | 'confirmed' | 'assigned' | 'on_the_way' | 'in_progress' | 'completed' | 'cancelled';

export interface ITimelineEvent {
  status: BookingStatus;
  label: string;
  labelEn: string;
  timestamp: string;
  completed: boolean;
  description?: string;
  descriptionEn?: string;
  changedBy?: string;
}

export interface IBookingAddress {
  addressId?: string;
  label: string;
  governorateId?: string;
  governorateNameSnapshot?: string;
  cityId?: string;
  cityNameSnapshot?: string;
  governorate: string;
  city: string;
  area: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  notes?: string;
  details?: string;
}

export interface IBooking extends Document {
  id: string; // Order Number e.g. CLN-2026-000101
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceSnapshot: {
    id: string;
    title: string;
    titleEn: string;
    category: string;
    image: string;
    price: number;
    duration: number;
  };
  category: string;
  date: string; // YYYY-MM-DD
  time: string; // "10:00 AM"
  timeSlotStart: string; // "10:00" in 24h format for slot math
  scheduledStart: string; // "10:00" in 24h format
  scheduledEnd: string; // "11:00" in 24h format
  duration: number; // minutes
  serviceDurationMinutes: number;
  travelTimeMinutes: number;
  totalOccupiedMinutes: number;
  rescheduledFrom?: string;
  rescheduledAt?: Date;
  address: IBookingAddress;
  basePrice: number;
  discount: number;
  serviceFee: number;
  finalPrice: number;
  currency: string;
  promoCode?: string;
  couponSnapshot?: {
    couponId: string;
    couponCode: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    actualDiscountAmount: number;
    originalPrice: number;
    finalPrice: number;
  };
  status: BookingStatus;
  completedAt?: Date;
  completedBy?: {
    id: string;
    name: string;
    role?: string;
  };
  assignedTechnicianId?: string;
  technician?: {
    id: string;
    name: string;
    phone: string;
    avatar: string;
    rating: number;
    specialty: string;
  };
  timeline: ITimelineEvent[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TimelineEventSchema = new Schema<ITimelineEvent>({
  status: { type: String, required: true },
  label: { type: String, required: true },
  labelEn: { type: String, required: true },
  timestamp: { type: String, required: true },
  completed: { type: Boolean, default: false },
  description: { type: String },
  descriptionEn: { type: String },
  changedBy: { type: String },
});

const BookingAddressSchema = new Schema<IBookingAddress>({
  addressId: { type: String },
  label: { type: String, default: 'المنزل' },
  governorateId: { type: String },
  governorateNameSnapshot: { type: String },
  cityId: { type: String },
  cityNameSnapshot: { type: String },
  governorate: { type: String, required: true },
  city: { type: String, required: true },
  area: { type: String, required: true },
  building: { type: String },
  floor: { type: String },
  apartment: { type: String },
  landmark: { type: String },
  notes: { type: String },
  details: { type: String },
});

const BookingSchema = new Schema<IBooking>(
  {
    id: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true, index: true },
    serviceId: { type: String, required: true, index: true },
    serviceSnapshot: {
      id: { type: String, required: true },
      title: { type: String, required: true },
      titleEn: { type: String, required: true },
      category: { type: String, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true },
      duration: { type: Number, required: true },
    },
    category: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    timeSlotStart: { type: String, required: true, index: true },
    scheduledStart: { type: String, required: true, index: true },
    scheduledEnd: { type: String, required: true, index: true },
    duration: { type: Number, required: true, default: 60 },
    serviceDurationMinutes: { type: Number, default: 45 },
    travelTimeMinutes: { type: Number, default: 15 },
    totalOccupiedMinutes: { type: Number, default: 60 },
    rescheduledFrom: { type: String },
    rescheduledAt: { type: Date },
    address: { type: BookingAddressSchema, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ج.م' },
    promoCode: { type: String },
    couponSnapshot: {
      couponId: { type: String },
      couponCode: { type: String },
      discountType: { type: String, enum: ['percentage', 'fixed'] },
      discountValue: { type: Number },
      discountAmount: { type: Number },
      actualDiscountAmount: { type: Number },
      originalPrice: { type: Number },
      finalPrice: { type: Number },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    completedAt: { type: Date },
    completedBy: {
      id: { type: String },
      name: { type: String },
      role: { type: String },
    },
    assignedTechnicianId: { type: String, index: true },
    technician: {
      id: String,
      name: String,
      phone: String,
      avatar: String,
      rating: Number,
      specialty: String,
    },
    timeline: [TimelineEventSchema],
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound index for availability checking: date + status
BookingSchema.index({ date: 1, status: 1 });

import { createPrismaRepository } from './prismaModelBridge.js';
export const Booking = createPrismaRepository('booking') as any;
