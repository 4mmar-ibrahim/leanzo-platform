import { connectDB, disconnectDB } from '../src/config/db.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import { getAvailableSlots, assertSlotAvailability } from '../src/services/availabilityService.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runSequentialAccuracyTests() {
  console.log('\n===============================================================');
  console.log('🧪 SEQUENTIAL ACCURACY & NO-OVER-BLOCKING VERIFICATION SUITE');
  console.log('===============================================================\n');

  await connectDB();

  const testDate = '2026-11-28'; // Clean future isolated date

  // Cleanup test date
  await Booking.deleteMany({ date: testDate });

  // Ensure test services exist with travelTimeMinutes: 0
  let carWash = await Service.findOne({ id: 'test-car-wash' });
  if (!carWash) {
    carWash = await Service.create({
      id: 'test-car-wash',
      title: 'غسيل سيارات تجريبي',
      titleEn: 'Test Car Wash',
      category: 'car',
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 45,
      available: true,
      active: true,
      price: 150,
      image: '/test.png',
    });
  } else {
    carWash.travelTimeMinutes = 0;
    carWash.totalOccupiedMinutes = 45;
    await carWash.save();
  }

  let tireWash = await Service.findOne({ id: 'test-tire-wash' });
  if (!tireWash) {
    tireWash = await Service.create({
      id: 'test-tire-wash',
      title: 'غسيل كاوتش تجريبي',
      titleEn: 'Test Tire Wash',
      category: 'car',
      duration: 30,
      serviceDurationMinutes: 30,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 30,
      available: true,
      active: true,
      price: 80,
      image: '/test.png',
    });
  } else {
    tireWash.travelTimeMinutes = 0;
    tireWash.totalOccupiedMinutes = 30;
    await tireWash.save();
  }

  let homeClean = await Service.findOne({ id: 'test-home-clean' });
  if (!homeClean) {
    homeClean = await Service.create({
      id: 'test-home-clean',
      title: 'تنظيف منزلي تجريبي',
      titleEn: 'Test Home Clean',
      category: 'home',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      available: true,
      active: true,
      price: 200,
      image: '/test.png',
    });
  } else {
    homeClean.travelTimeMinutes = 0;
    homeClean.totalOccupiedMinutes = 60;
    await homeClean.save();
  }

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: Booking a 45-min service MUST NOT close 2 hours!
    // Book 09:00 - 09:45
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 1: Booking 45-min service at 09:00 ---');
    const booking1 = await Booking.create({
      id: `TEST-CLN-SEQ1-${Date.now()}`,
      customerName: 'أحمد اختبار',
      customerPhone: '01011112222',
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

    // Check available slots for Car Wash (45 min)
    const carWashSlots = await getAvailableSlots(testDate, carWash.id, 45, [carWash.id], undefined, 'car');
    const carSlot0900 = carWashSlots.slots.find((s) => s.start === '09:00');
    const carSlot0945 = carWashSlots.slots.find((s) => s.start === '09:45');
    const carSlot1030 = carWashSlots.slots.find((s) => s.start === '10:30');

    assert(carSlot0900 === undefined, '09:00 slot is COMPLETELY EXCLUDED for customers (Booked)');
    assert(carSlot0945 !== undefined && carSlot0945.available === true, '09:45 slot is IMMEDIATELY AVAILABLE (45m service starts at 09:45)');
    assert(carSlot1030 !== undefined && carSlot1030.available === true, '10:30 slot is AVAILABLE (No 2-hour blocking!)');

    // Check available slots for Tire Wash (30 min)
    const tireWashSlots = await getAvailableSlots(testDate, tireWash.id, 30, [tireWash.id], undefined, 'car');
    const tireSlot0900 = tireWashSlots.slots.find((s) => s.start === '09:00');
    const tireSlot0945 = tireWashSlots.slots.find((s) => s.start === '09:45');
    const tireSlot1015 = tireWashSlots.slots.find((s) => s.start === '10:15');

    assert(tireSlot0900 === undefined, 'Tire Wash at 09:00 is COMPLETELY EXCLUDED because of 09:00-09:45 Car Wash');
    assert(tireSlot0945 !== undefined && tireSlot0945.available === true, 'Tire Wash at 09:45 is IMMEDIATELY AVAILABLE (30m service starts at 09:45)');
    assert(tireSlot1015 !== undefined && tireSlot1015.available === true, 'Tire Wash at 10:15 is AVAILABLE (Consecutive 30m slot)');

    // -------------------------------------------------------------------------
    // SCENARIO 2: Booking second service consecutively at 09:45 (Tire Wash: 30m)
    // Book 09:45 - 10:15
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Booking second service (30m) at 09:45 ---');
    const booking2 = await Booking.create({
      id: `TEST-CLN-SEQ2-${Date.now()}`,
      customerName: 'محمود اختبار',
      customerPhone: '01033334444',
      serviceId: tireWash.id,
      serviceSnapshot: { id: tireWash.id, title: tireWash.title, category: 'car', price: 80, duration: 30 },
      category: 'car',
      date: testDate,
      time: '09:45 – 10:15',
      timeSlotStart: '09:45',
      scheduledStart: '09:45',
      scheduledEnd: '10:15',
      duration: 30,
      serviceDurationMinutes: 30,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 30,
      address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'عباس العقاد' },
      basePrice: 80,
      finalPrice: 80,
      status: 'confirmed',
    });

    const slotsAfterBoth = await getAvailableSlots(testDate, carWash.id, 45, [carWash.id], undefined, 'car');
    const slot0900Both = slotsAfterBoth.slots.find((s) => s.start === '09:00');
    const slot0945Both = slotsAfterBoth.slots.find((s) => s.start === '09:45');
    const slot1015Both = slotsAfterBoth.slots.find((s) => s.start === '10:15');
    const slot1100Both = slotsAfterBoth.slots.find((s) => s.start === '11:00');

    assert(slot0900Both === undefined, '09:00 is COMPLETELY EXCLUDED for customers');
    assert(slot0945Both === undefined, '09:45 is COMPLETELY EXCLUDED for customers (Booked by Tire Wash 09:45-10:15)');
    assert(slot1015Both !== undefined && slot1015Both.available === true, '10:15 is IMMEDIATELY AVAILABLE (Next slot starts right at 10:15!)');
    assert(Boolean(slot1015Both && slot1015Both.end === '11:00'), '10:15 slot for 45m ends exactly at 11:00');
    assert(slot1100Both !== undefined && slot1100Both.available === true, '11:00 is AVAILABLE (No slots blocked after 10:15!)');

    // -------------------------------------------------------------------------
    // SCENARIO 3: Category Isolation: Home Cleaning MUST remain 100% available
    // -------------------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Category Independence (Home category) ---');
    const homeSlots = await getAvailableSlots(testDate, homeClean.id, 60, [homeClean.id], undefined, 'home');
    const home0900 = homeSlots.slots.find((s) => s.start === '09:00');
    const home1000 = homeSlots.slots.find((s) => s.start === '10:00');

    assert(home0900 !== undefined && home0900.available === true, 'Home Cleaning at 09:00 is completely AVAILABLE');
    assert(home1000 !== undefined && home1000.available === true, 'Home Cleaning at 10:00 is completely AVAILABLE');

    // Cleanup
    await Booking.deleteMany({ date: testDate });

    console.log('\n===============================================================');
    console.log('✅ ALL SEQUENTIAL ACCURACY & NO-OVER-BLOCKING TESTS PASSED!');
    console.log('===============================================================\n');
  } finally {
    await disconnectDB();
  }
}

runSequentialAccuracyTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
