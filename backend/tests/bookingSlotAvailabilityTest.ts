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

  // 1. Setup clean test service (60 min total occupancy: 45m wash + 15m travel)
  const testService60 = await Service.findOneAndUpdate(
    { id: 'srv-bug06-60m' },
    {
      id: 'srv-bug06-60m',
      title: 'غسيل 45 دقيقة مع تنقل 15 دقيقة',
      titleEn: 'Wash 45m + Transit 15m',
      category: 'cars',
      price: 220,
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      image: '/images/car-wash.jpg',
      active: true,
      available: true,
    },
    { upsert: true, new: true }
  );

  const testDate = '2026-10-25';
  await Booking.deleteMany({ date: testDate });

  // =========================================================================
  // PHASE 5 — STANDARD SEQUENCE: 10:00, 11:00, 12:00, 13:00
  // =========================================================================
  await test('Phase 5.1: 10–11, 11–12, 12–13 all appear as available when day is free', async () => {
    const res = await getAvailableSlots(testDate, testService60.id);
    assert(res.isDayAvailable === true, 'Day should be available');
    
    const slotTimes = res.slots.map((s) => s.time);
    assert(slotTimes.includes('10:00 – 11:00'), '10:00 – 11:00 slot must appear');
    assert(slotTimes.includes('11:00 – 12:00'), '11:00 – 12:00 slot must appear');
    assert(slotTimes.includes('12:00 – 13:00'), '12:00 – 13:00 slot must appear');

    const s10 = res.slots.find((s) => s.time === '10:00 – 11:00');
    const s11 = res.slots.find((s) => s.time === '11:00 – 12:00');
    const s12 = res.slots.find((s) => s.time === '12:00 – 13:00');

    assert(s10?.available === true, '10:00 – 11:00 should be available');
    assert(s11?.available === true, '11:00 – 12:00 should be available');
    assert(s12?.available === true, '12:00 – 13:00 should be available');
  });

  let createdBookingId = '';

  await test('Phase 5.2: Occupying capacity for 11–12 retains slot and marks it Unavailable (محجوز بالكامل)', async () => {
    // Occupy 11:00 – 12:00
    const b = await Booking.create({
      id: 'BK-BUG06-11TO12',
      serviceId: testService60.id,
      serviceSnapshot: { id: testService60.id, title: testService60.title, price: 220 },
      customerName: 'عميل تجريبي',
      customerPhone: '01012345678',
      category: 'cars',
      date: testDate,
      time: '11:00 – 12:00',
      timeSlotStart: '11:00 – 12:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 60,
      duration: 45,
      basePrice: 220,
      totalPrice: 220,
      finalPrice: 220,
      address: { city: 'القاهرة', area: 'المعادي', details: 'شارع 9' },
      status: 'confirmed',
      timeline: [],
    });
    createdBookingId = b.id;

    const res = await getAvailableSlots(testDate, testService60.id);
    const slotTimes = res.slots.map((s) => s.time);

    // CRITICAL: 11:00 – 12:00 MUST NOT BE SILENTLY DROPPED!
    assert(slotTimes.includes('10:00 – 11:00'), '10:00 – 11:00 must appear');
    assert(slotTimes.includes('11:00 – 12:00'), '11:00 – 12:00 MUST APPEAR (NOT MISSING!)');
    assert(slotTimes.includes('12:00 – 13:00'), '12:00 – 13:00 must appear');

    const s10 = res.slots.find((s) => s.time === '10:00 – 11:00');
    const s11 = res.slots.find((s) => s.time === '11:00 – 12:00');
    const s12 = res.slots.find((s) => s.time === '12:00 – 13:00');

    assert(s10?.available === true, '10:00 – 11:00 must remain available');
    assert(s11?.available === false, '11:00 – 12:00 must be marked available: false');
    assert(s11?.reason === 'محجوز بالكامل', `11:00 – 12:00 reason must be 'محجوز بالكامل', got: ${s11?.reason}`);
    assert(s12?.available === true, '12:00 – 13:00 must remain available');
  });

  await test('Phase 5.3: Release capacity -> 11–12 becomes available and selectable again', async () => {
    // Release booking
    await Booking.updateOne({ id: createdBookingId }, { status: 'cancelled' });

    const res = await getAvailableSlots(testDate, testService60.id);
    const s11 = res.slots.find((s) => s.time === '11:00 – 12:00');

    assert(s11 !== undefined, '11:00 – 12:00 must be present');
    assert(s11?.available === true, '11:00 – 12:00 must be released and available: true');
    assert(!s11?.reason, 'No unavailable reason when released');
  });

  // =========================================================================
  // EDGE CASES
  // =========================================================================
  await test('Edge Case: Service duration 30 min (20m work + 10m travel)', async () => {
    const srv30 = await Service.findOneAndUpdate(
      { id: 'srv-bug06-30m' },
      {
        id: 'srv-bug06-30m',
        title: 'خدمة 30 دقيقة',
        titleEn: 'Service 30m',
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

    const date30 = '2026-10-26';
    await Booking.deleteMany({ date: date30 });

    // Book 10:30 – 11:00
    await Booking.create({
      id: 'BK-BUG06-30M',
      serviceId: srv30.id,
      serviceSnapshot: { id: srv30.id, title: srv30.title, price: 150 },
      customerName: 'عميل تجريبي',
      customerPhone: '01012345678',
      category: 'cars',
      date: date30,
      time: '10:30 – 11:00',
      scheduledStart: '10:30',
      scheduledEnd: '11:00',
      totalOccupiedMinutes: 30,
      basePrice: 150,
      totalPrice: 150,
      finalPrice: 150,
      address: { city: 'القاهرة', area: 'المعادي', details: 'شارع 9' },
      status: 'confirmed',
    });

    const res = await getAvailableSlots(date30, srv30.id);
    const s1030 = res.slots.find((s) => s.time === '10:30 – 11:00');
    const s1100 = res.slots.find((s) => s.time === '11:00 – 11:30');

    assert(s1030 !== undefined, '10:30 – 11:00 is present');
    assert(s1030.available === false, '10:30 – 11:00 is marked unavailable');
    assert(s1100 !== undefined, '11:00 – 11:30 is present');
    assert(s1100.available === true, '11:00 – 11:30 is available');
  });

  await test('Edge Case: Service duration 90 min (75m work + 15m travel)', async () => {
    const srv90 = await Service.findOneAndUpdate(
      { id: 'srv-bug06-90m' },
      {
        id: 'srv-bug06-90m',
        title: 'خدمة 90 دقيقة',
        titleEn: 'Service 90m',
        category: 'cars',
        price: 350,
        serviceDurationMinutes: 75,
        travelTimeMinutes: 15,
        duration: 75,
        image: '/images/car-wash.jpg',
        active: true,
        available: true,
      },
      { upsert: true, new: true }
    );

    const date90 = '2026-10-27';
    await Booking.deleteMany({ date: date90 });

    const res = await getAvailableSlots(date90, srv90.id);
    assert(res.slots.length > 0, '90m slots generated');
    assert(res.slots[0].totalOccupiedMinutes === 90, 'Total occupancy is 90 minutes');
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

    const res = await getAvailableSlots(dateBreak, testService60.id);
    const breakSlot = res.slots.find((s) => s.time === '13:00 – 14:00');

    assert(breakSlot !== undefined, 'Break slot 13:00 – 14:00 must appear in schedule');
    assert(breakSlot.available === false, 'Break slot must be unavailable');
    assert(breakSlot.reason === 'استراحة عمل', `Reason should be 'استراحة عمل', got: ${breakSlot.reason}`);

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

    // Active booking at 11:00
    await Booking.create({
      id: 'BK-REVAL-EXISTING',
      serviceId: testService60.id,
      serviceSnapshot: { id: testService60.id, title: testService60.title, price: 220 },
      customerName: 'عميل موجود',
      customerPhone: '01011112222',
      category: 'cars',
      date: dateReval,
      time: '11:00 – 12:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
      totalOccupiedMinutes: 60,
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
        serviceId: testService60.id,
      });
    } catch (err: any) {
      assert(err.statusCode === 409 || err.code === 'SLOT_UNAVAILABLE', 'Must throw 409 Conflict');
      rejected = true;
    }
    assert(rejected, 'Overlapping booking must be authoritatively rejected by backend');
  });

  // Cleanup test data
  await Booking.deleteMany({ id: { $in: ['BK-BUG06-11TO12', 'BK-BUG06-30M', 'BK-REVAL-EXISTING'] } });
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
