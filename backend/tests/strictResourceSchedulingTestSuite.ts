import { connectDB, disconnectDB } from '../src/config/db.js';
import prisma from '../src/config/prisma.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { SubscriptionVisit } from '../src/models/SubscriptionVisit.js';
import { Service } from '../src/models/Service.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { User } from '../src/models/User.js';
import {
  assertSlotAvailability,
  assertVehicleNotBooked,
  canonicalizePlateNumber,
  extractBookingResourceIntervals,
  withBookingLock,
  timeStringToMinutes,
  minutesToDisplayTime,
} from '../src/services/availabilityService.js';
import { createSubscriptionAtomic } from '../src/services/subscriptionService.js';

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

export async function runStrictResourceSchedulingTestSuite() {
  console.log('\n====================================================================');
  console.log('🧪 STRICT OPERATIONAL RESOURCE & SCHEDULING ENGINE VERIFICATION SUITE');
  console.log('====================================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr: any = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const testDate = '2026-11-28'; // Saturday (clean isolated test date)

  // Configure global booking settings: ensure test date is open and available
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
          'booking.workingHoursStart': '08:00',
          'booking.workingHoursEnd': '22:00',
          'booking.workingDays': [0, 1, 2, 3, 4, 5, 6],
          'booking.defaultTravelTime': 0,
        },
      }
    );
  }

  // Clean test records on testDate
  await Booking.deleteMany({ date: testDate });
  await SubscriptionVisit.deleteMany({ date: testDate });

  // Ensure test categories exist
  let carCat = await ServiceCategory.findOne({ id: 'cat-car-test' });
  if (!carCat) {
    carCat = await ServiceCategory.create({
      id: 'cat-car-test',
      name: 'خدمات السيارات',
      nameEn: 'Car Services',
      slug: 'car',
      active: true,
    });
  }

  let homeCat = await ServiceCategory.findOne({ id: 'cat-home-test' });
  if (!homeCat) {
    homeCat = await ServiceCategory.create({
      id: 'cat-home-test',
      name: 'خدمات المنازل',
      nameEn: 'Home Services',
      slug: 'home',
      active: true,
    });
  }

  // Ensure test services exist
  let testCarService = await Service.findOne({ id: 'srv-test-car' });
  if (!testCarService) {
    testCarService = await Service.create({
      id: 'srv-test-car',
      title: 'غسيل سيارة متنقل',
      titleEn: 'Mobile Car Wash',
      category: 'car',
      duration: 45,
      price: 150,
      image: '/images/car.png',
      active: true,
      available: true,
    });
  }

  let testHomeService = await Service.findOne({ id: 'srv-test-home' });
  if (!testHomeService) {
    testHomeService = await Service.create({
      id: 'srv-test-home',
      title: 'تنظيف سجاد منزلي',
      titleEn: 'Home Carpet Cleaning',
      category: 'home',
      duration: 30,
      price: 200,
      image: '/images/home.png',
      active: true,
      available: true,
    });
  }

  const serviceCatMap = new Map<string, string>([
    ['srv-test-car', 'car'],
    ['srv-test-home', 'home'],
  ]);

  // Ensure test subscription plan exists
  let testPlan = await (prisma as any).subscriptionPlan.findFirst({ where: { id: 'plan-test-sub' } });
  if (!testPlan) {
    testPlan = await (prisma as any).subscriptionPlan.create({
      data: {
        id: 'plan-test-sub',
        serviceId: 'srv-test-car',
        name: 'باقة تجريبية',
        nameEn: 'Test Plan',
        price: 400,
        visitCount: 2,
        durationDays: 30,
        status: 'active',
        allowRenewal: true,
        allowCancellation: true,
        allowRescheduling: true,
        cancellationNoticeHours: 12,
        rescheduleNoticeHours: 12,
      },
    });
  }

  // Ensure test customers exist for race condition test
  let testUser1 = await User.findOne({ phone: '01055555551' });
  if (!testUser1) {
    await User.create({
      id: 'test-user-race-1',
      name: 'عميل سباق أول',
      phone: '01055555551',
      email: 'race1@cleanzo.test',
      password: 'test-password-1234',
    });
  }

  let testUser2 = await User.findOne({ phone: '01055555552' });
  if (!testUser2) {
    await User.create({
      id: 'test-user-race-2',
      name: 'عميل سباق ثان',
      phone: '01055555552',
      email: 'race2@cleanzo.test',
      password: 'test-password-1234',
    });
  }

  function getBaseBookingData(overrides: any = {}) {
    return {
      customerName: 'عميل تجريبي',
      customerPhone: '01011111111',
      serviceId: 'srv-test-car',
      serviceSnapshot: {
        id: 'srv-test-car',
        title: 'غسيل سيارة متنقل',
        titleEn: 'Mobile Car Wash',
        category: 'car',
        image: '/images/car.png',
        price: 150,
        duration: 45,
      },
      address: { address: 'شارع التسعين، التجمع الخامس', city: 'القاهرة' },
      basePrice: 150,
      finalPrice: 150,
      category: 'car',
      timeSlotStart: '09:00',
      scheduledStart: '09:00',
      scheduledEnd: '09:45',
      duration: 45,
      totalOccupiedMinutes: 45,
      status: 'confirmed',
      ...overrides,
    };
  }

  try {
    // --------------------------------------------------------------------------
    // Test 1: Plate Number Canonicalization
    // --------------------------------------------------------------------------
    console.log('▶ Test 1: Plate Number Canonicalization & Normalization');
    const plate1 = canonicalizePlateNumber('١٢٣ أ ب ج');
    const plate2 = canonicalizePlateNumber('123 أ ب ج');
    const plate3 = canonicalizePlateNumber('123-ا-ب-ج');
    const plate4 = canonicalizePlateNumber('  123   أ ب ج  ');
    assert(plate1 === '123ابج', `Eastern digits normalized: ${plate1}`);
    assert(plate2 === '123ابج', `Standard digits normalized: ${plate2}`);
    assert(plate3 === '123ابج', `Punctuation and alef normalized: ${plate3}`);
    assert(plate1 === plate2 && plate2 === plate3 && plate3 === plate4, 'All variants match canonical plate');

    // --------------------------------------------------------------------------
    // Test 2: Composite Booking Sequential Interval Extraction
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 2: Composite Sequential Category Interval Extraction');
    const compositeOrder: any = {
      id: 'ORDER-COMPOSITE-1',
      date: testDate,
      time: '09:00 – 10:15',
      scheduledStart: '09:00',
      scheduledEnd: '10:15',
      category: 'car',
      metadata: {
        services: [
          { serviceId: 'srv-test-car', category: 'car', duration: 45, title: 'Car Wash' },
          { serviceId: 'srv-test-home', category: 'home', duration: 30, title: 'Carpet Cleaning' },
        ],
      },
    };

    const carIntervals = extractBookingResourceIntervals(compositeOrder, 'car', serviceCatMap);
    const homeIntervals = extractBookingResourceIntervals(compositeOrder, 'home', serviceCatMap);

    assert(carIntervals.length === 1, 'Extracted exactly 1 car interval');
    assert(carIntervals[0].start === 540 && carIntervals[0].end === 585, 'Car occupies 09:00 (540) to 09:45 (585)');
    assert(homeIntervals.length === 1, 'Extracted exactly 1 home interval');
    assert(homeIntervals[0].start === 585 && homeIntervals[0].end === 615, 'Home occupies 09:45 (585) to 10:15 (615)');

    // --------------------------------------------------------------------------
    // Test 3: Specific Issue 1 - Home carpet request overlapping compound order
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 3: Specific Issue 1 - Reject Home Booking Overlapping Compound Order');
    // Save the composite booking in DB
    await Booking.create(getBaseBookingData({
      id: 'BK-COMPOSITE-900',
      customerName: 'عميل مركب',
      customerPhone: '01011111111',
      serviceId: 'srv-test-car',
      date: testDate,
      time: '09:00 – 10:15',
      scheduledStart: '09:00',
      scheduledEnd: '10:15',
      duration: 75,
      totalOccupiedMinutes: 75,
      category: 'car',
      status: 'confirmed',
      metadata: {
        services: [
          { serviceId: 'srv-test-car', category: 'car', duration: 45, title: 'Car Wash' },
          { serviceId: 'srv-test-home', category: 'home', duration: 30, title: 'Carpet Cleaning' },
        ],
      },
    }));

    // 3a: Customer requests Home carpet cleaning 09:00 - 10:15 (overlaps 09:45-10:15)
    let err3a: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:00',
        serviceId: 'srv-test-home',
        category: 'home',
        customDuration: 75,
      });
    } catch (e) {
      err3a = e;
    }
    assert(err3a !== null, 'Home 09:00–10:15 request was REJECTED');
    assert(err3a.statusCode === 409, `Rejected with status code 409 (got ${err3a.statusCode})`);
    assert(err3a.message.includes('الموعد') || err3a.message.includes('تعارض'), `Arabic error returned: ${err3a.message}`);

    // 3b: Customer requests Home carpet cleaning 09:45 - 10:15 (exact home window of compound order)
    let err3b: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:45',
        serviceId: 'srv-test-home',
        category: 'home',
        customDuration: 30,
      });
    } catch (e) {
      err3b = e;
    }
    assert(err3b !== null && err3b.statusCode === 409, 'Home 09:45–10:15 exact overlap was REJECTED with 409');

    // 3c: Customer requests Home carpet cleaning 09:00 - 09:45 (home crew is free!)
    let result3c: any = null;
    try {
      result3c = await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:00',
        serviceId: 'srv-test-home',
        category: 'home',
        customDuration: 45,
      });
    } catch (e: any) {
      console.error('Unexpected error in 3c:', e.message);
    }
    assert(result3c !== null, 'Home 09:00–09:45 was ALLOWED because home crew is free during car wash phase');

    // --------------------------------------------------------------------------
    // Test 4: Category Independence (Car vs Home Resources)
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 4: Category Independence (Car fleet vs Home crew)');
    // Create Car booking 11:00 - 12:00
    await Booking.create(getBaseBookingData({
      id: 'BK-CAR-1100',
      customerName: 'عميل سيارة',
      customerPhone: '01022222222',
      serviceId: 'srv-test-car',
      date: testDate,
      time: '11:00 – 12:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
      duration: 60,
      totalOccupiedMinutes: 60,
      category: 'car',
      status: 'confirmed',
    }));

    // Home request at 11:00 - 12:00 MUST BE ALLOWED
    let home11Result = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '11:00',
      serviceId: 'srv-test-home',
      category: 'home',
      customDuration: 60,
    });
    assert(home11Result !== null, 'Home booking 11:00–12:00 ALLOWED concurrently with Car booking');

    // Car request at 11:15 - 12:15 MUST BE REJECTED
    let car11Err: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '11:15',
        serviceId: 'srv-test-car',
        category: 'car',
        customDuration: 60,
      });
    } catch (e) {
      car11Err = e;
    }
    assert(car11Err !== null && car11Err.statusCode === 409, 'Car booking 11:15–12:15 REJECTED due to car fleet collision');

    // --------------------------------------------------------------------------
    // Test 5: Strict Overlap Rule & Adjacent Boundaries (Zero Artificial Buffer)
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 5: Strict Overlap Rule & Adjacent Intervals (Zero Buffer)');
    // Existing Car booking 11:00 - 12:00
    // Consecutive adjacent booking 12:00 - 13:00 MUST BE ALLOWED (startB === endA)
    const adjacentAfter = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '12:00',
      serviceId: 'srv-test-car',
      category: 'car',
      customDuration: 60,
    });
    assert(adjacentAfter !== null, 'Adjacent interval 12:00–13:00 immediately following 11:00–12:00 is ALLOWED');

    // Prior adjacent booking 10:00 - 11:00 MUST BE ALLOWED (endB === startA)
    const adjacentBefore = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '10:00',
      serviceId: 'srv-test-car',
      category: 'car',
      customDuration: 60,
    });
    assert(adjacentBefore !== null, 'Adjacent interval 10:00–11:00 immediately preceding 11:00–12:00 is ALLOWED');

    // --------------------------------------------------------------------------
    // Test 6: Specific Issue 2 - Vehicle Exclusivity & Double Booking Protection
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 6: Specific Issue 2 - Customer Vehicle Exclusivity & Canonical Plate Check');
    // Save booking with vehicle plate "123 أ ب ج" at 14:00 - 15:00
    await Booking.create(getBaseBookingData({
      id: 'BK-VEHICLE-1400',
      customerName: 'مالك السيارة',
      customerPhone: '01033333333',
      serviceId: 'srv-test-car',
      date: testDate,
      time: '14:00 – 15:00',
      scheduledStart: '14:00',
      scheduledEnd: '15:00',
      duration: 60,
      totalOccupiedMinutes: 60,
      category: 'car',
      status: 'confirmed',
      metadata: {
        vehicleDetails: { plateNumber: '123 أ ب ج' },
        plateNumber: '123 أ ب ج',
      },
    }));

    // Attempt second booking for "١٢٣ أ ب ج" (Eastern Arabic digits) at 14:30 - 15:30 -> MUST FAIL
    let plateErr1: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '14:30',
        serviceId: 'srv-test-car',
        category: 'car',
        customDuration: 60,
        vehiclePlate: '١٢٣ أ ب ج',
      });
    } catch (e) {
      plateErr1 = e;
    }
    assert(plateErr1 !== null, 'Second booking with Eastern numerals "١٢٣ أ ب ج" was REJECTED');
    assert(plateErr1.code === 'VEHICLE_DOUBLE_BOOKING' && plateErr1.statusCode === 409, 'Error code is VEHICLE_DOUBLE_BOOKING (409)');
    assert(plateErr1.message.includes('لا يمكن حجز موعدين لنفس السيارة'), 'Arabic conflict message returned');

    // Attempt booking for the same vehicle with dashes "123-أ-ب-ج" at 14:00 - 15:00 -> MUST FAIL
    let plateErr2: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '14:00',
        serviceId: 'srv-test-car',
        category: 'car',
        customDuration: 60,
        vehiclePlate: '123-أ-ب-ج',
      });
    } catch (e) {
      plateErr2 = e;
    }
    assert(plateErr2 !== null && plateErr2.code === 'VEHICLE_DOUBLE_BOOKING', 'Normalized dashed plate was REJECTED');

    // Same vehicle at non-overlapping time (15:00 - 16:00) -> MUST BE ALLOWED
    const sameVehicleLater = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '15:00',
      serviceId: 'srv-test-car',
      category: 'car',
      customDuration: 60,
      vehiclePlate: '123 أ ب ج',
    });
    assert(sameVehicleLater !== null, 'Same vehicle at non-overlapping time (15:00–16:00) is ALLOWED');

    // --------------------------------------------------------------------------
    // Test 7: Subscription Service Intra-Request Vehicle Overlap Rejection
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 7: Subscription Intra-Request Vehicle Double Booking Prevention');
    let subErr: any = null;
    try {
      await createSubscriptionAtomic({
        customerId: 'CUST-SUB-TEST-1',
        customerName: 'عميل اشتراك',
        customerPhone: '01011111111',
        planId: 'plan-test-sub',
        serviceId: 'srv-test-car',
        vehicleDetails: { plateNumber: '999 ي ر س', model: 'Corolla' },
        address: { address: 'شارع التسعين', city: 'القاهرة' },
        visits: [
          { date: testDate, time: '16:00 – 16:45' },
          { date: testDate, time: '16:30 – 17:15' },
        ],
      });
    } catch (e: any) {
      subErr = e;
    }
    assert(subErr !== null, 'Intra-request overlapping visits for the same vehicle were REJECTED');
    assert(subErr.statusCode === 409 && subErr.code === 'VEHICLE_DOUBLE_BOOKING', 'Subscription rejected with 409 VEHICLE_DOUBLE_BOOKING');

    // --------------------------------------------------------------------------
    // Test 8: Immediate Resource Release on Cancellation
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 8: Immediate Resource Release on Cancellation');
    // Create temporary booking at 17:00 - 18:00
    const cancelTestBk = await Booking.create(getBaseBookingData({
      id: 'BK-CANCEL-TEST',
      customerName: 'عميل إلغاء',
      customerPhone: '01044444444',
      serviceId: 'srv-test-car',
      date: testDate,
      time: '17:00 – 18:00',
      scheduledStart: '17:00',
      scheduledEnd: '18:00',
      duration: 60,
      totalOccupiedMinutes: 60,
      category: 'car',
      status: 'confirmed',
    }));

    // Check slot is occupied
    let occupiedBeforeCancel = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '17:00',
        serviceId: 'srv-test-car',
        category: 'car',
        customDuration: 60,
      });
    } catch {
      occupiedBeforeCancel = true;
    }
    assert(occupiedBeforeCancel, 'Slot 17:00–18:00 is occupied before cancellation');

    // Cancel booking
    cancelTestBk.status = 'cancelled';
    cancelTestBk.cancelledAt = new Date();
    await cancelTestBk.save();

    // Check slot is immediately released and available
    let availableAfterCancel = false;
    try {
      const avail = await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '17:00',
        serviceId: 'srv-test-car',
        category: 'car',
        customDuration: 60,
      });
      if (avail) availableAfterCancel = true;
    } catch (e: any) {
      console.error('Cancellation release error:', e.message);
    }
    assert(availableAfterCancel, 'Slot 17:00–18:00 is IMMEDIATELY available after cancellation');

    // --------------------------------------------------------------------------
    // Test 9: Concurrency Race Condition under withBookingLock
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 9: Concurrency Race Condition (Simultaneous Conflicting Requests)');
    const raceSlot = '18:00';
    let successCount = 0;
    let conflictCount = 0;

    const gov = await LocationGovernorate.findOne({ active: true });
    const city = gov?.cities?.[0];
    const govId = gov ? gov.id : 'cairo';
    const cityId = city ? city.id : 'cairo-city';

    const req1 = requestJson(`${baseUrl}/api/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'عميل سباق أول',
        customerPhone: '01055555551',
        serviceId: 'srv-test-car',
        category: 'car',
        date: testDate,
        time: raceSlot,
        address: {
          governorateId: govId,
          cityId: cityId,
          area: 'التجمع الخامس',
          building: '10',
          floor: '2',
        },
      }),
    });

    const req2 = requestJson(`${baseUrl}/api/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        customerName: 'عميل سباق ثان',
        customerPhone: '01055555552',
        serviceId: 'srv-test-car',
        category: 'car',
        date: testDate,
        time: raceSlot,
        address: {
          governorateId: govId,
          cityId: cityId,
          area: 'التجمع الخامس',
          building: '10',
          floor: '2',
        },
      }),
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    console.log('Test 9 responses:', JSON.stringify(res1.data), JSON.stringify(res2.data));
    if (res1.status === 201) successCount++;
    if (res1.status === 409) conflictCount++;
    if (res2.status === 201) successCount++;
    if (res2.status === 409) conflictCount++;

    assert(
      successCount === 1 && conflictCount === 1,
      `Concurrent requests strictly serialized: 1 succeeded (201), 1 rejected (409). (success: ${successCount}, conflict: ${conflictCount})`
    );

    console.log('\n====================================================================');
    console.log('✅ ALL STRICT RESOURCE & SCHEDULING INTEGRATION TESTS PASSED 100%!');
    console.log('====================================================================\n');
  } finally {
    // Cleanup test records in dependency order
    await (prisma as any).subscriptionPlan.deleteMany({ where: { id: 'plan-test-sub' } });
    await Booking.deleteMany({ date: testDate });
    await SubscriptionVisit.deleteMany({ date: testDate });
    await Service.deleteMany({ id: { $in: ['srv-test-car', 'srv-test-home'] } });
    await ServiceCategory.deleteMany({ id: { $in: ['cat-car-test', 'cat-home-test'] } });
    await User.deleteMany({ phone: { $in: ['01055555551', '01055555552'] } });

    if (server) {
      await new Promise<void>((resolve) => {
        if (typeof (server as any).closeAllConnections === 'function') {
          (server as any).closeAllConnections();
        }
        server.close(() => resolve());
      });
    }
    await disconnectDB();
  }
}

// Self-run if called directly
runStrictResourceSchedulingTestSuite()
  .then(async () => {
    await new Promise((r) => setTimeout(r, 250));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
