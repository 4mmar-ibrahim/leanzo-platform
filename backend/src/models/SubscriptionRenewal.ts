import { createPrismaRepository } from './prismaModelBridge.js';

export interface ISubscriptionRenewal {
  id: string;
  subscriptionId: string;
  customerId?: string;
  customerPhone: string;
  oldPlanId: string;
  newPlanId: string;
  newSubscriptionId?: string;
  renewalCycle: number;
  renewalPrice: number;
  status: 'pending' | 'completed' | 'failed';
  renewedAt: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export const SubscriptionRenewal = createPrismaRepository('subscriptionRenewal') as any;
