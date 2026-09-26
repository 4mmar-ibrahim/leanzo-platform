import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { Technician } from '../src/models/Technician.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';
import {
  assertSlotAvailability,
  compressScheduleAfterCancellation,
  timeStringToMinutes,
  minutesToDisplayTime,
} from '../src/services/availabilityService.js';

function minutesToTimeString(totalMinutes: number): string {
  return minutesToDisplayTime(totalMinutes).time24;
}

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let customerToken: string;

let testDate = '2026-10-15'; // Future test date

let carService: any;
let homeService: any;
let zeroTravelService: any;
let tech1: any;
let tech2: any;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const cleanPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? '' : '/'}${path}`;
    const url = new URL(cleanPath, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = { raw: rawData };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function createTestBooking(overrides: Partial<any> = {}) {
  const service = overrides.service || carService;
  const time = overrides.time || '10:00';
  const totalOccupied = overrides.totalOccupiedMinutes || service.totalOccupiedMinutes || 60;
  const scheduledStart = overrides.scheduledStart || time;
  const scheduledEnd =
    overrides.scheduledEnd ||
    minutesToTimeString(timeStringToMinutes(scheduledStart) + totalOccupied);

  return Booking.create({
    id: overrides.id || `CLZ-T-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    serviceId: service.id,
    category: service.category,
    serviceSnapshot: {
      id: service.id,
      title: service.title,
      titleEn: service.titleEn,
      category: service.category,
      image: service.image,
      price: service.price,
      duration: service.duration,
    },
    date: overrides.date || testDate,
    time: time,
    timeSlotStart: overrides.timeSlotStart || time,
    scheduledStart: scheduledStart,
    scheduledEnd: scheduledEnd,
    serviceDurationMinutes: overrides.serviceDurationMinutes || service.serviceDurationMinutes || 45,
    travelTimeMinutes: overrides.travelTimeMinutes ?? service.travelTimeMinutes ?? 15,
    totalOccupiedMinutes: totalOccupied,
    status: overrides.status || 'confirmed',
    customerName: overrides.customerName || 'عميل تجريبي',
    customerPhone: overrides.customerPhone || '01011111111',
    address: {
      governorate: 'القاهرة',
      city: 'القاهرة',
      area: 'المعادي',
      street: 'شارع 9',
    },
    basePrice: service.price,
    discount: 0,
    serviceFee: 0,
    finalPrice: service.price,
    currency: 'ج.م',
    timeline: [
      {
        status: overrides.status || 'confirmed',
        label: 'تم التأكيد',
        labelEn: 'Confirmed',
        timestamp: new Date().toISOString(),
        completed: true,
        description: 'حجز تجريبي للاختبار',
        changedBy: 'test',
      },
    ],
    ...overrides,
  });
}

async function runSchedulingEngineTests() {
  console.log('================================================================');
  console.log('🚀 CLEANZO — ADVANCED SERVICE SCHEDULING ENGINE (TASK 02) TESTS');
  console.log('================================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}`;
      }
      resolve();
    });
  });

  // Clear relevant collections
  await Promise.all([
    Booking.deleteMany({}),
    Service.deleteMany({}),
    AdminUser.deleteMany({}),
    User.deleteMany({}),
    Technician.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  // Seed Admin and User
  const admin = await AdminUser.create({
    username: 'ops_manager',
    name: 'مدير العمليات والتشغيل',
    email: 'ops@cleanzo.test',
    phone: '01011112222',
    password: 'password123',
    role: 'owner',
    status: 'active',
  });
  adminToken = generateAdminToken({
    id: admin._id.toString(),
    username: admin.username,
    role: admin.role,
  });

  const customer = await User.create({
    name: 'أحمد محمود',
    phone: '01099887766',
    password: 'password123',
    role: 'customer',
  });
  customerToken = generateCustomerToken({
    id: customer._id.toString(),
    phone: customer.phone,
  });

  // Seed Technicians
  tech1 = await Technician.create({
    id: 'tech-cairo-01',
    name: 'كابتن محمود الفني',
    phone: '01012340001',
    role: 'senior',
    specialties: ['car'],
    activeOrdersCount: 0,
    status: 'available',
    isAvailable: true,
    rating: 4.9,
  });

  tech2 = await Technician.create({
    id: 'tech-cairo-02',
    name: 'كابتن طارق الفني',
    phone: '01012340002',
    role: 'senior',
    specialties: ['car'],
    activeOrdersCount: 0,
    status: 'available',
    isAvailable: true,
    rating: 4.8,
  });

  // Seed Services
  carService = await Service.create({
    id: 'srv-car-wash',
    title: 'غسيل واكس ديلوكس نانو',
    titleEn: 'Nano Wax Deluxe Wash',
    category: 'car',
    image: 'https://images.unsplash.com/photo-car',
    price: 350,
    duration: 45,
    serviceDurationMinutes: 45,
    travelTimeMinutes: 15,
    totalOccupiedMinutes: 60,
    available: true,
  });

  homeService = await Service.create({
    id: 'srv-sofa-clean',
    title: 'تنظيف كنب ومفروشات بالبخار',
    titleEn: 'Steam Sofa Cleaning',
    category: 'home',
    image: 'https://images.unsplash.com/photo-sofa',
    price: 500,
    duration: 90,
    serviceDurationMinutes: 90,
    travelTimeMinutes: 30,
    totalOccupiedMinutes: 120,
    available: true,
  });

  zeroTravelService = await Service.create({
    id: 'srv-quick-inspect',
    title: 'فحص فوري سريع',
    titleEn: 'Quick Inspection',
    category: 'car',
    image: 'https://images.unsplash.com/photo-inspect',
    price: 150,
    duration: 60,
    serviceDurationMinutes: 60,
    travelTimeMinutes: 0,
    totalOccupiedMinutes: 60,
    available: true,
  });

  // Seed Location for Booking validation
  await LocationGovernorate.deleteMany({});
  await LocationGovernorate.create({
    id: 'cairo',
    name: 'القاهرة',
    nameEn: 'Cairo',
    active: true,
    cities: [
      {
        id: 'cairo-city',
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        areas: [],
      },
    ],
  });

  let testsPassed = 0;
  let testsFailed = 0;

  async function executeTest(name: string, fn: () => Promise<void>) {
    console.log(`\n▶ [RUNNING] ${name}`);
    try {
      await fn();
      testsPassed++;
      console.log(`✅ [PASS] ${name}`);
    } catch (err: any) {
      testsFailed++;
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // =========================================================================
  // 1. SERVICE TIME MODEL & TOTAL OCCUPANCY
  // =========================================================================
  await executeTest('TEST 01: Service duration 45m + travel 15m = 60m total occupancy', async () => {
    const srv = await Service.findOne({ id: 'srv-car-wash' });
    assert(srv !== null, 'Service exists');
    assert(srv!.serviceDurationMinutes === 45, 'serviceDurationMinutes is 45');
    assert(srv!.travelTimeMinutes === 15, 'travelTimeMinutes is 15');
    assert(srv!.totalOccupiedMinutes === 60, 'totalOccupiedMinutes equals 60');
  });

  await executeTest('TEST 02: Service duration 30m + travel 20m = 50m total occupancy', async () => {
    const customSrv = await Service.create({
      id: 'srv-custom-timing',
      title: 'خدمة تجريبية مدة 30 وتنقل 20',
      titleEn: 'Custom 30m + 20m Test',
      category: 'car',
      image: 'https://images.unsplash.com/photo-custom',
      price: 200,
      duration: 30,
      serviceDurationMinutes: 30,
      travelTimeMinutes: 20,
      available: true,
    });
    assert(customSrv.totalOccupiedMinutes === 50, 'Pre-save hook computed 50m total occupancy');
  });

  await executeTest('TEST 03: Total occupancy calculation when travel time is 0', async () => {
    const srv = await Service.findOne({ id: 'srv-quick-inspect' });
    assert(srv!.serviceDurationMinutes === 60, 'serviceDurationMinutes is 60');
    assert(srv!.travelTimeMinutes === 0, 'travelTimeMinutes is 0');
    assert(srv!.totalOccupiedMinutes === 60, 'totalOccupiedMinutes is 60 without buffer');
  });

  // =========================================================================
  // 2. CONFLICT DETECTION & OVERLAP RULES
  // =========================================================================
  await executeTest('TEST 04: Exact slot overlap conflict (10:00 - 11:00 blocks 10:00)', async () => {
    await Booking.deleteMany({ date: testDate });

    // Existing booking 10:00 - 11:00
    await createTestBooking({
      id: 'CLZ-TEST-001',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    let conflictCaught = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '10:00',
        serviceId: carService.id,
      });
    } catch (err: any) {
      conflictCaught = true;
      assert(err.message.includes('غير متاح') || err.message.includes('محجوز') || err.message.includes('متاح'), 'Error indicates slot is unavailable');
    }
    assert(conflictCaught, 'Exact match 10:00 was blocked by existing booking');
  });

  await executeTest('TEST 05: Partial start overlap: 10:00 - 11:00 blocks new booking at 10:30', async () => {
    let conflictCaught = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '10:30',
        serviceId: carService.id,
      });
    } catch (err: any) {
      conflictCaught = true;
    }
    assert(conflictCaught, 'Partial overlap starting at 10:30 correctly rejected');
  });

  await executeTest('TEST 06: Partial end overlap: 10:30 - 11:30 blocks new booking at 10:00 - 11:00', async () => {
    await Booking.deleteMany({ date: testDate });
    await createTestBooking({
      id: 'CLZ-TEST-002',
      service: carService,
      time: '10:30',
      scheduledStart: '10:30',
      scheduledEnd: '11:30',
    });

    let conflictCaught = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '10:00',
        serviceId: carService.id,
      });
    } catch (err: any) {
      conflictCaught = true;
    }
    assert(conflictCaught, 'Booking ending at 11:00 overlaps existing slot starting at 10:30');
  });

  await executeTest('TEST 07: Engulfing overlap: 09:30 - 11:30 blocks new booking at 10:00 - 11:00', async () => {
    await Booking.deleteMany({ date: testDate });
    await createTestBooking({
      id: 'CLZ-TEST-003',
      service: homeService,
      time: '09:30',
      scheduledStart: '09:30',
      scheduledEnd: '11:30',
      serviceDurationMinutes: 90,
      travelTimeMinutes: 30,
      totalOccupiedMinutes: 120,
    });

    let conflictCaught = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '10:00',
        serviceId: homeService.id,
      });
    } catch (err: any) {
      conflictCaught = true;
    }
    assert(conflictCaught, 'Engulfing window successfully rejected');
  });

  await executeTest('TEST 08: Back-to-back non-overlapping slots: 10:00 - 11:00 allows 11:00 - 12:00', async () => {
    await Booking.deleteMany({ date: testDate });
    await createTestBooking({
      id: 'CLZ-TEST-004',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    const result = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '11:00',
      serviceId: carService.id,
    });
    assert(result.scheduledStart === '11:00', 'Slot starting exactly at previous end is allowed');
    assert(result.scheduledEnd === '12:00', 'Calculated end time is 12:00');
  });

  await executeTest('TEST 09: Consecutive non-overlapping earlier slot: 11:00 - 12:00 allows 10:00 - 11:00', async () => {
    const result = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '10:00',
      serviceId: carService.id,
      excludeBookingId: 'CLZ-TEST-004',
    });
    assert(result.scheduledStart === '10:00', 'Earlier slot allowed when newEnd == existingStart');
    assert(result.scheduledEnd === '11:00', 'End is 11:00');
  });

  // =========================================================================
  // 3. SERVICE-LEVEL CONFLICT ISOLATION
  // =========================================================================
  await executeTest('TEST 10: Different services with unassigned technicians do NOT conflict at same time', async () => {
    await Booking.deleteMany({ date: testDate });

    // Booking for Car Wash at 10:00 - 11:00
    await createTestBooking({
      id: 'CLZ-TEST-CAR',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    // Request booking for Home Service (Sofa Cleaning) at 10:00
    const result = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '10:00',
      serviceId: homeService.id,
    });

    assert(result.scheduledStart === '10:00', 'Different service at 10:00 was permitted');
    assert(result.scheduledEnd === '12:00', 'Home service scheduled until 12:00 (90m + 30m)');
  });

  await executeTest('TEST 11: Same assigned technician across different services DOES conflict', async () => {
    await Booking.deleteMany({ date: testDate });

    // Car Wash assigned to tech-cairo-01 at 10:00 - 11:00
    await createTestBooking({
      id: 'CLZ-TEST-ASSIGNED-1',
      service: carService,
      assignedTechnicianId: tech1.id,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    // Home service requesting the SAME technician at 10:00
    let conflictCaught = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '10:00',
        serviceId: homeService.id,
        technicianId: tech1.id,
      });
    } catch (err: any) {
      conflictCaught = true;
    }
    assert(conflictCaught, 'Same technician assigned across different services correctly flagged conflict');
  });

  await executeTest('TEST 12: Parallel capacity: Same service at same time with DIFFERENT assigned technicians is allowed', async () => {
    const result = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '10:00',
      serviceId: carService.id,
      technicianId: tech2.id,
    });
    assert(result.scheduledStart === '10:00', 'Second technician can perform parallel booking at 10:00');
  });

  // =========================================================================
  // 4. BUSINESS HOURS & AVAILABILITY API
  // =========================================================================
  await executeTest('TEST 13: Availability API excludes slots that overrun business hours (e.g. 21:30 for 60m slot with 22:00 close)', async () => {
    let overrunCaught = false;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '21:30',
        serviceId: carService.id, // 60 min total occupancy -> ends at 22:30 (exceeds 22:00)
      });
    } catch (err: any) {
      overrunCaught = true;
      assert(err.message.includes('ساعات العمل'), 'Error notes closing time / operating hours overrun');
    }
    assert(overrunCaught, 'Slot overrunning business hours rejected');
  });

  await executeTest('TEST 14: Availability API marks blocked slots as unavailable', async () => {
    await Booking.deleteMany({ date: testDate });
    await createTestBooking({
      id: 'CLZ-TEST-API-01',
      service: carService,
      time: '12:00',
      scheduledStart: '12:00',
      scheduledEnd: '13:00',
    });

    const res = await makeRequest(
      'GET',
      `/availability?date=${testDate}&serviceId=${carService.id}`
    );
    assert(res.status === 200, 'Availability endpoint returned 200');
    const slot12 = res.body.data.slots.find((s: any) => s.time24 === '12:00' || s.time === '12:00');
    assert(slot12 !== undefined, '12:00 slot found in slots list');
    assert(slot12.available === false, '12:00 slot marked unavailable due to active booking');
  });

  await executeTest('TEST 15: Availability API marks non-overlapping slots as available in Cairo time', async () => {
    const res = await makeRequest(
      'GET',
      `/availability?date=${testDate}&serviceId=${carService.id}`
    );
    assert(res.status === 200, 'Availability endpoint returned 200');
    const slot14 = res.body.data.slots.find((s: any) => s.time24 === '14:00' || s.time === '14:00');
    assert(slot14 !== undefined, '14:00 slot found');
    assert(slot14.available === true, '14:00 slot is marked available');
  });

  // =========================================================================
  // 5. BOOKING CREATION TIMING PERSISTENCE
  // =========================================================================
  await executeTest('TEST 16: Booking creation persists serviceDurationMinutes, travelTimeMinutes, scheduledStart, scheduledEnd', async () => {
    const res = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: carService.id,
        category: 'car',
        date: testDate,
        time: '15:00',
        address: {
          governorate: 'القاهرة',
          city: 'القاهرة',
          area: 'المعادي',
          street: 'شارع دجلة 23',
        },
        guestName: 'محمد سامح',
        guestPhone: '01077778888',
      },
      customerToken
    );

    assert(res.status === 201, 'Booking created successfully');
    const b = res.body.data;
    assert(b.scheduledStart === '15:00', 'scheduledStart is 15:00');
    assert(b.scheduledEnd === '16:00', 'scheduledEnd is 16:00 (15:00 + 60m occupancy)');
    assert(b.serviceDurationMinutes === 45, 'serviceDurationMinutes is 45');
    assert(b.travelTimeMinutes === 15, 'travelTimeMinutes is 15');
    assert(b.totalOccupiedMinutes === 60, 'totalOccupiedMinutes is 60');
  });

  // =========================================================================
  // 6. DYNAMIC SCHEDULE COMPRESSION & IMMUTABILITY RULES
  // =========================================================================
  await executeTest('TEST 17: Dynamic compression pulls subsequent active bookings forward to fill vacant window', async () => {
    await Booking.deleteMany({ date: testDate });

    // Booking 1: 10:00 - 11:00 (to be cancelled)
    const b1 = await createTestBooking({
      id: 'CLZ-COMP-01',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    // Booking 2: 11:00 - 12:00
    await createTestBooking({
      id: 'CLZ-COMP-02',
      service: carService,
      time: '11:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
    });

    // Booking 3: 12:00 - 13:00
    await createTestBooking({
      id: 'CLZ-COMP-03',
      service: carService,
      time: '12:00',
      scheduledStart: '12:00',
      scheduledEnd: '13:00',
    });

    // Cancel Booking 1 via compressScheduleAfterCancellation
    const moved = await compressScheduleAfterCancellation(b1, '09:30', 'ops_manager');

    assert(moved.length >= 1, 'At least one subsequent booking was shifted forward');

    const updatedB2 = await Booking.findOne({ id: 'CLZ-COMP-02' });
    assert(updatedB2!.scheduledStart === '10:00', 'Booking 2 pulled forward from 11:00 to 10:00');
    assert(updatedB2!.scheduledEnd === '11:00', 'Booking 2 scheduledEnd adjusted to 11:00');

    const updatedB3 = await Booking.findOne({ id: 'CLZ-COMP-03' });
    assert(updatedB3!.scheduledStart === '11:00', 'Booking 3 pulled forward from 12:00 to 11:00');
    assert(updatedB3!.scheduledEnd === '12:00', 'Booking 3 scheduledEnd adjusted to 12:00');
  });

  await executeTest('TEST 18: Dynamic compression respects working hours boundaries (will not shift before shift start 09:00)', async () => {
    const updatedB2 = await Booking.findOne({ id: 'CLZ-COMP-02' });
    const startMin = timeStringToMinutes(updatedB2!.scheduledStart!);
    assert(startMin >= timeStringToMinutes('09:00'), 'Booking start is not before opening hour 09:00');
  });

  await executeTest('TEST 19: Historical Immutability: Compression NEVER moves completed bookings', async () => {
    await Booking.deleteMany({ date: testDate });

    // Cancelled slot 10:00 - 11:00
    const bCancel = await createTestBooking({
      id: 'CLZ-HIST-CANCEL',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    // Completed booking at 11:00 - 12:00
    await createTestBooking({
      id: 'CLZ-HIST-DONE',
      service: carService,
      time: '11:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
      status: 'completed', // COMPLETED
    });

    // Trigger compression
    await compressScheduleAfterCancellation(bCancel, '09:00', 'ops_manager');

    const checkCompleted = await Booking.findOne({ id: 'CLZ-HIST-DONE' });
    assert(checkCompleted!.scheduledStart === '11:00', 'Completed booking was NOT shifted from 11:00');
    assert(checkCompleted!.status === 'completed', 'Status remains completed');
  });

  await executeTest('TEST 20: Historical Immutability: Compression NEVER moves past bookings (scheduledEnd < now)', async () => {
    // Booking already ended
    await createTestBooking({
      id: 'CLZ-HIST-PAST',
      service: carService,
      time: '09:00',
      scheduledStart: '09:00',
      scheduledEnd: '10:00',
    });

    // Cancelling a booking with current time at 13:00 should not touch 09:00 slot
    const bDummy = await createTestBooking({
      id: 'CLZ-DUMMY',
      service: carService,
      time: '13:00',
      scheduledStart: '13:00',
      scheduledEnd: '14:00',
    });

    await compressScheduleAfterCancellation(bDummy, '13:00', 'ops_manager');

    const checkPast = await Booking.findOne({ id: 'CLZ-HIST-PAST' });
    assert(checkPast!.scheduledStart === '09:00', 'Past booking was completely untouched');
  });

  await executeTest('TEST 21: Historical Immutability: Compression NEVER moves already cancelled bookings', async () => {
    await createTestBooking({
      id: 'CLZ-ALREADY-CANCELLED',
      service: carService,
      time: '14:00',
      scheduledStart: '14:00',
      scheduledEnd: '15:00',
      status: 'cancelled',
    });

    const bTrigger = await createTestBooking({
      id: 'CLZ-TRIGGER',
      service: carService,
      time: '12:00',
      scheduledStart: '12:00',
      scheduledEnd: '13:00',
    });

    await compressScheduleAfterCancellation(bTrigger, '12:00', 'ops_manager');

    const check = await Booking.findOne({ id: 'CLZ-ALREADY-CANCELLED' });
    assert(check!.scheduledStart === '14:00', 'Cancelled booking retained original 14:00 scheduledStart');
    assert(check!.status === 'cancelled', 'Status preserved as cancelled');
  });

  await executeTest('TEST 22: Mid-slot cancellation reclaims remaining unfulfilled window from cancellation time', async () => {
    await Booking.deleteMany({ date: testDate });

    // Booking 1: 10:00 - 11:00 (cancelled mid-slot at 10:20)
    const bMid = await createTestBooking({
      id: 'CLZ-MID-01',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    // Subsequent booking 2 at 11:00 - 12:00
    await createTestBooking({
      id: 'CLZ-MID-02',
      service: carService,
      time: '11:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
    });

    // Cancelled at 10:20 -> Next slot cannot be pulled before 10:20!
    await compressScheduleAfterCancellation(bMid, '10:20', 'ops_manager');

    const updatedNext = await Booking.findOne({ id: 'CLZ-MID-02' });
    assert(
      timeStringToMinutes(updatedNext!.scheduledStart!) >= timeStringToMinutes('10:20'),
      'Subsequent slot not shifted earlier than cancellation moment (10:20)'
    );
  });

  // =========================================================================
  // 7. DOUBLE BOOKING CONCURRENCY & INTEGRITY
  // =========================================================================
  await executeTest('TEST 23: Double booking rejection at backend level (authoritative Source of Truth)', async () => {
    await Booking.deleteMany({ date: testDate });

    // First booking at 16:00
    const res1 = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: carService.id,
        category: 'car',
        date: testDate,
        time: '16:00',
        address: {
          governorate: 'القاهرة',
          city: 'القاهرة',
          area: 'المعادي',
          street: 'شارع 9',
        },
        guestName: 'عميل حجز أول',
        guestPhone: '01088889999',
      },
      customerToken
    );
    assert(res1.status === 201, 'First booking created successfully');

    // Concurrent/Second booking attempt for identical slot
    const res2 = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: carService.id,
        category: 'car',
        date: testDate,
        time: '16:00',
        address: {
          governorate: 'القاهرة',
          city: 'القاهرة',
          area: 'المعادي',
          street: 'شارع 9',
        },
        guestName: 'عميل حجز ثانٍ منافس',
        guestPhone: '01099990000',
      },
      customerToken
    );
    assert(res2.status === 409, 'Second overlapping booking rejected with HTTP 409 Conflict');
    assert(
      res2.body.code === 'TIME_SLOT_UNAVAILABLE' || res2.body.errorCode === 'TIME_SLOT_UNAVAILABLE',
      'Returned authoritative TIME_SLOT_UNAVAILABLE error code'
    );
  });

  await executeTest('TEST 24: Dynamic compression creates timeline events and audit logs with operator identity', async () => {
    await Booking.deleteMany({ date: testDate });

    const bToCancel = await createTestBooking({
      id: 'CLZ-AUDIT-01',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    await createTestBooking({
      id: 'CLZ-AUDIT-02',
      service: carService,
      time: '11:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
    });

    await compressScheduleAfterCancellation(bToCancel, '09:00', 'operations_lead');

    const shiftedDoc = await Booking.findOne({ id: 'CLZ-AUDIT-02' });
    const lastTimeline = shiftedDoc!.timeline[shiftedDoc!.timeline.length - 1];
    assert(lastTimeline !== undefined, 'Timeline entry exists for shifted booking');
    assert(lastTimeline.changedBy === 'operations_lead', 'Timeline records operator who caused compression');
    assert(
      Boolean(lastTimeline?.description?.includes('تقديم') && lastTimeline?.description?.includes('تلقائياً')),
      'Timeline describes dynamic reschedule'
    );

    const auditLog = await AuditLog.findOne({
      target: 'CLZ-AUDIT-02',
      action: 'إعادة جدولة وضغط تلقائي للمواعيد',
    });
    assert(auditLog !== null, 'System-wide AuditLog record created for schedule compression');
    assert(auditLog!.adminName === 'operations_lead', 'AuditLog records correct operator name');
  });

  await executeTest('TEST 25: Multiple chain compressions maintain sequential order without creating collisions', async () => {
    await Booking.deleteMany({ date: testDate });

    // Create a chain of 4 bookings: 10:00, 11:00, 12:00, 13:00
    const b0 = await createTestBooking({
      id: 'CLZ-CHAIN-0',
      service: carService,
      time: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:00',
    });

    await createTestBooking({
      id: 'CLZ-CHAIN-1',
      service: carService,
      time: '11:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
    });

    await createTestBooking({
      id: 'CLZ-CHAIN-2',
      service: carService,
      time: '12:00',
      scheduledStart: '12:00',
      scheduledEnd: '13:00',
    });

    await createTestBooking({
      id: 'CLZ-CHAIN-3',
      service: carService,
      time: '13:00',
      scheduledStart: '13:00',
      scheduledEnd: '14:00',
    });

    // Cancel Booking 0
    await compressScheduleAfterCancellation(b0, '09:00', 'ops_manager');

    const resB1 = await Booking.findOne({ id: 'CLZ-CHAIN-1' });
    const resB2 = await Booking.findOne({ id: 'CLZ-CHAIN-2' });
    const resB3 = await Booking.findOne({ id: 'CLZ-CHAIN-3' });

    assert(resB1!.scheduledStart === '10:00' && resB1!.scheduledEnd === '11:00', 'Chain 1 shifted to 10:00 - 11:00');
    assert(resB2!.scheduledStart === '11:00' && resB2!.scheduledEnd === '12:00', 'Chain 2 shifted to 11:00 - 12:00');
    assert(resB3!.scheduledStart === '12:00' && resB3!.scheduledEnd === '13:00', 'Chain 3 shifted to 12:00 - 13:00');

    // Verify no overlap between shifted bookings
    const m1Start = timeStringToMinutes(resB1!.scheduledStart!);
    const m1End = timeStringToMinutes(resB1!.scheduledEnd!);
    const m2Start = timeStringToMinutes(resB2!.scheduledStart!);
    const m2End = timeStringToMinutes(resB2!.scheduledEnd!);
    const m3Start = timeStringToMinutes(resB3!.scheduledStart!);
    const m3End = timeStringToMinutes(resB3!.scheduledEnd!);

    assert(m1End <= m2Start, 'No overlap between Chain 1 and Chain 2');
    assert(m2End <= m3Start, 'No overlap between Chain 2 and Chain 3');
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`📊 TEST EXECUTION SUMMARY:`);
  console.log(`   Passed: ${testsPassed} / 25`);
  console.log(`   Failed: ${testsFailed} / 25`);
  console.log(`   Status: ${testsFailed === 0 ? '🏆 100% ALL TESTS PASSED' : '⚠️ FAILURES DETECTED'}`);
  console.log('================================================================\n');

  // Close connections
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectDB();

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSchedulingEngineTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
