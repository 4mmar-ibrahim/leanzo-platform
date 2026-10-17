import '../src/config/env.js';
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
  withBookingLock,
  timeStringToMinutes,
  minutesToDisplayTime,
} from '../src/services/availabilityService.js';
import { isTimeIntervalOverlapping, getBookingTimeInterval } from '../src/controllers/bookingController.js';

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

export async function runComprehensiveAppointmentConflictTestSuite() {
  console.log('\n====================================================================');
  console.log('🧪 COMPREHENSIVE APPOINTMENT CONFLICT & RESOURCE INDEPENDENCE SUITE');
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

  const testDate = '2028-06-25'; // Future Sunday (working day)

  try {
    // 0. Ensure clean state & test services/categories
    await Booking.deleteMany({ date: testDate });
    await SubscriptionVisit.deleteMany({ date: testDate });
    await Service.deleteMany({ id: { $in: ['srv-conf-car', 'srv-conf-home'] } });
    let carCat = await ServiceCategory.findOne({ slug: 'car' });
    if (!carCat) {
      await ServiceCategory.create({
        id: 'cat-conf-car',
        name: 'غسيل سيارات',
        nameEn: 'Car Wash',
        slug: 'car',
        active: true,
      });
    }

    let homeCat = await ServiceCategory.findOne({ slug: 'home' });
    if (!homeCat) {
      await ServiceCategory.create({
        id: 'cat-conf-home',
        name: 'تنظيف منازل',
        nameEn: 'Home Cleaning',
        slug: 'home',
        active: true,
      });
    }

    await Service.create({
      id: 'srv-conf-car',
      title: 'غسيل سيارة متكامل',
      titleEn: 'Full Car Wash',
      category: 'car',
      price: 250,
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      active: true,
      available: true,
      image: '/images/services/car-wash.png',
    });

    await Service.create({
      id: 'srv-conf-home',
      title: 'تنظيف سجاد منزلي',
      titleEn: 'Home Carpet Cleaning',
      category: 'home',
      price: 350,
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 0,
      totalOccupiedMinutes: 60,
      active: true,
      available: true,
      image: '/images/services/home-carpet.png',
    });

    // Helper to create test booking with all required Prisma fields
    const createTestBooking = async (overrides: Record<string, any>) => {
      const base = {
        customerName: 'عميل تجريبي',
        customerPhone: '01011111111',
        serviceId: 'srv-conf-car',
        date: testDate,
        time: '09:00 – 10:00',
        timeSlotStart: '09:00',
        scheduledStart: '09:00',
        scheduledEnd: '10:00',
        duration: 60,
        serviceDurationMinutes: 45,
        travelTimeMinutes: 15,
        totalOccupiedMinutes: 60,
        category: 'car',
        status: 'confirmed',
        basePrice: 150,
        finalPrice: 150,
        address: {
          city: 'cairo',
          area: 'nasr_city',
          street: 'شارع الاختبار المرجعي',
        },
        serviceSnapshot: {
          id: 'srv-conf-car',
          title: 'غسيل سيارات تجريبي',
          category: 'car',
          duration: 60,
        },
      };
      return await Booking.create({ ...base, ...overrides });
    };

    // --------------------------------------------------------------------------
    // Test 1: Mathematical Adjacency & Non-Overlap Condition
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 1: Mathematical Adjacency (startA < endB && endA > startB)');
    const intA = { startMin: 540, endMin: 600 }; // 09:00 - 10:00
    const intAdjacentAfter = { startMin: 600, endMin: 660 }; // 10:00 - 11:00
    const intAdjacentBefore = { startMin: 480, endMin: 540 }; // 08:00 - 09:00
    const intPartialOverlap = { startMin: 570, endMin: 630 }; // 09:30 - 10:30

    assert(!isTimeIntervalOverlapping(intA, intAdjacentAfter), 'Adjacent after [10:00–11:00] does NOT overlap [09:00–10:00]');
    assert(!isTimeIntervalOverlapping(intA, intAdjacentBefore), 'Adjacent before [08:00–09:00] does NOT overlap [09:00–10:00]');
    assert(isTimeIntervalOverlapping(intA, intPartialOverlap), 'Partial overlap [09:30–10:30] DOES overlap [09:00–10:00]');

    // --------------------------------------------------------------------------
    // Test 2: Real Calculated Intervals & No Artificial Inflation
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 2: Real Calculated Intervals (Explicit 30-min range)');
    const explicit30Range = getBookingTimeInterval({ time: '10:00 – 10:30' });
    assert(explicit30Range.startMin === 600, 'Explicit range start is 600 (10:00)');
    assert(explicit30Range.endMin === 630, `Explicit range end is 630 (10:30), not inflated to 660 (got ${explicit30Range.endMin})`);

    // --------------------------------------------------------------------------
    // Test 3: Back-to-Back Sequential Booking Acceptance (Zero Buffer Adjacency)
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 3: Back-to-Back Sequential Booking Acceptance');
    await createTestBooking({
      id: 'BK-TEST-0900',
      customerName: 'عميل الصباح',
      customerPhone: '01011111111',
      serviceId: 'srv-conf-car',
      date: testDate,
      time: '09:00 – 10:00',
      timeSlotStart: '09:00',
      scheduledStart: '09:00',
      scheduledEnd: '10:00',
      duration: 60,
      totalOccupiedMinutes: 60,
      category: 'car',
      status: 'confirmed',
    });

    // Request immediately adjacent slot 10:00 - 11:00 for same resource -> MUST SUCCEED
    const adjacentSlotResult = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '10:00',
      serviceId: 'srv-conf-car',
      category: 'car',
      customDuration: 60,
    });
    assert(adjacentSlotResult !== null, 'Back-to-back booking 10:00–11:00 immediately following 09:00–10:00 is ALLOWED');
    assert(adjacentSlotResult.scheduledStart === '10:00' && adjacentSlotResult.scheduledEnd === '11:00', 'Scheduled bounds are exact 10:00–11:00');

    // --------------------------------------------------------------------------
    // Test 4: Partial and Full Overlap Rejection (409 SLOT_UNAVAILABLE)
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 4: Overlap Rejections (Partial, Inner, Engulfing)');
    // 4a. Partial Overlap: 09:30 - 10:30
    let errPartial: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:30',
        serviceId: 'srv-conf-car',
        category: 'car',
        customDuration: 60,
      });
    } catch (e) {
      errPartial = e;
    }
    assert(errPartial !== null && errPartial.statusCode === 409, 'Partial overlap 09:30–10:30 was REJECTED with 409');

    // 4b. Inner Full Containment: 09:15 - 09:45
    let errInner: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:15',
        serviceId: 'srv-conf-car',
        category: 'car',
        customDuration: 30,
      });
    } catch (e) {
      errInner = e;
    }
    assert(errInner !== null && errInner.statusCode === 409, 'Inner full containment 09:15–09:45 was REJECTED with 409');

    // --------------------------------------------------------------------------
    // Test 5: Category & Resource Independence (Car Fleet vs Home Crew)
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 5: Category & Resource Independence (Car vs Home)');
    // Existing Car booking at 09:00 - 10:00
    // Request Home booking at exact same time 09:00 - 10:00 -> MUST SUCCEED!
    const homeConcurrentResult = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '09:00',
      serviceId: 'srv-conf-home',
      category: 'home',
      customDuration: 60,
    });
    assert(homeConcurrentResult !== null, 'Home cleaning 09:00–10:00 ALLOWED simultaneously with Car Wash');
    assert(homeConcurrentResult.scheduledStart === '09:00' && homeConcurrentResult.scheduledEnd === '10:00', 'Home scheduled bounds are 09:00–10:00');

    // --------------------------------------------------------------------------
    // Test 6: Composite Multi-Service Sequential Execution Window
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 6: Composite Multi-Service Order Sequential Independence');
    // Create compound order: Car Wash (45m, 12:00-12:45) + Home Carpet (30m, 12:45-13:15)
    await createTestBooking({
      id: 'BK-COMPOUND-1',
      customerName: 'عميل مركب',
      customerPhone: '01022222222',
      serviceId: 'srv-conf-car',
      date: testDate,
      time: '12:00 – 13:15',
      timeSlotStart: '12:00',
      scheduledStart: '12:00',
      scheduledEnd: '13:15',
      duration: 75,
      totalOccupiedMinutes: 75,
      category: 'mixed',
      status: 'confirmed',
      serviceSnapshot: {
        id: 'srv-conf-car',
        title: 'باقة مركبة',
        category: 'mixed',
        services: [
          { serviceId: 'srv-conf-car', category: 'car', duration: 45, title: 'Car Wash' },
          { serviceId: 'srv-conf-home', category: 'home', duration: 30, title: 'Carpet' },
        ],
      },
      metadata: {
        services: [
          { serviceId: 'srv-conf-car', category: 'car', duration: 45, title: 'Car Wash' },
          { serviceId: 'srv-conf-home', category: 'home', duration: 30, title: 'Carpet' },
        ],
      },
    });

    // Home request at 12:00 - 12:45 MUST BE ALLOWED (Home crew is free while car wash is executing)
    const homeFreePhase = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '12:00',
      serviceId: 'srv-conf-home',
      category: 'home',
      customDuration: 45,
    });
    assert(homeFreePhase !== null, 'Home service at 12:00–12:45 ALLOWED during car phase of composite order');

    // Car request at 12:45 - 13:15 MUST BE ALLOWED (Car fleet is free while home cleaning is executing)
    const carFreePhase = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '12:45',
      serviceId: 'srv-conf-car',
      category: 'car',
      customDuration: 30,
    });
    assert(carFreePhase !== null, 'Car service at 12:45–13:15 ALLOWED during home phase of composite order');

    // Home request at 12:45 - 13:15 MUST BE REJECTED (Home crew is occupied with composite order)
    let errHomePhase: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '12:45',
        serviceId: 'srv-conf-home',
        category: 'home',
        customDuration: 30,
      });
    } catch (e) {
      errHomePhase = e;
    }
    assert(errHomePhase !== null && errHomePhase.statusCode === 409, 'Home service at 12:45–13:15 REJECTED due to home phase conflict');

    // --------------------------------------------------------------------------
    // Test 7: Reschedule Self-Exclusion & Conflict Preservation
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 7: Reschedule Self-Exclusion & Non-Destructive Failure');
    const reschedBooking = await createTestBooking({
      id: 'BK-RESCHED-TEST',
      customerName: 'عميل تعديل',
      customerPhone: '01033333333',
      serviceId: 'srv-conf-car',
      date: testDate,
      time: '14:00 – 15:00',
      timeSlotStart: '14:00',
      scheduledStart: '14:00',
      scheduledEnd: '15:00',
      duration: 60,
      totalOccupiedMinutes: 60,
      category: 'car',
      status: 'confirmed',
    });

    // 7a. Reschedule to overlapping slot on same day (14:30 - 15:30) with excludeBookingId -> MUST SUCCEED
    const selfExcludeResult = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '14:30',
      serviceId: 'srv-conf-car',
      category: 'car',
      customDuration: 60,
      excludeBookingId: 'BK-RESCHED-TEST',
    });
    assert(selfExcludeResult !== null, 'Rescheduling to self-overlapping slot (14:30–15:30) with excludeBookingId SUCCEEDS');

    // 7b. Attempt reschedule via API to an already booked slot (09:00 - 10:00) -> MUST FAIL (409)
    const reschedApiRes = await requestJson(`${baseUrl}/api/bookings/${reschedBooking.id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        newDate: testDate,
        newTime: '09:00',
        customerPhone: '01033333333',
      }),
    });
    assert(reschedApiRes.status === 409, `Reschedule API returned 409 Conflict (got ${reschedApiRes.status})`);

    // Verify original booking in DB remained 100% intact
    const reloadedBooking = await Booking.findOne({ id: 'BK-RESCHED-TEST' });
    assert(reloadedBooking?.time === '14:00 – 15:00', `Booking time remained original (14:00 – 15:00, got ${reloadedBooking?.time})`);
    assert(reloadedBooking?.scheduledStart === '14:00', 'Booking scheduledStart remained intact (14:00)');

    // --------------------------------------------------------------------------
    // Test 8: Immediate Resource Release on Cancellation
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 8: Cancellation Immediate Resource Release');
    const cancelBk = await createTestBooking({
      id: 'BK-CANCEL-TEST-2',
      customerName: 'عميل إلغاء فوري',
      customerPhone: '01044444444',
      serviceId: 'srv-conf-car',
      date: testDate,
      time: '16:00 – 17:00',
      timeSlotStart: '16:00',
      scheduledStart: '16:00',
      scheduledEnd: '17:00',
      duration: 60,
      totalOccupiedMinutes: 60,
      category: 'car',
      status: 'confirmed',
    });

    // Verify slot is initially occupied
    let cancelSlotOccupied = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '16:00',
        serviceId: 'srv-conf-car',
        category: 'car',
        customDuration: 60,
      });
    } catch {
      cancelSlotOccupied = true;
    }
    assert(cancelSlotOccupied, 'Slot 16:00–17:00 is occupied before cancellation');

    // Cancel booking via DB status update
    cancelBk.status = 'cancelled';
    cancelBk.cancelledAt = new Date();
    await cancelBk.save();

    // Verify slot is now immediately available
    const cancelSlotReleased = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '16:00',
      serviceId: 'srv-conf-car',
      category: 'car',
      customDuration: 60,
    });
    assert(cancelSlotReleased !== null, 'Slot 16:00–17:00 is IMMEDIATELY available after cancellation');

    // --------------------------------------------------------------------------
    // Test 9: Package Duration Integrity (90-Minute Window Protection)
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 9: Package Duration Integrity (90-min Full Window)');
    await createTestBooking({
      id: 'BK-PACKAGE-90',
      customerName: 'عميل باقة 90 دقيقة',
      customerPhone: '01055555555',
      serviceId: 'srv-conf-car',
      date: testDate,
      time: '18:00 – 19:30',
      timeSlotStart: '18:00',
      scheduledStart: '18:00',
      scheduledEnd: '19:30',
      duration: 90,
      totalOccupiedMinutes: 90,
      packageSnapshot: {
        id: 'pkg-90',
        name: 'باقة VIP موسعة',
        durationMinutes: 90,
        price: 500,
      },
      category: 'car',
      status: 'confirmed',
      serviceSnapshot: {
        id: 'srv-conf-car',
        title: 'باقة 90 دقيقة',
        category: 'car',
        duration: 90,
        packageSnapshot: {
          id: 'pkg-90',
          name: 'باقة VIP موسعة',
          durationMinutes: 90,
          price: 500,
        },
      },
    });

    // Request at 18:45 - 19:45 (inside the 90-min package duration) -> MUST FAIL (409)
    let pkgConflictErr: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '18:45',
        serviceId: 'srv-conf-car',
        category: 'car',
        customDuration: 60,
      });
    } catch (e) {
      pkgConflictErr = e;
    }
    assert(pkgConflictErr !== null && pkgConflictErr.statusCode === 409, 'Conflict detected inside 90-min package window (18:45)');

    // Request right after package ends (19:30 - 20:30) -> MUST SUCCEED
    const pkgAdjacentResult = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '19:30',
      serviceId: 'srv-conf-car',
      category: 'car',
      customDuration: 60,
    });
    assert(pkgAdjacentResult !== null, 'Booking at 19:30 immediately following 90-min package is ALLOWED');

    console.log('\n====================================================================');
    console.log('✅ ALL COMPREHENSIVE CONFLICT & SCHEDULING INVARIANTS PASSED 100%!');
    console.log('====================================================================\n');
  } finally {
    await Booking.deleteMany({ date: testDate });
    await SubscriptionVisit.deleteMany({ date: testDate });
    await Service.deleteMany({ id: { $in: ['srv-conf-car', 'srv-conf-home'] } });
    await ServiceCategory.deleteMany({ id: { $in: ['cat-conf-car', 'cat-conf-home'] } });

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
runComprehensiveAppointmentConflictTestSuite()
  .then(async () => {
    await new Promise((r) => setTimeout(r, 250));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
