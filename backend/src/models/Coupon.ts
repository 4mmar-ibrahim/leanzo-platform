import { createPrismaRepository, type RepositoryRecord } from './prismaModelBridge.js';

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'inactive';
export type CouponComputedStatus = 'active' | 'inactive' | 'expired' | 'exhausted';

export interface ICoupon extends RepositoryRecord {
  code: string; // e.g. "CLEANZO20"
  name?: string; // Optional descriptive title e.g. "خصم الافتتاح الكبير"
  discountType: CouponDiscountType;
  discountValue: number; // e.g. 20 (percent) or 50 (EGP)
  totalUsageLimit: number; // Maximum total redemptions
  currentUsageCount: number; // Current redemptions count
  perCustomerLimit: number; // Maximum redemptions per customer
  minOrderAmount?: number; // Minimum order total required (EGP)
  maxDiscount?: number; // Maximum discount cap for percentage discounts (EGP)
  applicableServiceIds?: string[]; // Specific services the coupon applies to (empty = all)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: CouponStatus;
  isArchived: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Computed helper
  getComputedStatus(): CouponComputedStatus;
}

export const Coupon: any = createPrismaRepository('coupon') as any;
