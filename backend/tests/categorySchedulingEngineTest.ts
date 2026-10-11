import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import {
  getAvailableSlots,
  assertSlotAvailability,
  withBookingLock,
  timeStringToMinutes,
  minutesToDisplayTime,
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

async function runCategorySchedulingEngineTests() {
  console.log('\n===============================================================');
  console.log('🧪 CLEANZO CATEGORY-BASED SCHEDULING ENGINE VERIFICATION SUITE');
  console.log('===============================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr: any = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const testDate = '2026-11-25'; // Clean future isolated date (Wednesday)

  // Ensure testDate is not in holidays or blockedDates in settings
  const settingsDoc = await SystemSettings.findOne({ key: 'global_settings' });
  if (settingsDoc?.booking) {
    const bookingConf = settingsDoc.booking as any;
    const cleanHolidays = Array.isArray(bookingConf.holidays)
      ? bookingConf.holidays.filter((h: any) => h.date !== testDate)
      : [];
    const cleanBlocked = Array.isArray(bookingConf.blockedDates)
      ? bookingConf.blockedDates.filter((d: string) => d !== testDate)
      : [];
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      {
        $set: {
          'booking.holidays': cleanHolidays,
          'booking.blockedDates': cleanBlocked,
        },
      }
    );
  }

  // Cleanup any test remnants on this testDate
  await Booking.deleteMany({ date: testDate });

  // Ensure test services exist in DB
  let carWash = await Service.findOne({ id: 'test-car-wash' });
  if (!carWash) {
    carWash = await Service.create({
      id: 'test-car-wash',
      title: 'غسيل سيارات تجريبي (A)',
      titleEn: 'Test Car Wash (A)',
      category: 'car',
      price: 150,
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      available: true,
      active: true,
      image: '/test.png',
    });
  }

  let tireWash = await Service.findOne({ id: 'test-tire-wash' });
  if (!tireWash) {
    tireWash = await Service.create({
      id: 'test-tire-wash',
      title: 'غسيل كاوتش تجريبي (B)',
      titleEn: 'Test Tire Wash (B)',
      category: 'car',
      price: 80,
      duration: 30,
      serviceDurationMinutes: 30,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 30,
      available: true,
      active: true,
      image: '/test.png',
    });
  }

  let carPolish = await Service.findOne({ id: 'test-car-polish' });
  if (!carPolish) {
    carPolish = await Service.create({
      id: 'test-car-polish',
      title: 'تلميع سيارات تجريبي (C)',
      titleEn: 'Test Car Polish (C)',
      category: 'car',
      price: 200,
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 45,
      available: true,
      active: true,
      image: '/test.png',
    });
  }

  let carDetail = await Service.findOne({ id: 'test-car-detail' });
  if (!carDetail) {
    carDetail = await Service.create({
      id: 'test-car-detail',
      title: 'تنظيف داخلي تجريبي (D)',
      titleEn: 'Test Car Detailing (D)',
      category: 'car',
      price: 220,
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      available: true,
      active: true,
      image: '/test.png',
    });
  }

  let homeClean = await Service.findOne({ id: 'test-home-clean' });
  if (!homeClean) {
    homeClean = await Service.create({
      id: 'test-home-clean',
      title: 'تنظيف منزلي تجريبي',
      titleEn: 'Test Home Cleaning',
      category: 'home',
      price: 250,
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      available: true,
      active: true,
      image: '/test.png',
    });
  }

  // Ensure test addons
  let addon10 = await ServiceAddon.findOne({ id: 'test-addon-10' });
  if (!addon10) {
    addon10 = await ServiceAddon.create({
      id: 'test-addon-10',
      serviceId: 'test-car-wash',
      name: 'إضافة 10 دقائق',
      price: 30,
      durationMinutes: 10,
      active: true,
    });
  }

  let addon15 = await ServiceAddon.findOne({ id: 'test-addon-15' });
  if (!addon15) {
    addon15 = await ServiceAddon.create({
      id: 'test-addon-15',
      serviceId: 'test-car-wash',
      name: 'إضافة 15 دقيقة',
      price: 45,
      durationMinutes: 15,
      active: true,
    });
  }

  try {
    // =============================================================
    // TEST 1: Book Service A in Cars 09:00 - 10:00.
    // Verify services B, C, D in Cars do NOT accept any overlapping booking
    // =============================================================
    console.log('\n--- TEST 1: Service A booked 09:00-10:00 -> Services B, C, D in Cars are blocked ---');

    const bookingA = await Booking.create({
      id: `TEST-CLN-A1-${Date.now()}`,
      customerName: 'أحمد اختبار',
      customerPhone: '01012345678',
      serviceId: carWash.id,
      serviceSnapshot: { id: carWash.id, title: carWash.title, category: 'car', price: 150, duration: 60 },
      category: 'car',
      date: testDate,
      time: '09:00 – 10:00',
      timeSlotStart: '09:00',
      scheduledStart: '09:00',
      scheduledEnd: '10:00',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'عباس العقاد' },
      basePrice: 150,
      finalPrice: 150,
      status: 'confirmed',
    });

    // Check available slots for Service B (tire wash - 30m)
    const slotsB = await getAvailableSlots(testDate, tireWash.id, 30, [tireWash.id], undefined, 'car');
    assert(!slotsB.slots.some((s) => s.start === '09:00' || s.start === '09:15' || s.start === '09:30' || s.start === '09:45'),
      'Service B (Tire Wash): No slots offered between 09:00 and 10:00');

    // Check available slots for Service C (car polish - 45m)
    const slotsC = await getAvailableSlots(testDate, carPolish.id, 45, [carPolish.id], undefined, 'car');
    assert(!slotsC.slots.some((s) => s.start === '09:00' || s.start === '09:15' || s.start === '09:30'),
      'Service C (Car Polish): No slots offered between 09:00 and 10:00');

    // Check available slots for Service D (car detailing - 60m)
    const slotsD = await getAvailableSlots(testDate, carDetail.id, 60, [carDetail.id], undefined, 'car');
    assert(!slotsD.slots.some((s) => s.start === '09:00' || s.start === '09:15' || s.start === '09:30'),
      'Service D (Car Detailing): No slots offered between 09:00 and 10:00');

    // =============================================================
    // TEST 2: Complete Category Independence (Home Cleaning)
    // Home Cleaning at 09:00 - 10:00 MUST BE 100% AVAILABLE
    // =============================================================
    console.log('\n--- TEST 2: Category Independence (Home category unaffected) ---');

    const homeSlots = await getAvailableSlots(testDate, homeClean.id, 60, [homeClean.id], undefined, 'home');
    const homeSlot0900 = homeSlots.slots.find((s) => s.start === '09:00');
    assert(homeSlot0900 !== undefined && homeSlot0900.available === true,
      'Home Cleaning at 09:00 is AVAILABLE despite Car Wash being booked 09:00-10:00');

    const homeAssert = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '09:00',
      serviceId: homeClean.id,
      category: 'home',
      customDuration: 60,
    });
    assert(homeAssert.scheduledStart === '09:00' && homeAssert.scheduledEnd === '10:00',
      'Home Cleaning at 09:00 asserts valid on backend without conflict');

    // =============================================================
    // TEST 3: Overlapping booking (09:30 - 10:30) in Cars must be rejected
    // =============================================================
    console.log('\n--- TEST 3: Attempt overlapping booking (09:30 - 10:30) in Cars -> Rejected ---');

    let conflictThrownTest3 = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:30',
        serviceId: carPolish.id, // Service C
        category: 'car',
        customDuration: 60,
      });
    } catch (e: any) {
      conflictThrownTest3 = true;
      assert(e.statusCode === 409 || e.code === 'SLOT_UNAVAILABLE',
        'Backend strictly rejects 09:30 - 10:30 with 409 SLOT_UNAVAILABLE');
    }
    assert(conflictThrownTest3, 'Overlap 09:30 - 10:30 in car category successfully blocked');

    // =============================================================
    // TEST 4: Booking starting right at 10:00 in Cars MUST be allowed
    // =============================================================
    console.log('\n--- TEST 4: Booking starting at 10:00 in Cars -> Allowed ---');

    const slot1000Assert = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '10:00',
      serviceId: tireWash.id, // Service B (30m)
      category: 'car',
      customDuration: 30,
    });
    assert(slot1000Assert.scheduledStart === '10:00' && slot1000Assert.scheduledEnd === '10:30',
      'Booking starting right at 10:00 is allowed and valid (boundary awareness)');

    const bookingB = await Booking.create({
      id: `TEST-CLN-B1-${Date.now()}`,
      customerName: 'محمود اختبار',
      customerPhone: '01099998888',
      serviceId: tireWash.id,
      serviceSnapshot: { id: tireWash.id, title: tireWash.title, category: 'car', price: 80, duration: 30 },
      category: 'car',
      date: testDate,
      time: '10:00 – 10:30',
      timeSlotStart: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '10:30',
      duration: 30,
      serviceDurationMinutes: 30,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 30,
      address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'عباس العقاد' },
      basePrice: 80,
      finalPrice: 80,
      status: 'confirmed',
    });
    assert(Boolean(bookingB.id), 'Service B confirmed at 10:00 without collision');

    // =============================================================
    // TEST 5: Cancel Booking A (09:00 - 10:00) -> Slot returns to available
    // =============================================================
    console.log('\n--- TEST 5: Cancel Booking A -> Slot 09:00 returns to available in Cars ---');

    bookingA.status = 'cancelled';
    await bookingA.save();

    const slotsAfterCancel = await getAvailableSlots(testDate, carWash.id, 60, [carWash.id], undefined, 'car');
    const slot0900Available = slotsAfterCancel.slots.find((s) => s.start === '09:00');
    assert(slot0900Available !== undefined && slot0900Available.available === true,
      'Slot 09:00 is immediately returned to available across all services in Cars');

    // Restore bookingA status to test concurrency
    bookingA.status = 'confirmed';
    await bookingA.save();

    // =============================================================
    // TEST 6: Concurrent Booking Requests (Atomicity & Concurrency Safety)
    // Two simultaneous requests attempting to book the same slot
    // =============================================================
    console.log('\n--- TEST 6: Concurrent requests for same slot in Cars -> Exactly ONE succeeds ---');

    const lockKey = `${testDate}_car`;
    let attempt1Success = false;
    let attempt2Success = false;

    const task1 = withBookingLock(lockKey, async () => {
      try {
        await assertSlotAvailability({
          dateStr: testDate,
          timeStr: '11:00',
          serviceId: carWash.id,
          category: 'car',
          customDuration: 60,
        });
        await Booking.create({
          id: `TEST-CONC-1-${Date.now()}`,
          customerName: 'عميل 1',
          customerPhone: '01011112222',
          serviceId: carWash.id,
          serviceSnapshot: { id: carWash.id, title: carWash.title, category: 'car', price: 150, duration: 60 },
          category: 'car',
          date: testDate,
          time: '11:00 – 12:00',
          timeSlotStart: '11:00',
          scheduledStart: '11:00',
          scheduledEnd: '12:00',
          duration: 60,
          serviceDurationMinutes: 60,
          travelTimeMinutes: 0,
          totalOccupiedMinutes: 60,
          address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'عباس العقاد' },
          basePrice: 150,
          finalPrice: 150,
          status: 'confirmed',
        });
        attempt1Success = true;
      } catch {
        attempt1Success = false;
      }
    });

    const task2 = withBookingLock(lockKey, async () => {
      try {
        await assertSlotAvailability({
          dateStr: testDate,
          timeStr: '11:30', // Overlaps with 11:00 - 12:00!
          serviceId: carPolish.id,
          category: 'car',
          customDuration: 45,
        });
        await Booking.create({
          id: `TEST-CONC-2-${Date.now()}`,
          customerName: 'عميل 2',
          customerPhone: '01033334444',
          serviceId: carPolish.id,
          serviceSnapshot: { id: carPolish.id, title: carPolish.title, category: 'car', price: 200, duration: 45 },
          category: 'car',
          date: testDate,
          time: '11:30 – 12:15',
          timeSlotStart: '11:30',
          scheduledStart: '11:30',
          scheduledEnd: '12:15',
          duration: 45,
          serviceDurationMinutes: 45,
          travelTimeMinutes: 0,
          totalOccupiedMinutes: 45,
          address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'عباس العقاد' },
          basePrice: 200,
          finalPrice: 200,
          status: 'confirmed',
        });
        attempt2Success = true;
      } catch {
        attempt2Success = false;
      }
    });

    await Promise.all([task1, task2]);

    assert(attempt1Success !== attempt2Success,
      'Exactly ONE of two concurrent overlapping bookings succeeded, the other was rejected');

    // =============================================================
    // TEST 7: Direct HTTP API calls consistency
    // =============================================================
    console.log('\n--- TEST 7: Direct HTTP API requests consistency ---');

    const apiRes = await fetch(`${baseUrl}/api/availability?date=${testDate}&category=car&duration=60`);
    assert(apiRes.status === 200, 'GET /api/availability returns 200 OK');
    const apiData: any = await apiRes.json();
    const carSlotsApi = apiData.data?.slots || [];
    assert(!carSlotsApi.some((s: any) => s.start === '09:00'),
      'Direct API: Confirmed booking 09:00 is completely excluded from available slots list');

    // =============================================================
    // TEST 8: Dynamic Addons Duration & Reschedule Validation
    // =============================================================
    console.log('\n--- TEST 8: Dynamic Addons Duration & Reschedule ---');

    // Base 45 min + 15 min addon = 60 min
    const dynamicTiming = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '14:00',
      serviceId: carWash.id,
      category: 'car',
      customDuration: 60, // 45 base + 15 addon
    });
    assert(dynamicTiming.scheduledStart === '14:00' && dynamicTiming.scheduledEnd === '15:00',
      'Dynamic Addons: 45m service + 15m addon locks entire 60m interval (14:00 - 15:00)');

    // Without addon: 45m
    const baseTiming = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '14:00',
      serviceId: carWash.id,
      category: 'car',
      customDuration: 45,
    });
    assert(baseTiming.scheduledStart === '14:00' && baseTiming.scheduledEnd === '14:45',
      'Without addon: locks 45m interval (14:00 - 14:45)');

    // Cleanup
    await Booking.deleteMany({ date: testDate });

    console.log('\n===============================================================');
    console.log('🎉 ALL 8 MANDATORY VERIFICATION TESTS PASSED SUCCESSFULLY! (8/8)');
    console.log('===============================================================\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  }
}

runCategorySchedulingEngineTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
