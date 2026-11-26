import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

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

export interface IBooking extends RepositoryRecord {
  id: string; // Order Number e.g. CLN-2026-000101
  customerId?: string;
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

export const Booking = createPrismaRepository('booking') as any;
