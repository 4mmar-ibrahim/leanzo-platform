import { createPrismaRepository } from './prismaModelBridge.js';

export type SubscriptionStatus = 'active' | 'completed' | 'expired' | 'cancelled' | 'paused';

export interface ISubscription {
  id: string; // e.g. SUB-2026-000001
  customerId?: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  serviceId: string;
  serviceSnapshot: {
    id: string;
    title: string;
    titleEn?: string;
    category: string;
    image: string;
    duration?: number;
    travelTime?: number;
  };
  planSnapshot: {
    id: string;
    name: string;
    visitCount: number;
    price: number;
    durationDays: number;
    cancellationNoticeHours: number;
    rescheduleNoticeHours: number;
  };
  vehicleId?: string;
  vehicleDetails?: {
    make?: string;
    model?: string;
    plateNumber?: string;
    color?: string;
    year?: string;
  };
  address: any;
  category: string;
  status: SubscriptionStatus;
  totalVisits: number;
  usedVisits: number;
  remainingVisits: number;
  price: number;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  renewalCycle: number;
  renewedFromId?: string;
  renewedToId?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export const Subscription = createPrismaRepository('subscription') as any;
