import { createPrismaRepository } from './prismaModelBridge.js';

export interface ISubscriptionCashback {
  id: string;
  subscriptionId: string;
  visitId?: string;
  customerId?: string;
  customerPhone: string;
  amount: number;
  type: 'credit' | 'debit';
  description?: string;
  createdAt: Date;
}

export const SubscriptionCashback = createPrismaRepository('subscriptionCashback') as any;
