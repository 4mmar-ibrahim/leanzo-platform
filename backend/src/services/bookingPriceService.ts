import { Service } from '../models/Service.js';
import { ServicePackage } from '../models/ServicePackage.js';
import { ServiceAddon } from '../models/ServiceAddon.js';
import { validateCoupon } from './couponService.js';
import { calculateItemizedPricing } from '../utils/pricingCalculator.js';

export interface PriceCalculationOptions {
  serviceId: string;
  packageId?: string;
  addonIds?: string[];
  promoCode?: string;
  customerPhone?: string;
}

export interface PriceCalculationResult {
  originalPrice: number;
  baseOriginalPrice: number;
  baseSellingPrice: number;
  basePrice: number;
  packagePrice?: number;
  catalogDiscount: number;
  catalogDiscountPercent: number;
  addonsTotal: number;
  subtotal: number;
  discount: number;
  couponDiscount: number;
  totalDiscount: number;
  serviceFee: number;
  finalPrice: number;
  totalServiceDuration: number;
  packageId?: string;
  packageSnapshot?: {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    price: number;
    originalPrice?: number;
    durationMinutes: number;
  };
  addons: Array<{
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    price: number;
    durationMinutes: number;
  }>;
  promoCode?: string;
  couponSnapshot?: {
    couponId: string;
    couponCode: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    actualDiscountAmount: number;
    originalPrice: number;
    finalPrice: number;
  };
}

/**
 * Authoritative Server-Side Price & Duration Calculator
 * Never trusts prices, packages, discounts, or durations sent from the frontend.
 */
export async function calculateBookingPrice(
  input: string | PriceCalculationOptions,
  legacyPromoCode?: string,
  legacyCustomerPhone?: string
): Promise<PriceCalculationResult> {
  let serviceId: string;
  let packageId: string | undefined;
  let addonIds: string[] = [];
  let promoCode: string | undefined;
  let customerPhone: string | undefined;

  if (typeof input === 'object') {
    serviceId = input.serviceId;
    packageId = input.packageId;
    addonIds = Array.isArray(input.addonIds) ? input.addonIds : [];
    promoCode = input.promoCode;
    customerPhone = input.customerPhone;
  } else {
    serviceId = input;
    promoCode = legacyPromoCode;
    customerPhone = legacyCustomerPhone;
  }

  if (!serviceId) {
    throw new Error('معرف الخدمة مطلوب لحساب السعر');
  }

  const service = await Service.findOne({ id: serviceId });
  if (!service) {
    throw new Error('الخدمة المطلوبة غير موجودة');
  }

  let totalServiceDuration = Number(service.serviceDurationMinutes || service.duration) || 45;
  let packageSnapshot: PriceCalculationResult['packageSnapshot'] = undefined;
  let resolvedPackageId: string | undefined = undefined;
  let selectedPackageForCalc: any = null;

  // 1. Authoritative Package Validation
  if (packageId && String(packageId).trim()) {
    const pkg = await ServicePackage.findOne({ id: String(packageId).trim() });
    if (!pkg) {
      throw new Error('الباقة المحددة غير موجودة');
    }
    // Security check: Package must belong to this exact service
    if (pkg.serviceId !== service.id) {
      throw new Error('الباقة المحددة لا تنتمي لهذه الخدمة');
    }
    // Availability check: Package must be active
    if (pkg.active === false) {
      throw new Error('الباقة المحددة غير متاحة حالياً');
    }

    totalServiceDuration = Number(pkg.durationMinutes) || 45;
    resolvedPackageId = pkg.id;
    selectedPackageForCalc = {
      id: pkg.id,
      name: pkg.name,
      price: Number(pkg.price),
      originalPrice: pkg.originalPrice !== undefined && pkg.originalPrice !== null ? Number(pkg.originalPrice) : undefined,
    };
    packageSnapshot = {
      id: pkg.id,
      name: pkg.name,
      nameEn: pkg.nameEn || '',
      description: pkg.description || '',
      descriptionEn: pkg.descriptionEn || '',
      price: Number(pkg.price),
      originalPrice: selectedPackageForCalc.originalPrice,
      durationMinutes: Number(pkg.durationMinutes) || 45,
    };
  }

  // 2. Authoritative Add-ons Validation
  const addonsSnapshot: PriceCalculationResult['addons'] = [];
  const addonsForCalc: Array<{ id: string; name: string; price: number }> = [];

  if (Array.isArray(addonIds) && addonIds.length > 0) {
    // Deduplicate addonIds to prevent malicious or accidental duplicate submission
    const uniqueAddonIds = Array.from(new Set(addonIds.map((id) => String(id).trim()).filter(Boolean)));

    for (const addonId of uniqueAddonIds) {
      const addon = await ServiceAddon.findOne({ id: addonId });
      if (!addon) {
        throw new Error(`الإضافة المطلوبة (${addonId}) غير موجودة`);
      }
      // Security check: Add-on must belong to this exact service
      if (addon.serviceId !== service.id) {
        throw new Error(`الإضافة (${addon.name}) لا تنتمي لهذه الخدمة`);
      }
      // Availability check: Add-on must be active
      if (addon.active === false) {
        throw new Error(`الإضافة (${addon.name}) غير متاحة حالياً`);
      }

      const addonPrice = Number(addon.price) || 0;
      const addonDuration = Number(addon.durationMinutes) || 0;

      totalServiceDuration += addonDuration;

      addonsForCalc.push({
        id: addon.id,
        name: addon.name,
        price: addonPrice,
      });

      addonsSnapshot.push({
        id: addon.id,
        name: addon.name,
        nameEn: addon.nameEn || '',
        description: addon.description || '',
        descriptionEn: addon.descriptionEn || '',
        price: addonPrice,
        durationMinutes: addonDuration,
      });
    }
  }

  // 3. Pre-Coupon Calculation using Single Authoritative Pricing Engine
  const baseCalc = calculateItemizedPricing({
    service: {
      id: service.id,
      price: Number(service.price) || 0,
      originalPrice: service.originalPrice !== undefined && service.originalPrice !== null ? Number(service.originalPrice) : null,
      discount: service.discount !== undefined && service.discount !== null ? Number(service.discount) : null,
    },
    selectedPackage: selectedPackageForCalc,
    addons: addonsForCalc,
    coupon: null,
    serviceFee: 0,
  });

  // 4. Validate and apply authoritative coupon if provided
  let couponSnapshot: PriceCalculationResult['couponSnapshot'] = undefined;
  let appliedCode: string | undefined = undefined;
  let couponInputForCalc: any = null;

  if (promoCode && promoCode.trim()) {
    const couponResult = await validateCoupon(promoCode.trim(), baseCalc.subtotal, customerPhone, serviceId);
    if (couponResult && couponResult.isValid) {
      appliedCode = couponResult.code;
      couponInputForCalc = {
        code: couponResult.code,
        discountType: couponResult.discountType,
        discountValue: couponResult.discountValue,
        maxDiscount: (couponResult.coupon as any)?.maxDiscount,
      };

      const couponDiscount = couponResult.actualDiscountAmount;
      couponSnapshot = {
        couponId: couponResult.coupon._id ? couponResult.coupon._id.toString() : couponResult.coupon.id,
        couponCode: couponResult.code,
        discountType: couponResult.discountType,
        discountValue: couponResult.discountValue,
        discountAmount: couponDiscount,
        actualDiscountAmount: couponDiscount,
        originalPrice: baseCalc.subtotal,
        finalPrice: Math.max(0, baseCalc.subtotal - couponDiscount),
      };
    }
  }

  // 5. Final Authoritative Pricing Calculation
  const finalCalc = calculateItemizedPricing({
    service: {
      id: service.id,
      price: Number(service.price) || 0,
      originalPrice: service.originalPrice !== undefined && service.originalPrice !== null ? Number(service.originalPrice) : null,
      discount: service.discount !== undefined && service.discount !== null ? Number(service.discount) : null,
    },
    selectedPackage: selectedPackageForCalc,
    addons: addonsForCalc,
    coupon: couponInputForCalc,
    serviceFee: 0,
  });

  return {
    originalPrice: finalCalc.originalTotal,
    baseOriginalPrice: finalCalc.baseOriginalPrice,
    baseSellingPrice: finalCalc.baseSellingPrice,
    basePrice: finalCalc.originalTotal, // Invariant: basePrice - totalDiscount = finalPrice
    packagePrice: packageSnapshot ? packageSnapshot.price : finalCalc.baseSellingPrice,
    catalogDiscount: finalCalc.catalogDiscount,
    catalogDiscountPercent: finalCalc.catalogDiscountPercent,
    addonsTotal: finalCalc.addonsTotal,
    subtotal: finalCalc.subtotal,
    discount: finalCalc.totalDiscount,
    couponDiscount: finalCalc.couponDiscount,
    totalDiscount: finalCalc.totalDiscount,
    serviceFee: finalCalc.serviceFee,
    finalPrice: finalCalc.finalPrice,
    totalServiceDuration,
    packageId: resolvedPackageId,
    packageSnapshot,
    addons: addonsSnapshot,
    promoCode: appliedCode,
    couponSnapshot,
  };
}
