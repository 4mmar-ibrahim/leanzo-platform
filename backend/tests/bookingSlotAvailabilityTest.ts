import assert from 'assert';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import { getAvailableSlots, assertSlotAvailability } from '../src/services/availabilityService.js';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    process.stdout.write(`▶ [RUNNING] ${name} ... `);
    await fn();
    console.log('✅ PASS');
    passed++;
  } catch (err: any) {
    console.log(`❌ FAIL: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('🧪 CLEANZO — BUG 06 VERIFICATION: RESTORE MISSING BOOKING SLOT');
  console.log('============================================================\n');

  await connectDB();

  // 1. Setup clean test service (30 min service + 15 min travel = 45 min total occupancy)
  const testService45 = await Service.findOneAndUpdate(
    { id: 'srv-bug06-45m' },
    {
      id: 'srv-bug06-45m',
      title: 'غسيل 45 دقيقة (30 خدمة + 15 انتقال)',
      titleEn: 'Wash 45m (30 service + 15 travel)',
      category: 'cars',
      price: 220,
      duration: 30,
      serviceDurationMinutes: 30,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 45,
      image: '/images/car-wash.jpg',
      active: true,
      available: true,
    },
    { upsert: true, new: true }
  );

  const testDate = '2026-10-25';
  await Booking.deleteMany({ date: testDate });

  // =========================================================================
  // PHASE 5 — STANDARD SEQUENCE: Slots are 45 minutes (service duration only)
  // =========================================================================
  await test('Phase 5.1: 45-min slots appear correctly when day is free', async () => {
    const res = await getAvailableSlots(testDate, testService45.id);
    assert(res.isDayAvailable === true, 'Day should be available');
    
    const slotTimes = res.slots.map((s) => s.time);
    // 45-minute service: slots at 09:00–09:45, 09:45–10:30, 10:30–11:15, etc.
    assert(slotTimes.includes('09:00 – 09:45'), '09:00 – 09:45 slot must appear');
    assert(slotTimes.includes('09:45 – 10:30'), '09:45 – 10:30 slot must appear');
    assert(slotTimes.includes('10:30 – 11:15'), '10:30 – 11:15 slot must appear');

    const s0900 = res.slots.find((s) => s.time === '09:00 – 09:45');
    const s0945 = res.slots.find((s) => s.time === '09:45 – 10:30');

    assert(s0900?.available === true, '09:00 – 09:45 should be available');
    assert(s0945?.available === true, '09:45 – 10:30 should be available');
  });

  let createdBookingId = '';

  await test('Phase 5.2: Booking marks exact 45-min slot as unavailable', async () => {
    // Occupy 09:00 – 09:45 (exactly 45 minutes, NO travel time inflation)
    const b = await Booking.create({
      id: 'BK-BUG06-09TO0945',
      serviceId: testService45.id,
      serviceSnapshot: { id: testService45.id, title: testService45.title, price: 220 },
      customerName: 'عميل تجريبي',
      customerPhone: '01012345678',
      category: 'cars',
      date: testDate,
      time: '09:00 – 09:45',
      timeSlotStart: '09:00',
      scheduledStart: '09:00',
      scheduledEnd: '09:45',
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 45,
      duration: 45,
      basePrice: 220,
      totalPrice: 220,
      finalPrice: 220,
      address: { city: 'القاهرة', area: 'المعادي', details: 'شارع 9' },
      status: 'confirmed',
      timeline: [],
    });
    createdBookingId = b.id;

    const res = await getAvailableSlots(testDate, testService45.id);
    const s0900 = res.slots.find((s) => s.time === '09:00 – 09:45');
    const s0945 = res.slots.find((s) => s.time === '09:45 – 10:30');

    assert(s0900 !== undefined, '09:00 – 09:45 must appear');
    assert(s0900?.available === false, '09:00 – 09:45 must be marked unavailable');
    assert(s0945 !== undefined, '09:45 – 10:30 must appear');
    assert(s0945?.available === true, '09:45 – 10:30 must remain available (next slot starts at boundary)');
  });

  await test('Phase 5.3: Cancellation releases slot for new booking', async () => {
    await Booking.updateOne({ id: createdBookingId }, { status: 'cancelled' });

    const res = await getAvailableSlots(testDate, testService45.id);
    const s0900 = res.slots.find((s) => s.time === '09:00 – 09:45');

    assert(s0900 !== undefined, '09:00 – 09:45 must be present');
    assert(s0900?.available === true, '09:00 – 09:45 must be released and available');
    assert(!s0900?.reason, 'No unavailable reason when released');
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================
  await test('Edge Case: Service duration 20 min (no travel time inflation)', async () => {
    const srv20 = await Service.findOneAndUpdate(
      { id: 'srv-bug06-20m' },
      {
        id: 'srv-bug06-20m',
        title: 'خدمة 20 دقيقة',
        titleEn: 'Service 20m',
        category: 'cars',
        price: 150,
        serviceDurationMinutes: 20,
        travelTimeMinutes: 10,
        duration: 20,
        image: '/images/car-wash.jpg',
        active: true,
        available: true,
      },
      { upsert: true, new: true }
    );

    const date20 = '2026-10-26';
    await Booking.deleteMany({ date: date20 });

    // Book 10:30 – 10:50 (exactly 20 minutes, NOT 30)
    await Booking.create({
      id: 'BK-BUG06-20M',
      serviceId: srv20.id,
      serviceSnapshot: { id: srv20.id, title: srv20.title, price: 150 },
      customerName: 'عميل تجريبي',
      customerPhone: '01012345678',
      category: 'cars',
      date: date20,
      time: '10:30 – 10:50',
      scheduledStart: '10:30',
      scheduledEnd: '10:50',
      serviceDurationMinutes: 20,
      travelTimeMinutes: 10,
      totalOccupiedMinutes: 20,
      basePrice: 150,
      totalPrice: 150,
      finalPrice: 150,
      address: { city: 'القاهرة', area: 'المعادي', details: 'شارع 9' },
      status: 'confirmed',
    });

    const res = await getAvailableSlots(date20, srv20.id);
    // Slot at 10:30 should be unavailable, next available slot should be at 10:45 (snapped to 15-min)
    const s1030 = res.slots.find((s) => s.start === '10:30');
    assert(s1030 !== undefined, '10:30 slot is present');
    assert(s1030!.available === false, '10:30 slot is marked unavailable');

    // totalOccupiedMinutes should be 30 (20 min service + 10 min travel)
    assert(res.serviceTiming.totalOccupiedMinutes === 30, `Total occupancy should be 30, got: ${res.serviceTiming.totalOccupiedMinutes}`);
    assert(res.serviceTiming.serviceDurationMinutes === 20, `Service duration should be 20, got: ${res.serviceTiming.serviceDurationMinutes}`);
  });

  await test('Edge Case: Service duration 60 min + travel 15 min = 75 min total occupancy', async () => {
    const srv75 = await Service.findOneAndUpdate(
      { id: 'srv-bug06-75m' },
      {
        id: 'srv-bug06-75m',
        title: 'خدمة 75 دقيقة',
        titleEn: 'Service 75m',
        category: 'cars',
        price: 350,
        serviceDurationMinutes: 60,
        travelTimeMinutes: 15,
        totalOccupiedMinutes: 75,
        duration: 60,
        image: '/images/car-wash.jpg',
        active: true,
        available: true,
      },
      { upsert: true, new: true }
    );

    const date75 = '2026-10-27';
    await Booking.deleteMany({ date: date75 });

    const res = await getAvailableSlots(date75, srv75.id);
    assert(res.slots.length > 0, '75m slots generated');
    // totalOccupiedMinutes = 60 + 15 = 75
    assert(res.serviceTiming.totalOccupiedMinutes === 75, `Total occupancy should be 75, got: ${res.serviceTiming.totalOccupiedMinutes}`);
    assert(res.serviceTiming.serviceDurationMinutes === 60, `Service duration should be 60, got: ${res.serviceTiming.serviceDurationMinutes}`);
  });

  await test('Edge Case: Business breaks retain slot as unavailable with reason (استراحة عمل)', async () => {
    const originalSettings = await SystemSettings.findOne({ key: 'global_settings' });
    const currentBooking = (originalSettings?.booking as any) || {};

    // Configure break from 13:00 to 14:00
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      {
        $set: {
          'booking.breakStart': '13:00',
          'booking.breakEnd': '14:00',
        },
      }
    );

    const dateBreak = '2026-10-28';
    await Booking.deleteMany({ date: dateBreak });

    const res = await getAvailableSlots(dateBreak, testService45.id);
    // Find any slot that starts at 13:00 and is marked as break
    const breakSlot = res.slots.find((s) => s.start === '13:00' && s.available === false);

    assert(breakSlot !== undefined, 'Break slot at 13:00 must appear in schedule');
    assert(breakSlot!.available === false, 'Break slot must be unavailable');
    assert(breakSlot!.reason === 'استراحة عمل', `Reason should be 'استراحة عمل', got: ${breakSlot!.reason}`);

    // Restore settings
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      {
        $set: {
          'booking.breakStart': currentBooking.breakStart || null,
          'booking.breakEnd': currentBooking.breakEnd || null,
        },
      }
    );
  });

  // =========================================================================
  // BACKEND REVALIDATION TEST: Prevent Double Booking
  // =========================================================================
  await test('Backend Authority: assertSlotAvailability rejects double booking with 409 SLOT_UNAVAILABLE', async () => {
    const dateReval = '2026-10-29';
    await Booking.deleteMany({ date: dateReval });

    // Active booking at 11:00 (45 min service)
    await Booking.create({
      id: 'BK-REVAL-EXISTING',
      serviceId: testService45.id,
      serviceSnapshot: { id: testService45.id, title: testService45.title, price: 220 },
      customerName: 'عميل موجود',
      customerPhone: '01011112222',
      category: 'cars',
      date: dateReval,
      time: '11:00 – 11:45',
      scheduledStart: '11:00',
      scheduledEnd: '11:45',
      serviceDurationMinutes: 45,
      totalOccupiedMinutes: 45,
      basePrice: 220,
      totalPrice: 220,
      finalPrice: 220,
      address: { city: 'القاهرة', area: 'المعادي', details: 'شارع 9' },
      status: 'confirmed',
    });

    let rejected = false;
    try {
      await assertSlotAvailability({
        dateStr: dateReval,
        timeStr: '11:00',
        serviceId: testService45.id,
      });
    } catch (err: any) {
      assert(err.statusCode === 409 || err.code === 'SLOT_UNAVAILABLE', 'Must throw 409 Conflict');
      rejected = true;
    }
    assert(rejected, 'Overlapping booking must be authoritatively rejected by backend');
  });

  // Cleanup test data
  await Booking.deleteMany({ id: { $in: ['BK-BUG06-09TO0945', 'BK-BUG06-20M', 'BK-REVAL-EXISTING'] } });
  await Service.deleteMany({ id: { $in: ['srv-bug06-45m', 'srv-bug06-20m', 'srv-bug06-75m'] } });
  await disconnectDB();

  console.log('\n============================================================');
  console.log(`📊 RESULTS: Passed: ${passed} | Failed: ${failed}`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
