import { createPrismaRepository } from './prismaModelBridge.js';
import { BookingStatus, ITimelineEvent } from './Booking.js';

export interface ISubscriptionVisit {
  id: string; // e.g. VIS-2026-000001
  subscriptionId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  visitIndex: number;
  date: string; // YYYY-MM-DD
  time: string; // "10:00 – 10:45"
  timeSlotStart: string; // "10:00"
  scheduledStart: string; // "10:00"
  scheduledEnd: string; // "10:45"
  duration: number;
  serviceDurationMinutes: number;
  travelTimeMinutes: number;
  totalOccupiedMinutes: number;
  serviceSnapshot: Record<string, any>;
  packageSnapshot?: Record<string, any>;
  addons: any[];
  vehicleDetails?: {
    make?: string;
    model?: string;
    plateNumber?: string;
    color?: string;
    year?: string;
  };
  address: any;
  status: BookingStatus;
  assignedTechnicianId?: string;
  technician?: Record<string, any>;
  rescheduledFrom?: string;
  rescheduledAt?: Date;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancellationSource?: 'customer' | 'admin';
  completedAt?: Date;
  completedBy?: Record<string, any>;
  cashbackAwarded: number;
  cashbackAwardedAt?: Date;
  timeline: ITimelineEvent[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const SubscriptionVisit = createPrismaRepository('subscriptionVisit') as any;
