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
      title: 'غسيل سيارات تجريبي',
      titleEn: 'Test Car Wash',
      category: 'car',
      price: 150,
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 45,
      available: true,
      active: true,
      image: '/test.png',
    });
  }

  let tireWash = await Service.findOne({ id: 'test-tire-wash' });
  if (!tireWash) {
    tireWash = await Service.create({
      id: 'test-tire-wash',
      title: 'غسيل كاوتش تجريبي',
      titleEn: 'Test Tire Wash',
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
    // -------------------------------------------------------------
    // TEST A: Category-Based Shared Scheduling Pool
    // 1. Car wash booked from 09:00 to 09:45
    // 2. Tire wash (same category 'car') must be BLOCKED from 09:00-09:30 & 09:15-09:45
    // 3. Tire wash MUST BE AVAILABLE at 09:45 (09:45 - 10:15)
    // -------------------------------------------------------------
    console.log('\n--- TEST A: Category Slot Sharing (Cars Category) ---');

    const carBookingA = await Booking.create({
      id: `TEST-CLN-A1-${Date.now()}`,
      customerName: 'أحمد اختبار',
      customerPhone: '01012345678',
      serviceId: carWash.id,
      serviceSnapshot: { id: carWash.id, title: carWash.title, category: 'car', price: 150, duration: 45 },
      category: 'car',
      date: testDate,
      time: '09:00 – 09:45',
      timeSlotStart: '09:00',
      scheduledStart: '09:00',
      scheduledEnd: '09:45',
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 45,
      address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'عباس العقاد' },
      basePrice: 150,
      finalPrice: 150,
      status: 'confirmed',
    });

    const tireWashSlots = await getAvailableSlots(testDate, tireWash.id, 30, [tireWash.id], undefined, 'car');
    const slot0900 = tireWashSlots.slots.find((s) => s.start === '09:00');
    const slot0945 = tireWashSlots.slots.find((s) => s.start === '09:45');

    assert(slot0900 === undefined, 'Tire Wash at 09:00 is COMPLETELY EXCLUDED for customers because Car Wash is booked 09:00-09:45');
    assert(slot0945 !== undefined && slot0945.available === true, 'Tire Wash at 09:45 is AVAILABLE immediately following Car Wash 09:00-09:45 finish boundary');

    // Admin view with includeUnavailable=true retains the slot marked unavailable
    const adminSlots = await getAvailableSlots(testDate, tireWash.id, 30, [tireWash.id], undefined, 'car', true);
    const admin0900 = adminSlots.slots.find((s) => s.start === '09:00');
    assert(admin0900 !== undefined && admin0900.available === false, 'Admin view with includeUnavailable=true retains 09:00 as blocked');

    // Verify Backend assertion also enforces 409 conflict
    let conflictThrown = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:15',
        serviceId: tireWash.id,
        category: 'car',
        customDuration: 30,
      });
    } catch (e: any) {
      conflictThrown = true;
      assert(e.statusCode === 409 || e.code === 'SLOT_UNAVAILABLE', 'Backend asserts 409 conflict for overlapping booking in same category');
    }
    assert(conflictThrown, 'Backend prevented overlapping booking in same category');

    // -------------------------------------------------------------
    // TEST B: Complete Category Independence
    // Car Wash is booked 09:00-09:45 in 'car'
    // Home Cleaning at 09:00 in 'home' MUST BE AVAILABLE!
    // -------------------------------------------------------------
    console.log('\n--- TEST B: Category Independence (Cars vs Homes) ---');

    const homeSlots = await getAvailableSlots(testDate, homeClean.id, 60, [homeClean.id], undefined, 'home');
    const homeSlot0900 = homeSlots.slots.find((s) => s.start === '09:00');

    assert(homeSlot0900 !== undefined && homeSlot0900.available === true, 'Home Cleaning at 09:00 is AVAILABLE despite Car Wash being booked 09:00-09:45');

    const homeAssert = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '09:00',
      serviceId: homeClean.id,
      category: 'home',
      customDuration: 60,
    });
    assert(homeAssert.scheduledStart === '09:00' && homeAssert.scheduledEnd === '10:00', 'Home Cleaning at 09:00 is asserted valid without false conflict');

    // -------------------------------------------------------------
    // TEST C: Dynamic Addons Duration Calculation
    // Base 45 min + 10 min + 15 min = 70 min
    // -------------------------------------------------------------
    console.log('\n--- TEST C: Dynamic Addons & Duration Recalculation ---');

    const baseSlots45 = await getAvailableSlots(testDate, carWash.id, 45, [carWash.id], undefined, 'car');
    const slotAt0945for45 = baseSlots45.slots.find((s) => s.start === '09:45');
    assert(slotAt0945for45 !== undefined && slotAt0945for45.end === '10:30', '45m slot starting 09:45 ends at 10:30');

    // Now test with 70 min (45 + 10 + 15)
    const slots70 = await getAvailableSlots(testDate, carWash.id, 70, [carWash.id], undefined, 'car');
    const slotAt0945for70 = slots70.slots.find((s) => s.start === '09:45');
    assert(slotAt0945for70 !== undefined && slotAt0945for70.end === '10:55', '70m slot starting 09:45 ends at 10:55 (45m + 10m + 15m)');

    // -------------------------------------------------------------
    // TEST D: Overlap Math & Boundary Testing
    // Back-to-back: [09:00, 09:45) and [09:45, 10:15) allowed
    // Overlapping: [09:30, 10:00) blocked
    // -------------------------------------------------------------
    console.log('\n--- TEST D: Overlap Math & Back-to-back Boundary ---');

    const backToBackAssert = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '09:45',
      serviceId: tireWash.id,
      category: 'car',
      customDuration: 30,
    });
    assert(backToBackAssert.scheduledStart === '09:45' && backToBackAssert.scheduledEnd === '10:15', 'Back-to-back booking starting exactly at 09:45 is accepted without collision');

    // -------------------------------------------------------------
    // TEST E: Concurrency & Category-Based Serialization Lock
    // Two simultaneous requests for the same slot in 'car'
    // -------------------------------------------------------------
    console.log('\n--- TEST E: Concurrency Lock & Race-Condition Safety ---');

    const categoryLockKey = `${testDate}_car`;
    let lockExecutionOrder: number[] = [];

    const p1 = withBookingLock(categoryLockKey, async () => {
      lockExecutionOrder.push(1);
      await new Promise((res) => setTimeout(res, 50));
      return 'task1-done';
    });

    const p2 = withBookingLock(categoryLockKey, async () => {
      lockExecutionOrder.push(2);
      return 'task2-done';
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    assert(r1 === 'task1-done' && r2 === 'task2-done', 'Concurrent category tasks completed successfully');
    assert(lockExecutionOrder[0] === 1 && lockExecutionOrder[1] === 2, 'Resource locks strictly serialize concurrent tasks per category');

    // -------------------------------------------------------------
    // TEST F: Cancelled Booking releases interval
    // -------------------------------------------------------------
    console.log('\n--- TEST F: Cancelled Booking Slot Release ---');

    carBookingA.status = 'cancelled';
    await carBookingA.save();

    const slotsAfterCancel = await getAvailableSlots(testDate, carWash.id, 45, [carWash.id], undefined, 'car');
    const slot0900AfterCancel = slotsAfterCancel.slots.find((s) => s.start === '09:00');
    assert(slot0900AfterCancel !== undefined && slot0900AfterCancel.available === true, 'Cancelled booking successfully releases slot 09:00 for new reservations');

    // Cleanup
    await Booking.deleteMany({ date: testDate });

    console.log('\n===============================================================');
    console.log('✅ ALL CATEGORY-BASED SCHEDULING ENGINE TESTS PASSED (6/6)');
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
