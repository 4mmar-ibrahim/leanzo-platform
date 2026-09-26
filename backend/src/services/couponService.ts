import { Coupon, ICoupon } from '../models/Coupon.js';
import { CouponUsage, ICouponUsage } from '../models/CouponUsage.js';
import { Offer } from '../models/Offer.js';

export interface CouponValidationResult {
  isValid: boolean;
  coupon: ICoupon;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  actualDiscountAmount: number;
  originalPrice: number;
  finalPrice: number;
  remainingTotalUsages: number;
  customerUsageCount: number;
  customerRemainingUsages: number;
}

export class CouponValidationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code = 'INVALID_COUPON', statusCode = 422) {
    super(message);
    this.name = 'CouponValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Normalizes phone number strings for consistent per-customer limit checks.
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
}

/**
 * Authoritative Coupon Validator & Price Calculator
 * Validates active status, date windows, total limit, and per-customer limit.
 */
export async function validateCoupon(
  code: string,
  orderTotal: number,
  customerPhone?: string,
  serviceId?: string
): Promise<CouponValidationResult> {
  if (!code || !code.trim()) {
    throw new CouponValidationError('يرجى إدخال كود الكوبون', 'EMPTY_CODE');
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: cleanCode, isArchived: false });

  if (!coupon) {
    // Check if the code belongs to a Promotional Offer
    const offer = await Offer.findOne({ code: cleanCode, isArchived: false });
    if (!offer) {
      throw new CouponValidationError('كود الكوبون أو العرض غير صحيح أو غير موجود', 'COUPON_NOT_FOUND', 404);
    }

    if (!offer.active) {
      throw new CouponValidationError('هذا العرض الترويجي غير مفعّل حالياً', 'OFFER_DISABLED', 400);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (offer.startDate && todayStr < offer.startDate) {
      throw new CouponValidationError(
        `هذا العرض الترويجي لم يبدأ بعد، سيبدأ تفعيله بتاريخ (${offer.startDate})`,
        'OFFER_NOT_STARTED',
        400
      );
    }

    if (todayStr > offer.expiresAt) {
      throw new CouponValidationError(
        `انتهت صلاحية هذا العرض الترويجي في تاريخ (${offer.expiresAt})`,
        'OFFER_EXPIRED',
        400
      );
    }

    if (offer.usageLimit && (offer.usageCount || 0) >= offer.usageLimit) {
      throw new CouponValidationError(
        `تم استنفاد الحد الأقصى المسموح به لاستخدام هذا العرض الترويجي (${offer.usageLimit} مستخدم)`,
        'OFFER_USAGE_LIMIT_REACHED',
        400
      );
    }

    const discPercent = offer.discountPercentage;
    const rawDiscount = Math.round((orderTotal * discPercent) / 100);
    const actualDiscount = Math.min(orderTotal, rawDiscount);
    const finalPrice = Math.max(0, orderTotal - actualDiscount);
    const remainingTotalUsages = offer.usageLimit ? Math.max(0, offer.usageLimit - (offer.usageCount || 0)) : 9999;

    return {
      isValid: true,
      coupon: {
        id: offer.id,
        _id: offer.id,
        code: offer.code,
        discountType: 'percentage',
        discountValue: discPercent,
        isOffer: true,
      } as any,
      code: offer.code,
      discountType: 'percentage',
      discountValue: discPercent,
      actualDiscountAmount: actualDiscount,
      originalPrice: orderTotal,
      finalPrice,
      remainingTotalUsages,
      customerUsageCount: 0,
      customerRemainingUsages: remainingTotalUsages,
    };
  }

  // 1. Status Check
  if (coupon.status !== 'active') {
    throw new CouponValidationError('هذا الكوبون غير مفعّل حالياً', 'COUPON_DISABLED', 400);
  }

  // 2. Date Window Check
  const todayStr = new Date().toISOString().split('T')[0];
  if (todayStr < coupon.startDate) {
    throw new CouponValidationError(
      `هذا الكوبون لم يبدأ بعد، سيبدأ تفعيله بتاريخ (${coupon.startDate})`,
      'COUPON_NOT_STARTED',
      400
    );
  }

  if (todayStr > coupon.endDate) {
    throw new CouponValidationError(
      `انتهت صلاحية هذا الكوبون في تاريخ (${coupon.endDate})`,
      'COUPON_EXPIRED',
      400
    );
  }

  // 3. Service Scope Check
  if (
    serviceId &&
    coupon.applicableServiceIds &&
    coupon.applicableServiceIds.length > 0 &&
    !coupon.applicableServiceIds.includes(serviceId)
  ) {
    throw new CouponValidationError(
      'هذا الكوبون غير مخصص للخدمة المحددة',
      'SERVICE_NOT_APPLICABLE',
      400
    );
  }

  // 4. Minimum Order Amount Check
  if (coupon.minOrderAmount && coupon.minOrderAmount > 0 && orderTotal < coupon.minOrderAmount) {
    throw new CouponValidationError(
      `الحد الأدنى لقيمة الطلب لتطبيق هذا الكوبون هو (${coupon.minOrderAmount} ج.م)`,
      'MIN_ORDER_NOT_MET',
      400
    );
  }

  // 5. Total Usage Limit Check
  if (coupon.currentUsageCount >= coupon.totalUsageLimit) {
    throw new CouponValidationError(
      'تم استنفاد الحد الأقصى المتاح لاستخدام هذا الكوبون بالكامل',
      'COUPON_EXHAUSTED',
      400
    );
  }

  // 6. Per-Customer Usage Limit Check
  let customerUsageCount = 0;
  const cleanPhone = normalizePhone(customerPhone);

  if (cleanPhone) {
    customerUsageCount = await CouponUsage.countDocuments({
      couponId: coupon._id,
      customerPhone: cleanPhone,
    });

    if (customerUsageCount >= coupon.perCustomerLimit) {
      throw new CouponValidationError(
        `لقد استنفدت الحد المسموح لك لاستخدام هذا الكوبون (${coupon.perCustomerLimit} ${
          coupon.perCustomerLimit === 1 ? 'مرة واحدة' : 'مرات'
        })`,
        'CUSTOMER_LIMIT_REACHED',
        400
      );
    }
  }

  // 7. Authoritative Discount Calculation
  let actualDiscountAmount = 0;
  if (coupon.discountType === 'percentage') {
    actualDiscountAmount = Math.round((orderTotal * coupon.discountValue) / 100);
    // Apply max discount cap if defined
    if (coupon.maxDiscount && coupon.maxDiscount > 0 && actualDiscountAmount > coupon.maxDiscount) {
      actualDiscountAmount = coupon.maxDiscount;
    }
  } else {
    // Fixed amount discount
    actualDiscountAmount = Math.min(orderTotal, coupon.discountValue);
  }

  // Discount cannot exceed order total
  actualDiscountAmount = Math.min(actualDiscountAmount, orderTotal);
  const finalPrice = Math.max(0, orderTotal - actualDiscountAmount);

  const remainingTotalUsages = Math.max(0, coupon.totalUsageLimit - coupon.currentUsageCount);
  const customerRemainingUsages = Math.max(0, coupon.perCustomerLimit - customerUsageCount);

  return {
    isValid: true,
    coupon,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    actualDiscountAmount,
    originalPrice: orderTotal,
    finalPrice,
    remainingTotalUsages,
    customerUsageCount,
    customerRemainingUsages,
  };
}

/**
 * Race-Condition Safe Atomic Coupon Redemption
 * Atomically reserves usage on the Coupon model and persists the CouponUsage record.
 */
export async function redeemCouponAtomically(params: {
  code: string;
  orderTotal: number;
  customerPhone: string;
  orderId: string;
  customerName?: string;
  customerId?: any;
}): Promise<{
  coupon: ICoupon;
  usage: ICouponUsage;
  discountAmount: number;
  finalPrice: number;
}> {
  const { code, orderTotal, customerPhone, orderId, customerName, customerId } = params;

  const cleanPhone = normalizePhone(customerPhone);
  if (!cleanPhone) {
    throw new CouponValidationError('رقم هاتف العميل مطلوب لتطبيق الكوبون', 'PHONE_REQUIRED', 422);
  }

  // 1. Initial validation
  const validation = await validateCoupon(code, orderTotal, cleanPhone);
  const coupon = validation.coupon;
  const todayStr = new Date().toISOString().split('T')[0];

  // If this code belongs to an Offer rather than standard Coupon model
  if ((coupon as any).isOffer) {
    const cleanOfferCode = code.trim().toUpperCase();
    const offer = await Offer.findOne({ code: cleanOfferCode, isArchived: false });
    if (!offer) {
      throw new CouponValidationError('كود العرض غير متاح', 'OFFER_NOT_FOUND', 404);
    }
    if (offer.usageLimit && (offer.usageCount || 0) >= offer.usageLimit) {
      throw new CouponValidationError(
        `تم استنفاد الحد الأقصى المسموح به لاستخدام هذا العرض (${offer.usageLimit} مستخدم)`,
        'OFFER_USAGE_LIMIT_REACHED',
        400
      );
    }

    const updatedOffer = await Offer.findOneAndUpdate(
      { id: offer.id },
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    return {
      coupon: (updatedOffer || offer) as any,
      usage: {
        id: `usage-${Date.now()}`,
        couponId: offer.id,
        couponCode: offer.code,
        customerPhone: cleanPhone,
        customerName: customerName || 'عميل كلينزو',
        customerId,
        orderId,
        discountType: 'percentage',
        discountValue: offer.discountPercentage,
        actualDiscountAmount: validation.actualDiscountAmount,
        originalPrice: validation.originalPrice,
        finalPrice: validation.finalPrice,
        usedAt: new Date(),
      } as any,
      discountAmount: validation.actualDiscountAmount,
      finalPrice: validation.finalPrice,
    };
  }

  // 2. Atomic Reservation: Prevent concurrent requests from exceeding totalUsageLimit
  const updatedCoupon = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      isArchived: false,
      status: 'active',
      startDate: { $lte: todayStr },
      endDate: { $gte: todayStr },
      $expr: { $lt: ['$currentUsageCount', '$totalUsageLimit'] },
    },
    {
      $inc: { currentUsageCount: 1 },
      $set: { lastUsedAt: new Date() },
    },
    { new: true }
  );

  if (!updatedCoupon) {
    throw new CouponValidationError(
      'عذراً، تم استنفاد هذا الكوبون للتو من قِبل عميل آخر أو انتهت صلاحيته',
      'COUPON_RACE_EXHAUSTED',
      409
    );
  }

  // 3. Double-check customer limit atomically after lock
  const currentCustomerUsage = await CouponUsage.countDocuments({
    couponId: coupon._id,
    customerPhone: cleanPhone,
  });

  if (currentCustomerUsage >= coupon.perCustomerLimit) {
    // Rollback atomic counter increment
    await Coupon.findByIdAndUpdate(coupon._id, { $inc: { currentUsageCount: -1 } });
    throw new CouponValidationError(
      `لقد استنفدت الحد المسموح لك لاستخدام هذا الكوبون (${coupon.perCustomerLimit} مرات)`,
      'CUSTOMER_LIMIT_REACHED',
      400
    );
  }

  // 4. Create Usage Record
  try {
    const usage = await CouponUsage.create({
      couponId: coupon._id,
      couponCode: coupon.code,
      customerPhone: cleanPhone,
      customerId: customerId || undefined,
      customerName: customerName || 'عميل كلينزو',
      orderId,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      actualDiscountAmount: validation.actualDiscountAmount,
      originalPrice: validation.originalPrice,
      finalPrice: validation.finalPrice,
      usedAt: new Date(),
    });

    return {
      coupon: updatedCoupon,
      usage,
      discountAmount: validation.actualDiscountAmount,
      finalPrice: validation.finalPrice,
    };
  } catch (err: any) {
    // Rollback usage counter on failure
    await Coupon.findByIdAndUpdate(coupon._id, { $inc: { currentUsageCount: -1 } });
    throw err;
  }
}

/**
 * Reverts a previously redeemed coupon if an order creation or transaction fails.
 */
export async function rollbackCouponRedemption(couponId: any, orderId: string): Promise<void> {
  try {
    const usage = await CouponUsage.findOneAndDelete({ orderId });
    if (usage) {
      await Coupon.findByIdAndUpdate(couponId, {
        $inc: { currentUsageCount: -1 },
      });
    }
  } catch (err) {
    console.error(`[CouponService] Failed to rollback coupon for order ${orderId}:`, err);
  }
}
