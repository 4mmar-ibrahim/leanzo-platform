import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export interface ICouponUsage extends RepositoryRecord {
  couponId: string;
  couponCode: string;
  customerPhone: string;
  customerId?: string;
  customerName?: string;
  orderId: string; // Ref to Booking id (e.g. "CLZ-2026-101")
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  actualDiscountAmount: number;
  originalPrice: number;
  finalPrice: number;
  usedAt: Date;
}

export const CouponUsage: any = createPrismaRepository('couponUsage') as any;
