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
import { SystemSettings } from '../src/models/SystemSettings.js';
import {
  calculateBookingPrice,
  calculateMultiServiceBookingPrice,
  calculateAuthoritativeDuration,
} from '../src/services/bookingPriceService.js';
import {
  assertSlotAvailability,
  resolveServiceTiming,
} from '../src/services/availabilityService.js';

let server: http.Server;
let baseUrl: string;

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

export async function runAuthoritativeDurationAndEndTimeSuite() {
  console.log('\n====================================================================');
  console.log('🧪 AUTHORITATIVE DURATION, COMPOSITE SERVICES & END-TIME SUITE');
  console.log('====================================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 0. Seed Categories and Services for testing
    await ServiceCategory.deleteMany({ id: { $in: ['cat-test-duration'] } });
    await ServiceCategory.create({
      id: 'cat-test-duration',
      name: 'العناية الشاملة',
      nameEn: 'Comprehensive Detailing',
      slug: 'car-test-duration',
      type: 'car',
      icon: 'sparkles',
      order: 1,
      active: true,
    });

    await Service.deleteMany({ id: { $in: ['srv-deep-steam-105', 'srv-quick-wash-45', 'srv-interior-60'] } });
    await ServicePackage.deleteMany({ serviceId: { $in: ['srv-deep-steam-105', 'srv-quick-wash-45', 'srv-interior-60'] } });
    await ServiceAddon.deleteMany({ serviceId: { $in: ['srv-deep-steam-105', 'srv-quick-wash-45', 'srv-interior-60'] } });
    await Booking.deleteMany({
      $or: [
        { customerPhone: '01099887766' },
        { serviceId: { $in: ['srv-deep-steam-105', 'srv-quick-wash-45', 'srv-interior-60'] } },
        { date: { $in: ['2026-11-20', '2026-11-21'] } },
      ],
    });

    // Primary Service: Deep Steam Wash
    const srv105 = await Service.create({
      id: 'srv-deep-steam-105',
      title: 'غسيل عميق وتعقيم مقصورة بالبخار',
      titleEn: 'Deep Steam Detailing',
      category: 'car',
      image: 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc',
      price: 500,
      duration: 75,
      serviceDurationMinutes: 75,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 75,
      available: true,
      active: true,
    });

    // Package: 75 minutes
    const pkg75 = await ServicePackage.create({
      id: 'pkg-deep-steam-75',
      serviceId: 'srv-deep-steam-105',
      name: 'باقة الغسيل العميق والبخار الشامل',
      nameEn: 'Full Deep Steam Package',
      price: 650,
      durationMinutes: 75,
      active: true,
    });

    // Add-on: 30 minutes
    const addon30 = await ServiceAddon.create({
      id: 'addon-leather-care-30',
      serviceId: 'srv-deep-steam-105',
      name: 'تغذية وحماية المقاعد الجلدية',
      nameEn: 'Leather Seat Treatment',
      price: 150,
      durationMinutes: 30,
      active: true,
    });

    // Service 2: Quick Wash 45 mins
    const srv45 = await Service.create({
      id: 'srv-quick-wash-45',
      title: 'غسيل خارجي سريع',
      titleEn: 'Quick Exterior Wash',
      category: 'car',
      image: 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc',
      price: 250,
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 45,
      available: true,
      active: true,
    });

    // Service 3: Interior Detailing 60 mins
    const srv60 = await Service.create({
      id: 'srv-interior-60',
      title: 'ديتيلينج داخلي للمقاعد',
      titleEn: 'Interior Seats Detailing',
      category: 'car',
      image: 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc',
      price: 350,
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      available: true,
      active: true,
    });

    // TEST 1: Service with package (75 min) + addon (30 min) = 105 min total
    console.log('\n--- TEST 1: 105-Minute Service Calculation (Package 75 + Addon 30) ---');
    const calc105 = await calculateBookingPrice({
      serviceId: srv105.id,
      packageId: pkg75.id,
      addonIds: [addon30.id],
    });

    assert(calc105.serviceDurationMinutes === 105, `Service work duration should be 105 min, got ${calc105.serviceDurationMinutes}`);
    assert(calc105.totalServiceDuration === 105, `Total occupied duration should be 105 min, got ${calc105.totalServiceDuration}`);
    assert(calc105.packagePrice === 650, `Package price should be 650, got ${calc105.packagePrice}`);
    assert(calc105.addonsTotal === 150, `Addons total should be 150, got ${calc105.addonsTotal}`);
    assert(calc105.finalPrice === 800, `Final price should be 800, got ${calc105.finalPrice}`);

    const authorDur105 = await calculateAuthoritativeDuration({
      serviceId: srv105.id,
      packageId: pkg75.id,
      addonIds: [addon30.id],
    });
    assert(authorDur105.serviceDurationMinutes === 105, `Authoritative duration should be 105, got ${authorDur105.serviceDurationMinutes}`);

    // Check resolveServiceTiming preserves 105 min
    const timing105 = await resolveServiceTiming(srv105.id, 105);
    assert(timing105.serviceDurationMinutes === 105, `resolveServiceTiming must return 105, got ${timing105.serviceDurationMinutes}`);
    assert(timing105.totalOccupiedMinutes === 105, `resolveServiceTiming totalOccupied must be 105, got ${timing105.totalOccupiedMinutes}`);

    // TEST 2: Multi-service composite order (45 min + 60 min = 105 min)
    console.log('\n--- TEST 2: Multi-Service Order Calculation (45 min + 60 min = 105 min) ---');
    const multiCalc = await calculateMultiServiceBookingPrice([
      { serviceId: srv45.id },
      { serviceId: srv60.id },
    ]);
    assert(multiCalc.serviceDurationMinutes === 105, `Composite order work duration should be 105 min (45+60), got ${multiCalc.serviceDurationMinutes}`);
    assert(multiCalc.totalServiceDuration === 105, `Composite total occupied should be 105 min, got ${multiCalc.totalServiceDuration}`);
    assert(multiCalc.items.length === 2, `Should contain 2 itemized services`);

    // TEST 3: Add-on duration addition and zero double-counting
    console.log('\n--- TEST 3: Add-on Duration Integrity (No Double Counting, No Drop) ---');
    const baseWithAddon = await calculateBookingPrice({
      serviceId: srv105.id, // base 75 min
      addonIds: [addon30.id], // addon 30 min
    });
    assert(baseWithAddon.serviceDurationMinutes === 105, `Base 75 + Addon 30 should equal 105 min, got ${baseWithAddon.serviceDurationMinutes}`);

    // TEST 4: End-Time Consistency Across Client, Server, and Admin
    console.log('\n--- TEST 4: End-Time Consistency Across Client, Server, and Admin ---');
    const testDate = '2026-11-20';
    const testStartTime = '12:00';
    const slotTiming105 = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: testStartTime,
      serviceId: srv105.id,
      customDuration: 105,
    });

    assert(slotTiming105.scheduledStart === '12:00', `Start should be 12:00, got ${slotTiming105.scheduledStart}`);
    assert(slotTiming105.scheduledEnd === '13:45', `End time for 105 min starting at 12:00 must be 13:45, got ${slotTiming105.scheduledEnd}`);

    // Ensure valid location exists for booking validation
    let gov = await LocationGovernorate.findOne({ active: true });
    if (!gov || !gov.cities || gov.cities.length === 0) {
      await LocationGovernorate.deleteMany({ id: 'cairo' });
      gov = await LocationGovernorate.create({
        id: 'cairo',
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        cities: [
          {
            id: 'cairo_nasr_city',
            name: 'مدينة نصر',
            nameEn: 'Nasr City',
            active: true,
            areas: [
              { id: 'area_7', name: 'الحي السابع', nameEn: '7th District', active: true },
            ],
          },
        ],
      });
    }

    const activeCity = gov.cities.find((c: any) => c.active !== false) || gov.cities[0];
    const activeArea = activeCity.areas?.find((a: any) => a.active !== false)?.name || 'الحي السابع';

    // Submit booking via API and verify database record
    await Booking.deleteMany({ customerPhone: '01099887766' });
    const createRes = await requestJson(`${baseUrl}/api/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        serviceId: srv105.id,
        packageId: pkg75.id,
        addonIds: [addon30.id],
        category: 'car',
        date: testDate,
        time: `${slotTiming105.scheduledStart} – ${slotTiming105.scheduledEnd}`,
        customerName: 'أحمد علي',
        customerPhone: '01099887766',
        address: {
          governorate: gov.name,
          city: activeCity.name,
          area: activeArea,
          street: 'شارع الطيران',
        },
      }),
    });

    if (createRes.status !== 200 && createRes.status !== 201) {
      console.log('❌ createRes failed:', createRes.data);
    }
    assert(createRes.status === 201 || createRes.status === 200, `Booking creation should succeed, got ${createRes.status}`);
    const createdBooking = createRes.data?.data?.booking || createRes.data?.data;
    assert(createdBooking && createdBooking.id, 'Booking record returned with id');

    // Verify stored fields in DB
    const savedBooking = await Booking.findOne({ id: createdBooking.id });
    assert(savedBooking !== null, 'Booking exists in DB');
    assert(savedBooking.scheduledStart === '12:00', `DB scheduledStart should be 12:00, got ${savedBooking.scheduledStart}`);
    assert(savedBooking.scheduledEnd === '13:45', `DB scheduledEnd should be 13:45, got ${savedBooking.scheduledEnd}`);
    assert(savedBooking.time === '12:00 – 13:45', `DB time should be 12:00 – 13:45, got ${savedBooking.time}`);
    assert(savedBooking.duration === 105, `DB duration should be 105 min, got ${savedBooking.duration}`);
    assert(savedBooking.serviceDurationMinutes === 105, `DB serviceDurationMinutes should be 105 min, got ${savedBooking.serviceDurationMinutes}`);
    assert(savedBooking.totalOccupiedMinutes === 105, `DB totalOccupiedMinutes should be 105 min, got ${savedBooking.totalOccupiedMinutes}`);

    // Verify consistency:
    // Success page reads savedBooking.time or savedBooking.scheduledEnd -> both end at 1:45 PM (13:45)
    // Admin reads savedBooking.scheduledStart & savedBooking.scheduledEnd -> ends at 1:45 PM (13:45)
    // Both are 100% synchronized!

    // TEST 5: Reject Reschedule or Booking with Slot Shorter than Required Duration
    console.log('\n--- TEST 5: Reject Reschedule into Insufficient Slot (45 min slot for 105 min service) ---');
    // Attempt to reschedule 105-minute booking into a 45-minute explicit slot (e.g. 14:00 – 14:45)
    const shortSlotRes = await requestJson(`${baseUrl}/api/bookings/${savedBooking.id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        customerPhone: '01099887766',
        newDate: '2026-11-21',
        newTime: '14:00 – 14:45', // only 45 minutes, while service requires 105 minutes!
        reason: 'محاولة نقل الموعد لفترة غير كافية',
      }),
    });

    assert(
      shortSlotRes.status === 422,
      `Reschedule to a 45-min slot for a 105-min service MUST be rejected with 422, got ${shortSlotRes.status}`
    );
    assert(
      shortSlotRes.data?.code === 'DURATION_INSUFFICIENT',
      `Error code must be DURATION_INSUFFICIENT, got ${shortSlotRes.data?.code}`
    );
    console.log(`  ✓ Reschedule rejected with message: "${shortSlotRes.data?.message}"`);

    // Verify original booking is completely intact and untouched
    const untouchedBooking = await Booking.findOne({ id: savedBooking.id });
    assert(untouchedBooking?.date === testDate, `Original booking date must remain ${testDate}, got ${untouchedBooking?.date}`);
    assert(untouchedBooking?.time === '12:00 – 13:45', `Original booking time must remain 12:00 – 13:45, got ${untouchedBooking?.time}`);

    // Verify that a valid reschedule with sufficient time (e.g. 14:00 – 15:45) succeeds
    const validRescheduleRes = await requestJson(`${baseUrl}/api/bookings/${savedBooking.id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        customerPhone: '01099887766',
        newDate: '2026-11-21',
        newTime: '14:00 – 15:45', // exactly 105 minutes
        reason: 'تعديل لموعد ملائم',
      }),
    });

    assert(validRescheduleRes.status === 200, `Valid reschedule with 105 min slot must succeed, got ${validRescheduleRes.status}`);
    const updatedBooking = await Booking.findOne({ id: savedBooking.id });
    assert(updatedBooking?.date === '2026-11-21', `Updated booking date should be 2026-11-21, got ${updatedBooking?.date}`);
    assert(updatedBooking?.scheduledStart === '14:00', `Updated start should be 14:00, got ${updatedBooking?.scheduledStart}`);
    assert(updatedBooking?.scheduledEnd === '15:45', `Updated end should be 15:45, got ${updatedBooking?.scheduledEnd}`);
    assert(updatedBooking?.time === '14:00 – 15:45', `Updated time label should be 14:00 – 15:45, got ${updatedBooking?.time}`);

    console.log('\n====================================================================');
    console.log('✅ ALL DURATION & END-TIME TESTS PASSED SUCCESSFULLY (5/5)');
    console.log('====================================================================\n');
  } finally {
    if (server) {
      if (typeof (server as any).closeAllConnections === 'function') {
        (server as any).closeAllConnections();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('authoritativeDurationAndEndTimeSuite.ts')) {
  runAuthoritativeDurationAndEndTimeSuite()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
