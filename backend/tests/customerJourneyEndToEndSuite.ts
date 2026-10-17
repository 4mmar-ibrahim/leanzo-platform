/**
 * customerJourneyEndToEndSuite.ts
 *
 * Comprehensive Automated Customer Journey Test Suite for Cleanzo.net.
 * Tests the entire lifecycle:
 * 1. Catalog & Services Inspection (Price, Duration, Category)
 * 2. Composite Package & Add-on Selection (Cumulative Duration & Price Matching)
 * 3. Availability & Slot Generation for Multi-Component Services
 * 4. Authoritative Coupon Verification & Application
 * 5. End-to-End Booking Creation (Mock Test Data, Zero Live Payments)
 * 6. Public Order Tracking & Verification by Customer Phone
 * 7. Negative Edge Cases (Invalid Phone, Slot Overflow, Duration Insufficient)
 * 8. Safe Cleanup of Test Artifacts
 */

import '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import prisma from '../src/config/prisma.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { Coupon } from '../src/models/Coupon.js';
import { User } from '../src/models/User.js';
import {
  calculateBookingPrice,
  calculateAuthoritativeDuration,
} from '../src/services/bookingPriceService.js';
import { resolveServiceTiming } from '../src/services/availabilityService.js';

let server: http.Server;
let baseUrl: string;
let createdBookingId: string | null = null;
const testCouponCode: string = `CUST_TEST_${Date.now()}`;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function requestJson(url: string, options: any = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

export async function runCustomerJourneySuite() {
  console.log('\n====================================================================');
  console.log('🧪 CLEANZO — COMPREHENSIVE CUSTOMER JOURNEY END-TO-END SUITE');
  console.log('====================================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  function countAssert(condition: boolean, message: string) {
    try {
      assert(condition, message);
      passed++;
    } catch (e) {
      failed++;
      throw e;
    }
  }

  const pkgId = `pkg-test-cust-${Date.now()}`;
  const addonId = `adn-test-cust-${Date.now()}`;

  try {
    // 0. Ensure at least one car and one home service exist in database for testing
    let sampleHome = await Service.findOne({ category: 'home', isArchived: { $ne: true }, available: true });
    let createdHomeService = false;
    if (!sampleHome) {
      sampleHome = await Service.create({
        id: 'home-test-journey-clean',
        category: 'home',
        title: 'التنظيف المنزلي الشامل بالبخار',
        titleEn: 'Comprehensive Home Steam Cleaning',
        price: 450,
        duration: 90,
        serviceDurationMinutes: 90,
        available: true,
        isArchived: false,
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
      });
      createdHomeService = true;
    }

    // ------------------------------------------------------------------
    // STEP 1: CATALOG & SERVICE INSPECTION
    // ------------------------------------------------------------------
    console.log('--- STEP 1: CATALOG & SERVICE DISCOVERY ---');
    const catalogRes = await requestJson(`${baseUrl}/api/services`);
    countAssert(catalogRes.status === 200, 'Catalog endpoint returns 200 OK');

    const rawList = catalogRes.data?.data || catalogRes.data || [];
    countAssert(Array.isArray(rawList) && rawList.length > 0, `Catalog contains active services (${rawList.length} total)`);

    const carServices = rawList.filter((s: any) => s.category === 'car' || s.category === 'car_wash');
    const homeServices = rawList.filter((s: any) => s.category === 'home' || s.category === 'home_service');
    countAssert(carServices.length > 0, `Car services catalog populated (${carServices.length} services)`);
    countAssert(homeServices.length > 0, `Home services catalog populated (${homeServices.length} services)`);

    const testService = carServices[0];
    countAssert(Boolean(testService && testService.id), 'Active test service identified');
    countAssert(typeof testService.price === 'number' && testService.price > 0, `Service price is positive number (${testService.price} EGP)`);
    const serviceDur = Number(testService.serviceDurationMinutes || testService.duration || 30);
    countAssert(serviceDur > 0, `Service duration is positive minutes (${serviceDur} mins)`);

    // ------------------------------------------------------------------
    // STEP 2: COMPOSITE DURATION & PRICING VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- STEP 2: COMPOSITE PACKAGE & ADD-ONS PRICING / DURATION PARITY ---');
    await ServicePackage.create({
      id: pkgId,
      serviceId: testService.id,
      name: 'باقة الغسيل العميق والبخار',
      nameEn: 'Deep Steam Detailing Package',
      price: 650,
      durationMinutes: 75,
      order: 1,
    });

    await ServiceAddon.create({
      id: addonId,
      serviceId: testService.id,
      name: 'تلميع وحماية المحرك بالنانو',
      nameEn: 'Engine Nano Shine & Protect',
      price: 150,
      durationMinutes: 30,
      order: 1,
    });

    const authorDur105 = await calculateAuthoritativeDuration({
      serviceId: testService.id,
      packageId: pkgId,
      addonIds: [addonId],
    });
    countAssert(authorDur105.serviceDurationMinutes === 105, `Package (75m) + Addon (30m) cumulative duration equals 105 min, got ${authorDur105.serviceDurationMinutes}`);

    const timing105 = await resolveServiceTiming(testService.id, 105);
    countAssert(timing105.serviceDurationMinutes === 105, `resolveServiceTiming work duration equals 105 min, got ${timing105.serviceDurationMinutes}`);
    countAssert(timing105.totalOccupiedMinutes === 105, `resolveServiceTiming total occupied equals 105 min, got ${timing105.totalOccupiedMinutes}`);

    const calculatedPricing = await calculateBookingPrice({
      serviceId: testService.id,
      packageId: pkgId,
      addonIds: [addonId],
    });
    countAssert(calculatedPricing.packagePrice === 650, `Package price is 650, got ${calculatedPricing.packagePrice}`);
    countAssert(calculatedPricing.addonsTotal === 150, `Addons total is 150, got ${calculatedPricing.addonsTotal}`);
    countAssert(calculatedPricing.finalPrice === 800, `Final price is 800 (650+150), got ${calculatedPricing.finalPrice}`);

    // ------------------------------------------------------------------
    // STEP 3: AVAILABILITY & REAL INTERVAL SLOTS CHECK
    // ------------------------------------------------------------------
    console.log('\n--- STEP 3: AVAILABILITY & REAL INTERVAL SLOTS CHECK ---');
    const futureDate = '2026-11-25'; // Wednesday
    const availRes = await requestJson(`${baseUrl}/api/availability?date=${futureDate}&serviceId=${testService.id}&duration=105&category=car`);
    countAssert(availRes.status === 200, 'Availability check returns 200 OK');
    const availData = availRes.data?.data || availRes.data;
    countAssert(availData?.isDayAvailable === true || availData?.available === true, `Date ${futureDate} is marked available`);
    countAssert(Array.isArray(availData?.slots) && availData.slots.length > 0, `Slots returned (${availData?.slots?.length} slots)`);

    const firstSlot = availData.slots[0];
    countAssert(firstSlot.start === '09:00', `First slot starts at opening 09:00, got ${firstSlot.start}`);
    countAssert(firstSlot.end === '10:45', `105-min slot end time is 10:45, got ${firstSlot.end}`);
    countAssert(firstSlot.time === '09:00 – 10:45', `Slot label contains exact interval 09:00 – 10:45, got ${firstSlot.time}`);

    // Verify all returned slots end before or at working hours closing (22:00)
    const invalidOverflowSlot = availData.slots.find((s: any) => {
      const [h, m] = (s.end || '').split(':').map(Number);
      return (h * 60 + m) > (22 * 60);
    });
    countAssert(!invalidOverflowSlot, 'Zero slots exceed the 22:00 closing hour');

    // ------------------------------------------------------------------
    // STEP 4: AUTHORITATIVE COUPON APPLICATION & VALIDATION
    // ------------------------------------------------------------------
    console.log('\n--- STEP 4: AUTHORITATIVE COUPON VERIFICATION ---');
    await Coupon.create({
      code: testCouponCode,
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 200,
      maxDiscount: 100,
      totalUsageLimit: 50,
      currentUsageCount: 0,
      status: 'active',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });

    const couponValidRes = await requestJson(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      body: JSON.stringify({
        code: testCouponCode,
        orderTotal: 800,
        customerPhone: '01012345678',
      }),
    });
    countAssert(couponValidRes.status === 200, 'Coupon validation returns 200 OK');
    const couponData = couponValidRes.data?.data || couponValidRes.data?.coupon || couponValidRes.data;
    const discountVal = Number(couponData?.actualDiscountAmount ?? couponData?.discountAmount ?? couponData?.discount ?? 0);
    countAssert(discountVal === 80, `10% discount on 800 is 80 EGP, got ${discountVal}`);

    // Test min-order amount enforcement
    const couponLowRes = await requestJson(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      body: JSON.stringify({
        code: testCouponCode,
        orderTotal: 150, // Below 200 min
        customerPhone: '01012345678',
      }),
    });
    countAssert(couponLowRes.status === 400 || couponLowRes.data?.success === false, 'Coupon below min order amount rejected with 400 Bad Request');

    // ------------------------------------------------------------------
    // STEP 5: FULL BOOKING CREATION (MOCK ENVIRONMENT / ZERO PAYMENTS)
    // ------------------------------------------------------------------
    console.log('\n--- STEP 5: END-TO-END BOOKING CREATION ---');
    // Ensure test customer user exists in database (matching customer account invariant)
    let customerUser = await User.findOne({ phone: '01012345678' });
    let createdCustomerUser = false;
    if (!customerUser) {
      customerUser = await User.create({
        id: `usr-cust-${Date.now()}`,
        name: 'أحمد عبد الله محمود',
        phone: '01012345678',
        password: 'TestPassword123!',
        status: 'active',
        role: 'customer',
      });
      createdCustomerUser = true;
    }
    // Ensure valid location
    let gov = await LocationGovernorate.findOne({ active: true });
    if (!gov || !gov.cities || gov.cities.length === 0) {
      gov = await LocationGovernorate.create({
        id: 'minya-gov',
        name: 'المنيا',
        nameEn: 'Minya',
        active: true,
        cities: [
          {
            id: 'minya-city',
            name: 'المنيا',
            nameEn: 'Minya City',
            active: true,
            areas: [{ id: 'taha-hussein', name: 'شارع طه حسين', active: true }],
          },
        ],
      });
    }
    const targetCity = gov.cities.find((c: any) => c.active !== false) || gov.cities[0];
    const targetArea = targetCity.areas?.[0]?.name || 'شارع طه حسين';

    const bookingPayload = {
      serviceId: testService.id,
      packageId: pkgId,
      addonIds: [addonId],
      category: 'car',
      date: futureDate,
      time: '09:00 – 10:45',
      customerName: 'أحمد عبد الله محمود',
      customerPhone: '01012345678',
      address: {
        governorate: gov.name,
        city: targetCity.name,
        area: targetArea,
        building: '15',
        floor: '2',
        apartment: '4',
      },
      notes: 'سيارة هيونداي النترا كحلي - يرجى استخدام بخار مركز للفرش الداخلي',
      promoCode: testCouponCode,
    };

    const createRes = await requestJson(`${baseUrl}/api/bookings`, {
      method: 'POST',
      body: JSON.stringify(bookingPayload),
    });

    countAssert(createRes.status === 201 || createRes.status === 200, `Booking created successfully with status 201/200, got ${createRes.status}`);
    const createdBooking = createRes.data?.data?.booking || createRes.data?.data || createRes.data;
    countAssert(Boolean(createdBooking && createdBooking.id), `Booking assigned official ID: ${createdBooking?.id}`);
    createdBookingId = createdBooking.id;

    // Verify stored fields in DB
    const savedBooking = await Booking.findOne({ id: createdBookingId });
    countAssert(savedBooking !== null, 'Booking exists in DB');
    countAssert(savedBooking.status === 'pending', `Initial operational status is pending, got ${savedBooking.status}`);
    countAssert(savedBooking.scheduledStart === '09:00', `Scheduled start recorded as 09:00, got ${savedBooking.scheduledStart}`);
    countAssert(savedBooking.scheduledEnd === '10:45', `Scheduled end recorded as 10:45, got ${savedBooking.scheduledEnd}`);
    countAssert(savedBooking.time === '09:00 – 10:45', `Time string is 09:00 – 10:45, got ${savedBooking.time}`);
    countAssert(savedBooking.serviceDurationMinutes === 105, `serviceDurationMinutes is 105, got ${savedBooking.serviceDurationMinutes}`);
    countAssert(savedBooking.totalOccupiedMinutes === 105, `totalOccupiedMinutes is 105, got ${savedBooking.totalOccupiedMinutes}`);

    // Verify discount & financial parity
    // Base 650 + Addon 150 = 800 Subtotal. 10% coupon = 80 discount. Final = 720.
    countAssert(savedBooking.basePrice === 800, `Base price recorded as 800, got ${savedBooking.basePrice}`);
    countAssert(savedBooking.discount === 80, `Coupon discount recorded as 80, got ${savedBooking.discount}`);
    countAssert(savedBooking.finalPrice === 720, `Final price recorded as 720, got ${savedBooking.finalPrice}`);

    // ------------------------------------------------------------------
    // STEP 6: PUBLIC ORDER TRACKING & CUSTOMER VERIFICATION
    // ------------------------------------------------------------------
    console.log('\n--- STEP 6: PUBLIC ORDER TRACKING BY PHONE ---');
    const trackRes = await requestJson(`${baseUrl}/api/bookings/track/${createdBookingId}?phone=01012345678`);
    countAssert(trackRes.status === 200, 'Order tracking returns 200 OK');
    const trackedData = trackRes.data?.data || trackRes.data;
    countAssert(trackedData?.id === createdBookingId, `Tracked order ID matches: ${trackedData?.id}`);
    countAssert(trackedData?.status === 'pending', `Tracked order status is pending, got ${trackedData?.status}`);
    countAssert(trackedData?.scheduledStart === '09:00', `Tracked start is 09:00, got ${trackedData?.scheduledStart}`);
    countAssert(trackedData?.scheduledEnd === '10:45', `Tracked end is 10:45, got ${trackedData?.scheduledEnd}`);
    countAssert(trackedData?.finalPrice === 720, `Tracked final price is 720, got ${trackedData?.finalPrice}`);

    // Security Isolation: Attempt tracking with wrong phone
    const wrongPhoneRes = await requestJson(`${baseUrl}/api/bookings/track/${createdBookingId}?phone=01099999999`);
    countAssert(wrongPhoneRes.status === 404 || wrongPhoneRes.status === 403, `Unauthorized phone tracking is rejected (${wrongPhoneRes.status})`);

    // ------------------------------------------------------------------
    // STEP 7: RESILIENCE & NEGATIVE EDGE CASES
    // ------------------------------------------------------------------
    console.log('\n--- STEP 7: RESILIENCE & NEGATIVE EDGE CASES ---');
    // 7A: Invalid Egyptian Phone Format
    const badPhoneRes = await requestJson(`${baseUrl}/api/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        ...bookingPayload,
        customerPhone: '0123456', // Too short
      }),
    });
    countAssert(badPhoneRes.status === 400, 'Invalid phone number rejected with 400 Bad Request');

    // 7B: Booking slot ending past closing hours
    const overflowSlotRes = await requestJson(`${baseUrl}/api/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        ...bookingPayload,
        date: futureDate,
        time: '21:30 – 23:15', // Exceeds 22:00 closing
      }),
    });
    countAssert(overflowSlotRes.status === 409 || overflowSlotRes.status === 422, `Booking exceeding closing hour rejected (${overflowSlotRes.status})`);

    // 7C: Reschedule into an insufficient 45-min slot for 105-min service
    const insufficientRes = await requestJson(`${baseUrl}/api/bookings/${createdBookingId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        newDate: '2026-11-26',
        newTime: '11:00 – 11:45', // 45 min slot < 105 min required
        customerPhone: '01012345678',
        reason: 'Customer requested earlier time',
      }),
    });
    countAssert(insufficientRes.status === 422, `Reschedule to 45m slot for 105m service rejected with 422, got ${insufficientRes.status}`);
    countAssert(insufficientRes.data?.code === 'DURATION_INSUFFICIENT', `Error code is DURATION_INSUFFICIENT, got ${insufficientRes.data?.code}`);

    // 7D: Valid Reschedule with sufficient 105-min slot
    const validReschedule = await requestJson(`${baseUrl}/api/bookings/${createdBookingId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        newDate: '2026-11-26',
        newTime: '11:00 – 12:45', // 105 min slot
        customerPhone: '01012345678',
        reason: 'Customer requested valid time',
      }),
    });
    countAssert(validReschedule.status === 200, 'Valid reschedule returns 200 OK');
    const rescheduledData = validReschedule.data?.data || validReschedule.data;
    countAssert(rescheduledData?.scheduledStart === '11:00', `Rescheduled start updated to 11:00, got ${rescheduledData?.scheduledStart}`);
    countAssert(rescheduledData?.scheduledEnd === '12:45', `Rescheduled end updated to 12:45, got ${rescheduledData?.scheduledEnd}`);

  } finally {
    // ------------------------------------------------------------------
    // STEP 8: SAFE CLEANUP OF TEST ARTIFACTS
    // ------------------------------------------------------------------
    console.log('\n--- STEP 8: SAFE TEARDOWN & CLEANUP ---');
    if (createdBookingId) {
      await Booking.deleteMany({ id: createdBookingId });
      console.log(`  ✓ Cleaned up test booking: ${createdBookingId}`);
    }
    if (testCouponCode) {
      await Coupon.deleteMany({ code: testCouponCode });
      console.log(`  ✓ Cleaned up test coupon: ${testCouponCode}`);
    }
    await ServicePackage.deleteMany({ id: pkgId });
    await ServiceAddon.deleteMany({ id: addonId });
    await Service.deleteMany({ id: 'home-test-journey-clean' });
    await User.deleteMany({ phone: '01012345678' });

    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }

  console.log('\n====================================================================');
  console.log(`🏁 CUSTOMER JOURNEY SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

// Execute directly if run via CLI
runCustomerJourneySuite().catch((err) => {
  console.error('Fatal test error in customer journey suite:', err);
  process.exit(1);
});
