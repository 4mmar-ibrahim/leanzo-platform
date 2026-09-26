import { Service } from '../models/Service.js';
import { ServicePackage } from '../models/ServicePackage.js';
import { ServiceAddon } from '../models/ServiceAddon.js';
import { validateCoupon } from './couponService.js';

export interface PriceCalculationOptions {
  serviceId: string;
  packageId?: string;
  addonIds?: string[];
  promoCode?: string;
  customerPhone?: string;
}

export interface PriceCalculationResult {
  basePrice: number;
  packagePrice?: number;
  addonsTotal: number;
  subtotal: number;
  discount: number;
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

  let basePrice = Number(service.price) || 0;
  let totalServiceDuration = Number(service.serviceDurationMinutes || service.duration) || 45;
  let packageSnapshot: PriceCalculationResult['packageSnapshot'] = undefined;
  let resolvedPackageId: string | undefined = undefined;

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

    basePrice = Number(pkg.price);
    totalServiceDuration = Number(pkg.durationMinutes) || 45;
    resolvedPackageId = pkg.id;
    packageSnapshot = {
      id: pkg.id,
      name: pkg.name,
      nameEn: pkg.nameEn || '',
      description: pkg.description || '',
      descriptionEn: pkg.descriptionEn || '',
      price: Number(pkg.price),
      originalPrice: pkg.originalPrice !== undefined && pkg.originalPrice !== null ? Number(pkg.originalPrice) : undefined,
      durationMinutes: Number(pkg.durationMinutes) || 45,
    };
  }

  // 2. Authoritative Add-ons Validation
  const addonsSnapshot: PriceCalculationResult['addons'] = [];
  let addonsTotal = 0;

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

      addonsTotal += addonPrice;
      totalServiceDuration += addonDuration;

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

  const subtotal = basePrice + addonsTotal;
  let discountAmount = 0;
  let couponSnapshot: PriceCalculationResult['couponSnapshot'] = undefined;
  let appliedCode: string | undefined = undefined;

  // 3. Apply service direct catalog discount if no package selected and service has discount
  if (!packageSnapshot && service.discount && service.discount > 0) {
    discountAmount = Math.round((basePrice * service.discount) / 100);
  }

  // 4. Validate and apply authoritative coupon if provided
  if (promoCode && promoCode.trim()) {
    const couponResult = await validateCoupon(promoCode.trim(), subtotal, customerPhone, serviceId);
    if (couponResult && couponResult.isValid) {
      const couponDiscount = couponResult.actualDiscountAmount;
      discountAmount = Math.max(discountAmount, couponDiscount);
      appliedCode = couponResult.code;

      couponSnapshot = {
        couponId: couponResult.coupon._id ? couponResult.coupon._id.toString() : couponResult.coupon.id,
        couponCode: couponResult.code,
        discountType: couponResult.discountType,
        discountValue: couponResult.discountValue,
        discountAmount: couponDiscount,
        actualDiscountAmount: couponDiscount,
        originalPrice: subtotal,
        finalPrice: Math.max(0, subtotal - couponDiscount),
      };
    }
  }

  const serviceFee = 0; // Configurable fee
  const finalPrice = Math.max(0, subtotal - discountAmount + serviceFee);

  return {
    basePrice,
    packagePrice: packageSnapshot ? packageSnapshot.price : basePrice,
    addonsTotal,
    subtotal,
    discount: discountAmount,
    serviceFee,
    finalPrice,
    totalServiceDuration,
    packageId: resolvedPackageId,
    packageSnapshot,
    addons: addonsSnapshot,
    promoCode: appliedCode,
    couponSnapshot,
  };
}
