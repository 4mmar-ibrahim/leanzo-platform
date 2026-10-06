/**
 * Cleanzo Authoritative Pricing Calculation Engine
 * 
 * Defines the single, canonical pricing business logic across:
 * - Backend (order creation, price quote API, reports)
 * - Frontend (service cards, details, booking steps, confirmation, order details)
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
  // Pre-discount original price of service/package
  baseOriginalPrice: number;
  // Catalog direct discount amount
  catalogDiscount: number;
  // Catalog direct discount percentage
  catalogDiscountPercent: number;
  // Selling price of service/package before add-ons
  baseSellingPrice: number;

  // Package info if package selected
  isPackageSelected: boolean;
  packagePrice?: number;
  packageOriginalPrice?: number;

  // Add-ons total
  addonsTotal: number;

  // Combined pre-discount original total (baseOriginalPrice + addonsTotal)
  originalTotal: number;

  // Subtotal before coupons (baseSellingPrice + addonsTotal)
  subtotal: number;

  // Coupon / Offer deduction
  couponDiscount: number;
  appliedCouponCode?: string;

  // Travel / Service fee
  serviceFee: number;

  // Total discount across catalog + coupon
  totalDiscount: number;

  // Authoritative payable amount
  finalPrice: number;
}

/**
 * Calculates authoritative display pricing for an individual service
 * Ensures Service Cards and Service Details display the exact same selling price as checkout.
 */
export function getServiceDisplayPrice(service: PricingServiceInput): {
  originalPrice: number;
  sellingPrice: number;
  discountAmount: number;
  discountPercent: number;
  hasDiscount: boolean;
} {
  const configuredPrice = Number(service.price) || 0;
  const configuredOrigPrice =
    service.originalPrice !== undefined && service.originalPrice !== null
      ? Number(service.originalPrice)
      : null;
  const configuredDiscount = Number(service.discount) || 0;

  // Case 1: Service has explicit originalPrice > price (e.g. originalPrice = 260, price = 220)
  // Here, `price` is ALREADY the discounted selling price.
  if (configuredOrigPrice !== null && configuredOrigPrice > configuredPrice) {
    const discountAmount = Math.max(0, configuredOrigPrice - configuredPrice);
    const discountPercent =
      configuredDiscount > 0
        ? configuredDiscount
        : Math.round((discountAmount / configuredOrigPrice) * 100);
    return {
      originalPrice: configuredOrigPrice,
      sellingPrice: configuredPrice,
      discountAmount,
      discountPercent,
      hasDiscount: discountAmount > 0,
    };
  }

  // Case 2: Service has direct discount % configured on price (e.g. price = 220, discount = 15%, originalPrice is null or <= price)
  // Here, `price` is the pre-discount base price, and 15% discount (33 EGP) yields selling price 187 EGP.
  if (configuredDiscount > 0) {
    const discountAmount = Math.round((configuredPrice * configuredDiscount) / 100);
    const sellingPrice = Math.max(0, configuredPrice - discountAmount);
    return {
      originalPrice: configuredPrice,
      sellingPrice,
      discountAmount,
      discountPercent: configuredDiscount,
      hasDiscount: discountAmount > 0,
    };
  }

  // Case 3: No discount
  return {
    originalPrice: configuredPrice,
    sellingPrice: configuredPrice,
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
