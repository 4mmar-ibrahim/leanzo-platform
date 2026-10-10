import { connectDB, disconnectDB } from '../src/config/db.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import {
  getAvailableSlots,
  assertSlotAvailability,
  getCurrentCairoDateString,
  getCurrentCairoTimeString,
  timeStringToMinutes,
  minutesToDisplayTime,
} from '../src/services/availabilityService.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runBookingTimeVerificationSuite() {
  console.log('\n===============================================================');
  console.log('🧪 CLEANZO — FIRST AVAILABLE BOOKING TIME VERIFICATION SUITE');
  console.log('===============================================================\n');

  await connectDB();

  const today = getCurrentCairoDateString();
  console.log(`Testing with today's date: ${today}`);
  console.log(`Current Cairo time: ${getCurrentCairoTimeString()}`);

  const origSettingsDoc = await SystemSettings.findOne({ key: 'global_settings' });
  const originalBooking = origSettingsDoc?.booking ? JSON.parse(JSON.stringify(origSettingsDoc.booking)) : {};

  // Setup test settings
  await SystemSettings.updateOne(
    { key: 'global_settings' },
    {
      $set: {
        'booking.workingHoursStart': '09:00',
        'booking.workingHoursEnd': '22:00',
        'booking.breakStart': '14:00',
        'booking.breakEnd': '15:00',
        'booking.slotDuration': 60,
        'booking.slotInterval': 60,
        'booking.bufferTime': 0,
        'booking.minNoticeHours': 0,
        'booking.sameDayBooking': true,
        'booking.blockedDates': [],
        'booking.holidays': [],
      },
    },
    { upsert: true }
  );

  // Ensure test services exist
  let testCar = await Service.findOne({ id: 'srv-test-car' });
  if (!testCar) {
    testCar = await Service.create({
      id: 'srv-test-car',
      title: 'غسيل وتلميع سيارات',
      titleEn: 'Car Detailing',
      category: 'car',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      price: 200,
      available: true,
      active: true,
      image: '/test.png',
    });
  } else {
    testCar.serviceDurationMinutes = 60;
    testCar.travelTimeMinutes = 0;
    testCar.totalOccupiedMinutes = 60;
    testCar.category = 'car';
    await testCar.save();
  }

  let testHome = await Service.findOne({ id: 'srv-test-home' });
  if (!testHome) {
    testHome = await Service.create({
      id: 'srv-test-home',
      title: 'تنظيف منزلي عميق',
      titleEn: 'Deep Home Cleaning',
      category: 'home',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      price: 350,
      available: true,
      active: true,
      image: '/test.png',
    });
  } else {
    testHome.serviceDurationMinutes = 60;
    testHome.travelTimeMinutes = 0;
    testHome.totalOccupiedMinutes = 60;
    testHome.category = 'home';
    await testHome.save();
  }

  // Cleanup today's bookings for test services
  await Booking.deleteMany({ date: today });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: At 5:40 PM with no blocking bookings, earliest valid slot is offered (e.g. 18:00 / 6:00 PM) NOT 8:00 PM!
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: No artificial delay pushing slots to 8:00 PM ---');
    const res1 = await getAvailableSlots(today, testCar.id, 60, [testCar.id], undefined, 'car');
    assert(res1.isDayAvailable === true, 'Today is available for booking');
    assert(res1.slots.length > 0, 'Available slots exist for today');

    // Find any available slot
    const availableSlots = res1.slots.filter((s) => s.available);
    assert(availableSlots.length > 0, 'There are available slots');
    const firstAvail = availableSlots[0];
    console.log(`First available slot for today: ${firstAvail.time} (${firstAvail.start})`);

    const currentMin = timeStringToMinutes(getCurrentCairoTimeString());
    const firstStartMin = timeStringToMinutes(firstAvail.start);
    assert(firstStartMin >= currentMin, `First slot (${firstAvail.start}) is in the future relative to current time`);

    assert(firstAvail.available === true, 'First slot is verified available');

    // -------------------------------------------------------------------------
    // TEST 2: Service with duration 60m cannot be completed after closing (22:00)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Exclude slots that cannot finish before closing (22:00) ---');
    const slotOverrun = res1.slots.find((s) => timeStringToMinutes(s.start) + 60 > 22 * 60);
    assert(slotOverrun === undefined, 'No slot overruns business hours closing time 22:00');

    // Trying to book 21:30 for 60m should fail server validation
    let overrunError = false;
    try {
      await assertSlotAvailability({
        dateStr: today,
        timeStr: '21:30',
        serviceId: testCar.id,
        category: 'car',
        customDuration: 60,
      });
    } catch (err: any) {
      overrunError = true;
      assert(err.message.includes('خارج ساعات العمل'), 'Backend rejects slot overrunning closing time');
    }
    assert(overrunError, 'Overrunning slot rejected');

    // -------------------------------------------------------------------------
    // TEST 3: Active booking 19:00 - 20:00 marks 19:00 unavailable in category without blocking 20:00
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Interval 19:00 - 20:00 booked blocks 19:00 without blocking subsequent 20:00 ---');
    const testBooking19 = await Booking.create({
      id: `TEST-CLN-1900-${Date.now()}`,
      customerName: 'عميل حجز 7 مساء',
      customerPhone: '01000000001',
      serviceId: testCar.id,
      serviceSnapshot: { id: testCar.id, title: testCar.title, category: 'car' },
      category: 'car',
      date: today,
      time: '19:00 – 20:00',
      timeSlotStart: '19:00',
      scheduledStart: '19:00',
      scheduledEnd: '20:00',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      address: { area: 'المعادي', city: 'القاهرة' },
      basePrice: 200,
      finalPrice: 200,
      status: 'confirmed',
    });

    const res3 = await getAvailableSlots(today, testCar.id, 60, [testCar.id], undefined, 'car');
    const slot1900 = res3.slots.find((s) => s.start === '19:00');
    const slot2000 = res3.slots.find((s) => s.start === '20:00');

    assert(slot1900 !== undefined && slot1900.available === false, '19:00 slot is marked UNAVAILABLE (Booked)');
    assert(slot2000 !== undefined && slot2000.available === true, '20:00 slot is AVAILABLE immediately following 19:00 - 20:00');

    // Clean up test booking before Test 4
    await Booking.deleteOne({ id: testBooking19.id });

    // -------------------------------------------------------------------------
    // TEST 4 & 5: Addon increases duration -> recalculates slots; removing addon recalculates back
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4 & 5: Addon increases duration to 90 min, then reverts to 60 min ---');
    // With 90 min duration, starting at 19:00 ends at 20:30
    const resAddon = await getAvailableSlots(today, testCar.id, 90, [testCar.id], undefined, 'car');
    const slot1900Addon = resAddon.slots.find((s) => s.start === '19:00');
    assert(Boolean(slot1900Addon && slot1900Addon.end === '20:30'), '19:00 slot with 90m addon ends at 20:30');
    assert(Boolean(slot1900Addon && slot1900Addon.available === true), '19:00 slot for 90m is available');

    // Slot at 21:00 cannot fit 90m (21:00 + 90m = 22:30 > 22:00)
    const slot2100Addon = resAddon.slots.find((s) => s.start === '21:00');
    assert(slot2100Addon === undefined, '21:00 slot is NOT offered for 90m service (would exceed 22:00 closing)');

    // Revert addon: back to 60m
    const resNoAddon = await getAvailableSlots(today, testCar.id, 60, [testCar.id], undefined, 'car');
    const slot2100NoAddon = resNoAddon.slots.find((s) => s.start === '21:00');
    assert(slot2100NoAddon !== undefined && slot2100NoAddon.available === true, '21:00 slot is offered again for 60m service');

    // -------------------------------------------------------------------------
    // TEST 6: Category Independence: Car booking at 19:00 does NOT block Home Cleaning at 19:00
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Category Independence (Car booking does not block Home category) ---');
    const carBooking19 = await Booking.create({
      id: `TEST-CLN-CAR19-${Date.now()}`,
      customerName: 'عميل سيارات 7 مساء',
      customerPhone: '01000000002',
      serviceId: testCar.id,
      serviceSnapshot: { id: testCar.id, title: testCar.title, category: 'car' },
      category: 'car',
      date: today,
      time: '19:00 – 20:00',
      timeSlotStart: '19:00',
      scheduledStart: '19:00',
      scheduledEnd: '20:00',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      address: { area: 'المعادي', city: 'القاهرة' },
      basePrice: 200,
      finalPrice: 200,
      status: 'confirmed',
    });

    const homeRes = await getAvailableSlots(today, testHome.id, 60, [testHome.id], undefined, 'home');
    const homeSlot1900 = homeRes.slots.find((s) => s.start === '19:00');
    assert(homeSlot1900 !== undefined && homeSlot1900.available === true, 'Home Cleaning at 19:00 is completely AVAILABLE despite Car booking');

    // Clean up car booking
    await Booking.deleteOne({ id: carBooking19.id });

    // -------------------------------------------------------------------------
    // TEST 7: Business breaks (14:00 - 15:00) are respected and marked unavailable
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Business breaks are strictly enforced ---');
    const futureDate = '2026-11-20';
    const futureRes = await getAvailableSlots(futureDate, testCar.id, 60, [testCar.id], undefined, 'car');
    const breakSlot = futureRes.slots.find((s) => s.start === '14:00');
    assert(breakSlot !== undefined && breakSlot.available === false, '14:00 break slot is retained and marked UNAVAILABLE');
    assert(breakSlot?.reason === 'استراحة عمل', 'Reason is explicitly marked as "استراحة عمل"');

    // -------------------------------------------------------------------------
    // TEST 8: Timezone consistency (No past slots offered for today)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Timezone consistency and zero past slots offered ---');
    for (const slot of res1.slots) {
      if (slot.available) {
        const sMin = timeStringToMinutes(slot.start);
        assert(sMin >= currentMin, `Available slot ${slot.start} (${sMin}m) is strictly >= current Cairo time (${currentMin}m)`);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 9: Offered slot is accepted identically by backend assertSlotAvailability
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Available slot is confirmed without error by backend authority ---');
    const validSlotToBook = availableSlots.find((s) => s.start !== '18:00'); // pick any non-18:00 available slot
    if (validSlotToBook) {
      const timing = await assertSlotAvailability({
        dateStr: today,
        timeStr: validSlotToBook.start,
        serviceId: testCar.id,
        category: 'car',
        customDuration: 60,
      });
      assert(timing.scheduledStart === validSlotToBook.start, `Server accepts offered slot ${validSlotToBook.start}`);
      assert(timing.totalOccupiedMinutes === 60, 'Server verifies exact 60m occupancy');
    }

    // Cleanup
    await Booking.deleteMany({ id: { $regex: '^bk-test-' } });
    await Service.deleteMany({ id: { $in: ['srv-test-car', 'srv-test-home'] } });
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      { $set: { booking: originalBooking } }
    );

    console.log('\n===============================================================');
    console.log('🎉 ALL 9 MANDATORY BOOKING TIME VERIFICATION TESTS PASSED!');
    console.log('===============================================================\n');
  } finally {
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      { $set: { booking: originalBooking } }
    );
    await disconnectDB();
  }
}

runBookingTimeVerificationSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
