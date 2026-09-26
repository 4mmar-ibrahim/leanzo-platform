import mongoose, { Schema, Document, Model } from 'mongoose';

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'inactive';
export type CouponComputedStatus = 'active' | 'inactive' | 'expired' | 'exhausted';

export interface ICoupon extends Document {
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

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: null,
    },
    applicableServiceIds: {
      type: [String],
      default: [],
    },
    totalUsageLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 100,
    },
    currentUsageCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      index: true,
    },
    perCustomerLimit: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    startDate: {
      type: String,
      required: true, // Format: YYYY-MM-DD
      index: true,
    },
    endDate: {
      type: String,
      required: true, // Format: YYYY-MM-DD
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

CouponSchema.methods.getComputedStatus = function (this: ICoupon): CouponComputedStatus {
  if (this.isArchived || this.status === 'inactive') {
    return 'inactive';
  }
  const today = new Date().toISOString().split('T')[0];
  if (today > this.endDate) {
    return 'expired';
  }
  if (this.currentUsageCount >= this.totalUsageLimit) {
    return 'exhausted';
  }
  return 'active';
};

// Ensure uniqueness is strictly enforced
CouponSchema.index({ code: 1, isArchived: 1 });

import { createPrismaRepository } from './prismaModelBridge.js';
export const Coupon: any = createPrismaRepository('coupon') as any;
