import { createPrismaRepository } from './prismaModelBridge.js';

export interface ISubscriptionPlan {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  image?: string;
  serviceId: string;
  visitCount: number;
  price: number;
  durationDays: number;
  status: 'active' | 'inactive' | 'archived';
  allowRenewal: boolean;
  allowCancellation: boolean;
  allowRescheduling: boolean;
  cancellationNoticeHours: number;
  rescheduleNoticeHours: number;
  cashbackPercentage?: number;
  cashbackAmount?: number;
  terms?: string;
  termsEn?: string;
  features?: string[];
  featuresEn?: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export const SubscriptionPlan = createPrismaRepository('subscriptionPlan') as any;
