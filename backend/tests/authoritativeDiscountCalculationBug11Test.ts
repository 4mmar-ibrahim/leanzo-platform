/**
 * Cleanzo — BUG 11 Comprehensive Verification Test Suite
 * Authoritative Discount Calculation & Display Parity
 * 
 * Tests Phases 1 to 9:
 * - Phase 5: Test No Discount (220 EGP -> 220 EGP)
 * - Phase 6: Test 15% Discount:
 *     - If 220 is original price: 220 * 15% = 33 -> 187 EGP
 *     - If 260 is original price & 220 is sale price: 260 - 40 = 220 EGP (NO DOUBLE DISCOUNT)
 * - Phase 7: Test All Discount Types (Fixed, Percentage, Offer, Coupon, Package, Add-ons)
 * - Phase 8: Price Tampering (finalPrice = 1 -> Recalculated authoritatively)
 * - Phase 9: End-to-end consistency across Card, Summary, Confirmation, Saved Order, and Reports
 */

import express from 'express';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Service } from '../src/models/Service.js';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { Coupon } from '../src/models/Coupon.js';
import { Offer } from '../src/models/Offer.js';
import { Booking } from '../src/models/Booking.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { calculateItemizedPricing, getServiceDisplayPrice } from '../src/utils/pricingCalculator.js';
import { calculateBookingPrice } from '../src/services/bookingPriceService.js';
import bookingRoutes from '../src/routes/bookingRoutes.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runBug11TestSuite() {
  console.log('====================================================');
  console.log('🧪 CLEANZO — BUG 11 AUTHORITATIVE DISCOUNT TEST SUITE');
  console.log('====================================================\n');

  await connectDB();

  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingRoutes);

  const server = app.listen(0);
  const port = (server.address() as any).port;
  console.log(`🚀 Test server listening on http://localhost:${port}\n`);

  const now = Date.now();
  const testIds = {
    service220NoDiscount: `srv-b11-nodisc-${now}`,
    service220With15Disc: `srv-b11-15disc-${now}`,
    service260With220Sale: `srv-b11-msrp-${now}`,
    serviceWithAddons: `srv-b11-addons-${now}`,
    package600To450: `pkg-b11-override-${now}`,
    addon1: `add-b11-1-${now}`,
    addon2: `add-b11-2-${now}`,
    couponPercent: `CPN15-${now}`,
    couponFixed: `CPN50-${now}`,
    offer20: `OFFER20-${now}`,
    govId: `gov-b11-${now}`,
  };

  try {
    // Setup Location for booking creation
    await LocationGovernorate.create({
      id: testIds.govId,
      name: 'محافظة تجريبية',
      nameEn: 'Test Governorate',
      active: true,
      cities: [
        {
          id: 'city-b11',
          name: 'مدينة تجريبية',
          nameEn: 'Test City',
          active: true,
        },
      ],
    });

    // =========================================================================
    // PHASE 5: TEST NO DISCOUNT (Service: 220 EGP, 0% discount -> Expected: 220)
    // =========================================================================
    console.log('--- PHASE 5: Test No Discount (Service: 220 EGP) ---');
    await Service.create({
      id: testIds.service220NoDiscount,
      category: 'car',
      title: 'خدمة أساسية بدون خصم',
      titleEn: 'Base 220 Service No Discount',
      price: 220,
      originalPrice: null,
      discount: 0,
      available: true,
      image: 'https://images.unsplash.com/photo-car',
      duration: 45,
    });

    const displayPhase5 = getServiceDisplayPrice({
      id: testIds.service220NoDiscount,
      price: 220,
      originalPrice: null,
      discount: 0,
    });
    assert(displayPhase5.originalPrice === 220, 'Display originalPrice is 220');
    assert(displayPhase5.sellingPrice === 220, 'Display sellingPrice is 220');
    assert(displayPhase5.discountAmount === 0, 'Display discountAmount is 0');
    assert(displayPhase5.hasDiscount === false, 'Display hasDiscount is false');

    const quotePhase5 = await calculateBookingPrice(testIds.service220NoDiscount);
    assert(quotePhase5.basePrice === 220, 'Quote basePrice is 220');
    assert(quotePhase5.catalogDiscount === 0, 'Quote catalogDiscount is 0');
    assert(quotePhase5.totalDiscount === 0, 'Quote totalDiscount is 0');
    assert(quotePhase5.finalPrice === 220, 'Quote finalPrice is 220 (Expected exactly 220 EGP)');

    // =========================================================================
    // PHASE 6: TEST 15% DISCOUNT
    // Sub-case A: 220 is original price, 15% discount -> Expected: 187 EGP
    // Sub-case B: 260 is original price, 220 is sale price -> Expected: 220 EGP
    // =========================================================================
    console.log('\n--- PHASE 6: Test 15% Discount ---');
    console.log('  Sub-case A: 220 is original price + 15% discount configured');
    await Service.create({
      id: testIds.service220With15Disc,
      category: 'car',
      title: 'خدمة 220 بخصم 15%',
      titleEn: 'Service 220 with 15% discount',
      price: 220,
      originalPrice: null,
      discount: 15,
      available: true,
      image: 'https://images.unsplash.com/photo-car',
      duration: 45,
    });

    const display6A = getServiceDisplayPrice({
      id: testIds.service220With15Disc,
      price: 220,
      originalPrice: null,
      discount: 15,
    });
    assert(display6A.originalPrice === 220, 'Original price is 220');
    assert(display6A.discountAmount === 33, '15% of 220 is 33 EGP (220 * 0.15 = 33)');
    assert(display6A.sellingPrice === 187, 'Selling price is 187 EGP (220 - 33 = 187)');

    const quote6A = await calculateBookingPrice(testIds.service220With15Disc);
    assert(quote6A.basePrice === 220, 'Quote basePrice is 220');
    assert(quote6A.catalogDiscount === 33, 'Quote catalogDiscount is 33');
    assert(quote6A.finalPrice === 187, 'Quote finalPrice is 187 EGP');

    console.log('  Sub-case B: 260 is original MSRP + 220 is discounted sale price (NO DOUBLE DISCOUNT)');
    await Service.create({
      id: testIds.service260With220Sale,
      category: 'car',
      title: 'غسيل واش أساسي متطور (260 أصلي -> 220 بيع)',
      titleEn: 'Basic Express Wash (260 Original -> 220 Sale)',
      price: 220,
      originalPrice: 260,
      discount: 15,
      available: true,
      image: 'https://images.unsplash.com/photo-car',
      duration: 45,
    });

    const display6B = getServiceDisplayPrice({
      id: testIds.service260With220Sale,
      price: 220,
      originalPrice: 260,
      discount: 15,
    });
    assert(display6B.originalPrice === 260, 'Card originalPrice is 260');
    assert(display6B.sellingPrice === 220, 'Card sellingPrice is 220 (Already discounted from 260)');
    assert(display6B.discountAmount === 40, 'Direct catalog discount is 40 EGP (260 - 220)');

    const quote6B = await calculateBookingPrice(testIds.service260With220Sale);
    assert(quote6B.basePrice === 260, 'Quote basePrice is 260 (Original pre-discount price)');
    assert(quote6B.catalogDiscount === 40, 'Quote catalogDiscount is 40 (Catalog discount)');
    assert(quote6B.finalPrice === 220, 'Quote finalPrice is 220 (NOT 187! No double discount)');

    // =========================================================================
    // PHASE 7: TEST OTHER DISCOUNTS (Fixed, Percentage, Offer, Coupon, Package, Addons)
    // =========================================================================
    console.log('\n--- PHASE 7: Test All Discount Types ---');

    // 7.1 Percentage Coupon (15% on 220 base service)
    await Coupon.create({
      code: testIds.couponPercent,
      discountType: 'percentage',
      discountValue: 15,
      active: true,
      isArchived: false,
      totalUsageLimit: 100,
      currentUsageCount: 0,
      startDate: '2020-01-01',
      endDate: '2030-12-31',
    });

    const quoteCouponPercent = await calculateBookingPrice({
      serviceId: testIds.service220NoDiscount,
      promoCode: testIds.couponPercent,
    });
    assert(quoteCouponPercent.basePrice === 220, 'Base is 220');
    assert(quoteCouponPercent.couponDiscount === 33, '15% coupon on 220 gives 33 EGP discount');
    assert(quoteCouponPercent.finalPrice === 187, 'Final price after coupon is 187 EGP (220 - 33)');

    // 7.2 Fixed Coupon (50 EGP on 220 base service)
    await Coupon.create({
      code: testIds.couponFixed,
      discountType: 'fixed',
      discountValue: 50,
      active: true,
      isArchived: false,
      totalUsageLimit: 100,
      currentUsageCount: 0,
      startDate: '2020-01-01',
      endDate: '2030-12-31',
    });

    const quoteCouponFixed = await calculateBookingPrice({
      serviceId: testIds.service220NoDiscount,
      promoCode: testIds.couponFixed,
    });
    assert(quoteCouponFixed.couponDiscount === 50, 'Fixed coupon gives 50 EGP discount');
    assert(quoteCouponFixed.finalPrice === 170, 'Final price is 170 EGP (220 - 50)');

    // 7.3 Offer Discount (20% promotional offer on service)
    await Offer.create({
      title: 'عرض ترويجي 20%',
      titleEn: 'Promo Offer 20%',
      code: testIds.offer20,
      discountPercentage: 20,
      active: true,
      isArchived: false,
      expiresAt: '2030-12-31',
      category: 'car',
    });

    const quoteOffer = await calculateBookingPrice({
      serviceId: testIds.service220NoDiscount,
      promoCode: testIds.offer20,
    });
    assert(quoteOffer.couponDiscount === 44, '20% offer on 220 is 44 EGP (220 * 0.20 = 44)');
    assert(quoteOffer.finalPrice === 176, 'Final price with offer is 176 EGP (220 - 44)');

    // 7.4 Package Selection with Pre-Discount MSRP (Original: 600, Sale: 450)
    await ServicePackage.create({
      id: testIds.package600To450,
      serviceId: testIds.service220NoDiscount,
      name: 'باقة ذهبية متكاملة',
      nameEn: 'Gold Package',
      price: 450,
      originalPrice: 600,
      durationMinutes: 90,
      active: true,
      order: 1,
    });

    const quotePackage = await calculateBookingPrice({
      serviceId: testIds.service220NoDiscount,
      packageId: testIds.package600To450,
    });
    assert(quotePackage.baseOriginalPrice === 600, 'Package base original price is 600');
    assert(quotePackage.catalogDiscount === 150, 'Package catalog discount is 150 (600 - 450)');
    assert(quotePackage.finalPrice === 450, 'Package final price is 450 EGP');

    // 7.5 Add-ons Integration with Package
    await ServiceAddon.create([
      {
        id: testIds.addon1,
        serviceId: testIds.service220NoDiscount,
        name: 'تعطير وتطهير داخلي',
        nameEn: 'Odor Removal',
        price: 60,
        durationMinutes: 15,
        active: true,
        order: 1,
      },
      {
        id: testIds.addon2,
        serviceId: testIds.service220NoDiscount,
        name: 'معالجة نانو للزجاج',
        nameEn: 'Glass Nano Coating',
        price: 90,
        durationMinutes: 15,
        active: true,
        order: 2,
      },
    ]);

    const quoteWithAddons = await calculateBookingPrice({
      serviceId: testIds.service220NoDiscount,
      packageId: testIds.package600To450,
      addonIds: [testIds.addon1, testIds.addon2],
    });
    assert(quoteWithAddons.addonsTotal === 150, 'Add-ons total is 150 EGP (60 + 90)');
    assert(quoteWithAddons.subtotal === 600, 'Subtotal is 600 EGP (450 package + 150 addons)');
    assert(quoteWithAddons.finalPrice === 600, 'Final price is 600 EGP');
    assert(quoteWithAddons.totalServiceDuration === 120, 'Duration is 120 min (90 pkg + 15 + 15)');

    // 7.6 Combined: Package (600->450) + Add-ons (150) + Fixed Coupon (50)
    const quoteCombined = await calculateBookingPrice({
      serviceId: testIds.service220NoDiscount,
      packageId: testIds.package600To450,
      addonIds: [testIds.addon1, testIds.addon2],
      promoCode: testIds.couponFixed,
    });
    assert(quoteCombined.subtotal === 600, 'Combined subtotal is 600');
    assert(quoteCombined.couponDiscount === 50, 'Coupon discount is 50');
    assert(quoteCombined.totalDiscount === 200, 'Total discount is 200 (150 catalog + 50 coupon)');
    assert(quoteCombined.finalPrice === 550, 'Final price is 550 EGP (600 - 50)');
    assert(
      quoteCombined.originalPrice - quoteCombined.totalDiscount === quoteCombined.finalPrice,
      'Mathematical invariant holds: originalPrice (750) - totalDiscount (200) === finalPrice (550)'
    );

    // =========================================================================
    // PHASE 8: PRICE TAMPERING RESISTANCE
    // Modify client request with: finalPrice = 1, totalPrice = 1, discount = 9999
    // Backend MUST ignore all client-forged prices and recalculate authoritatively.
    // =========================================================================
    console.log('\n--- PHASE 8: Price Tampering Resistance ---');
    const tamperedPayload = {
      serviceId: testIds.service260With220Sale,
      category: 'car',
      date: '2026-10-15',
      time: '12:00',
      address: {
        governorateId: testIds.govId,
        cityId: 'city-b11',
        area: 'المنطقة الأولى',
        details: 'شارع السلام',
      },
      guestName: 'محمد أحمد',
      guestPhone: '01012345678',
      // Attacker malicious overrides:
      finalPrice: 1,
      totalPrice: 1,
      discount: 9999,
      basePrice: 1,
    };

    const tamperRes = await fetch(`http://localhost:${port}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tamperedPayload),
    });

    const tamperData = await tamperRes.json();
    assert(tamperRes.status === 201, `Tamper request accepted with 201 (Got ${tamperRes.status})`);
    assert(tamperData.data.finalPrice === 220, `Tampered finalPrice=1 was rejected! Saved finalPrice is strictly 220 EGP (Got ${tamperData.data.finalPrice})`);
    assert(tamperData.data.totalPrice === 220, `totalPrice is strictly 220 EGP (Got ${tamperData.data.totalPrice})`);
    assert(tamperData.data.basePrice === 260, `basePrice is strictly 260 EGP (Got ${tamperData.data.basePrice})`);
    assert(tamperData.data.discount === 40, `discount is strictly 40 EGP (Got ${tamperData.data.discount})`);

    // Verify in database directly
    const savedBooking = await Booking.findOne({ id: tamperData.data.id });
    assert(savedBooking !== null, 'Saved booking located in database');
    assert(savedBooking?.finalPrice === 220, 'Database finalPrice is 220 EGP (Tampering defeated)');
    assert(savedBooking?.basePrice === 260, 'Database basePrice is 260 EGP');
    assert(savedBooking?.discount === 40, 'Database discount is 40 EGP');

    // =========================================================================
    // PHASE 9: CONSISTENCY VERIFICATION
    // Ensure 100% mathematical parity across:
    // Service Card display, Pricing engine, Booking Summary, and Saved Order.
    // =========================================================================
    console.log('\n--- PHASE 9: Full End-to-End Consistency Verification ---');
    const catalogItem = {
      id: testIds.service260With220Sale,
      price: 220,
      originalPrice: 260,
      discount: 15,
    };

    const cardPricing = getServiceDisplayPrice(catalogItem);
    const itemizedPricing = calculateItemizedPricing({ service: catalogItem });
    const serverQuote = await calculateBookingPrice(catalogItem.id);

    console.log('Comparing outputs:');
    console.log(`  Card: Original=${cardPricing.originalPrice}, Selling=${cardPricing.sellingPrice}, Discount=${cardPricing.discountAmount}`);
    console.log(`  Engine: BaseOriginal=${itemizedPricing.baseOriginalPrice}, BaseSelling=${itemizedPricing.baseSellingPrice}, Final=${itemizedPricing.finalPrice}`);
    console.log(`  Server: BasePrice=${serverQuote.basePrice}, FinalPrice=${serverQuote.finalPrice}, TotalDiscount=${serverQuote.totalDiscount}`);
    console.log(`  DB Order: BasePrice=${savedBooking?.basePrice}, FinalPrice=${savedBooking?.finalPrice}, Discount=${savedBooking?.discount}`);

    assert(cardPricing.sellingPrice === 220, 'Card selling price === 220');
    assert(itemizedPricing.finalPrice === 220, 'Itemized engine final price === 220');
    assert(serverQuote.finalPrice === 220, 'Server authoritative final price === 220');
    assert(savedBooking?.finalPrice === 220, 'Database saved order final price === 220');

    assert(
      cardPricing.sellingPrice === itemizedPricing.finalPrice &&
      itemizedPricing.finalPrice === serverQuote.finalPrice &&
      serverQuote.finalPrice === savedBooking?.finalPrice,
      'PERFECT PARITY: Card === Engine === Server Quote === Database Order!'
    );

    console.log('\n====================================================');
    console.log('✅ ALL BUG 11 CHECKS PASSED: AUTHORITATIVE & UNIFIED!');
    console.log('====================================================\n');
  } finally {
    console.log('🧹 Cleaning up test records...');
    await Service.deleteMany({
      id: {
        $in: [
          testIds.service220NoDiscount,
          testIds.service220With15Disc,
          testIds.service260With220Sale,
          testIds.serviceWithAddons,
        ],
      },
    });
    await ServicePackage.deleteMany({ id: testIds.package600To450 });
    await ServiceAddon.deleteMany({ id: { $in: [testIds.addon1, testIds.addon2] } });
    await Coupon.deleteMany({ id: { $in: [testIds.couponPercent, testIds.couponFixed] } });
    await Offer.deleteMany({ code: testIds.offer20 });
    await LocationGovernorate.deleteMany({ id: testIds.govId });
    await Booking.deleteMany({ serviceId: testIds.service260With220Sale });

    server.close();
    await disconnectDB();
    console.log('🏁 Test suite complete.');
  }
}

runBug11TestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
