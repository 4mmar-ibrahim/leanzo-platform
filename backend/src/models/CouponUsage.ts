import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICouponUsage extends Document {
  couponId: mongoose.Types.ObjectId;
  couponCode: string;
  customerPhone: string;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  orderId: string; // Ref to Booking id (e.g. "CLZ-2026-101")
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  actualDiscountAmount: number;
  originalPrice: number;
  finalPrice: number;
  usedAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    couponCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: 'عميل كلينزو',
    },
    orderId: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
    },
    actualDiscountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    usedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index to quickly count usage per customer phone per coupon
CouponUsageSchema.index({ couponId: 1, customerPhone: 1 });
CouponUsageSchema.index({ couponCode: 1, customerPhone: 1 });
CouponUsageSchema.index({ orderId: 1 }, { unique: true });

import { createPrismaRepository } from './prismaModelBridge.js';
export const CouponUsage: any = createPrismaRepository('couponUsage') as any;
