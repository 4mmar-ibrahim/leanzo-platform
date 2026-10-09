/**
 * Cleanzo Authoritative Pricing Calculation Engine (Frontend Mirror)
 * 
 * Ensures 100% mathematical parity with backend pricing logic across:
 * - Service Cards & Detail Views
 * - Booking Steps 1, 2, 3, 4
 * - Order Confirmation & Summary
 */

export interface PricingServiceInput {
  id: string;
  price: number;
  originalPrice?: number | null;
  discount?: number | null;
}

export interface PricingPackageInput {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
}

export interface PricingAddonInput {
  id: string;
  name: string;
  price: number;
}

export interface PricingCouponInput {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
}

export interface ItemizedPricingCalculation {
  baseOriginalPrice: number;
  catalogDiscount: number;
  catalogDiscountPercent: number;
  baseSellingPrice: number;
  isPackageSelected: boolean;
  packagePrice?: number;
  packageOriginalPrice?: number;
  addonsTotal: number;
  originalTotal: number;
  subtotal: number;
  couponDiscount: number;
  appliedCouponCode?: string;
  serviceFee: number;
  totalDiscount: number;
  finalPrice: number;
}

/**
 * Calculates authoritative display pricing for an individual service
 * Honors explicit originalPrice / discount when configured by Admin.
 */
export function getServiceDisplayPrice(service: PricingServiceInput): {
  originalPrice: number;
  sellingPrice: number;
  discountAmount: number;
  discountPercent: number;
  hasDiscount: boolean;
} {
  const sellingPrice = Number(service.price) || 0;
  const origPrice =
    service.originalPrice !== undefined && service.originalPrice !== null
      ? Number(service.originalPrice)
      : null;
  const discountPercent =
    service.discount !== undefined && service.discount !== null
      ? Number(service.discount)
      : 0;

  if (origPrice !== null && origPrice > sellingPrice) {
    const diff = origPrice - sellingPrice;
    const computedPercent = Math.round((diff / origPrice) * 100);
    return {
      originalPrice: origPrice,
      sellingPrice,
      discountAmount: diff,
      discountPercent: discountPercent > 0 ? discountPercent : computedPercent,
      hasDiscount: true,
    };
  }

  if (origPrice === null && discountPercent > 0) {
    const discountAmount = Math.round((sellingPrice * discountPercent) / 100);
    const finalSellingPrice = Math.max(0, sellingPrice - discountAmount);
    return {
      originalPrice: sellingPrice,
      sellingPrice: finalSellingPrice,
      discountAmount,
      discountPercent,
      hasDiscount: true,
    };
  }

  return {
    originalPrice: sellingPrice,
    sellingPrice,
    discountAmount: 0,
    discountPercent: 0,
    hasDiscount: false,
  };
}

/**
 * Comprehensive Itemized Price Calculator
 * Single source of truth for full booking price calculations.
 */
export function calculateItemizedPricing(options: {
  service: PricingServiceInput;
  selectedPackage?: PricingPackageInput | null;
  addons?: PricingAddonInput[];
  coupon?: PricingCouponInput | null;
  serviceFee?: number;
}): ItemizedPricingCalculation {
  const { service, selectedPackage, addons = [], coupon, serviceFee = 0 } = options;

  let baseOriginalPrice = 0;
  let baseSellingPrice = 0;
  let catalogDiscount = 0;
  let catalogDiscountPercent = 0;
  const isPackageSelected = Boolean(selectedPackage && Number(selectedPackage.price) >= 0);

  if (selectedPackage) {
    const pkgPrice = Number(selectedPackage.price) || 0;
    const pkgOrigPrice =
      selectedPackage.originalPrice !== undefined && selectedPackage.originalPrice !== null
        ? Number(selectedPackage.originalPrice)
        : null;

    if (pkgOrigPrice !== null && pkgOrigPrice > pkgPrice) {
      baseOriginalPrice = pkgOrigPrice;
      baseSellingPrice = pkgPrice;
      catalogDiscount = pkgOrigPrice - pkgPrice;
      catalogDiscountPercent = Math.round((catalogDiscount / pkgOrigPrice) * 100);
    } else {
      baseOriginalPrice = pkgPrice;
      baseSellingPrice = pkgPrice;
      catalogDiscount = 0;
      catalogDiscountPercent = 0;
    }
  } else {
    const servicePricing = getServiceDisplayPrice(service);
    baseOriginalPrice = servicePricing.originalPrice;
    baseSellingPrice = servicePricing.sellingPrice;
    catalogDiscount = servicePricing.discountAmount;
    catalogDiscountPercent = servicePricing.discountPercent;
  }

  // Add-ons Total
  const addonsTotal = addons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  // Original total before ANY discounts
  const originalTotal = baseOriginalPrice + addonsTotal;

  // Subtotal before coupon
  const subtotal = baseSellingPrice + addonsTotal;

  // Coupon Calculation (applied authoritatively on subtotal)
  let couponDiscount = 0;
  let appliedCouponCode: string | undefined = undefined;

  if (coupon && coupon.code) {
    appliedCouponCode = coupon.code;
    if (coupon.discountType === 'percentage') {
      const rawDiscount = Math.round((subtotal * (coupon.discountValue || 0)) / 100);
      couponDiscount = Math.min(subtotal, rawDiscount);
      if (coupon.maxDiscount && coupon.maxDiscount > 0) {
        couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
      }
    } else if (coupon.discountType === 'fixed') {
      couponDiscount = Math.min(subtotal, Number(coupon.discountValue) || 0);
    }
  }

  const cleanFee = Math.max(0, Number(serviceFee) || 0);
  const totalDiscount = catalogDiscount + couponDiscount;
  const finalPrice = Math.max(0, subtotal - couponDiscount + cleanFee);

  return {
    baseOriginalPrice,
    catalogDiscount,
    catalogDiscountPercent,
    baseSellingPrice,
    isPackageSelected,
    packagePrice: selectedPackage ? Number(selectedPackage.price) : undefined,
    packageOriginalPrice: selectedPackage && selectedPackage.originalPrice ? Number(selectedPackage.originalPrice) : undefined,
    addonsTotal,
    originalTotal,
    subtotal,
    couponDiscount,
    appliedCouponCode,
    serviceFee: cleanFee,
    totalDiscount,
    finalPrice,
  };
}
