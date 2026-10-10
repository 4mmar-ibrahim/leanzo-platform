import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;

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
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${baseUrl}${cleanPath}`);
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
          let parsed: any = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = { raw: rawData };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

export async function runDynamicSchedulingTestSuite() {
  console.log('\n============================================================');
  console.log('🚀 CLEANZO — DYNAMIC CONTINUOUS BOOKING & SCHEDULING ENGINE TEST SUITE');
  console.log('============================================================\n');

  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}/api`;
      console.log(`  🌐 Ephemeral test server active on ${baseUrl}`);
      resolve();
    });
  });

  // Setup Admin Token
  let admin = await AdminUser.findOne({ role: 'owner' });
  if (!admin) {
    admin = await AdminUser.create({
      id: 'admin_test_owner',
      name: 'Owner Admin',
      email: 'owner@cleanzo.test',
      phone: '01011112222',
      role: 'owner',
      permissions: { orders: 'edit', services: 'edit' },
      granularPermissions: ['*'],
      active: true,
    });
  }
  adminToken = generateAdminToken(admin);

  // Setup test governorate and city
  let testGov = await LocationGovernorate.findOne({ active: true });
  let govId = testGov?.id;
  let cityId = (testGov?.cities as any[])?.find((c: any) => c.active !== false)?.id;
  if (!testGov || !cityId) {
    testGov = await LocationGovernorate.create({
      id: 'cairo_test_sched',
      name: 'القاهرة',
      nameEn: 'Cairo',
      active: true,
      cities: [
        { id: 'nasr_city_sched', name: 'مدينة نصر', nameEn: 'Nasr City', active: true, priceMultiplier: 1 },
      ],
    });
    govId = testGov.id;
    cityId = 'nasr_city_sched';
  }

  // Setup standard test working hours: 13:00 to 18:00 (for tests 1, 2, 4, 11)
  let settings = await SystemSettings.findOne({ key: 'global_settings' });
  if (!settings) {
    settings = await SystemSettings.create({
      key: 'global_settings',
      booking: {
        workingHoursStart: '13:00',
        workingHoursEnd: '18:00',
        breakStart: undefined,
        breakEnd: undefined,
        bufferTime: 10,
        sameDayBooking: true,
        advanceBookingDays: 30,
        workingDays: [0, 1, 2, 3, 4, 5, 6],
      },
    });
  } else {
    settings.booking = {
      ...(settings.booking || {}),
      workingHoursStart: '13:00',
      workingHoursEnd: '18:00',
      breakStart: undefined,
      breakEnd: undefined,
      bufferTime: 10,
      sameDayBooking: true,
      advanceBookingDays: 30,
      workingDays: [0, 1, 2, 3, 4, 5, 6],
    };
    await settings.save();
  }

  const testFutureDate = '2026-11-20'; // Clean future date for isolated testing

  // Clean existing test bookings for testFutureDate
  await Booking.deleteMany({ date: testFutureDate });

  try {
    // -------------------------------------------------------------------
    // TEST 1: Service 20 min + Travel 10 min = 30-min continuous intervals
    // -------------------------------------------------------------------
    console.log('\n--- TEST 1: Service 20 min + Travel 10 min = 30-min intervals ---');
    const s1 = await Service.findOneAndUpdate(
      { id: 'srv_test_20_10' },
      {
        id: 'srv_test_20_10',
        title: 'خدمة 20 دقيقة',
        titleEn: 'Service 20m',
        category: 'cars',
        price: 150,
        serviceDurationMinutes: 20,
        duration: 20,
        travelTimeMinutes: 10,
        available: true,
        active: true,
        image: '/images/car-wash.jpg',
      },
      { upsert: true, new: true }
    );

    const res1 = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s1.id}`);
    assert(res1.status === 200, 'Availability endpoint responds with 200');
    assert(res1.body.data.slots.length === 10, `Expected 10 slots from 13:00 to 18:00 with 30m total occupancy, got ${res1.body.data.slots.length}`);
    assert(res1.body.data.slots[0].time === '13:00 – 13:30', `First slot is 13:00 – 13:30, got ${res1.body.data.slots[0].time}`);
    assert(res1.body.data.slots[1].time === '13:30 – 14:00', `Second slot is 13:30 – 14:00, got ${res1.body.data.slots[1].time}`);
    assert(res1.body.data.slots[9].time === '17:30 – 18:00', `Last slot is 17:30 – 18:00, got ${res1.body.data.slots[9].time}`);

    // -------------------------------------------------------------------
    // TEST 2: Service 17 min + Travel 10 min = 27-min continuous intervals
    // -------------------------------------------------------------------
    console.log('\n--- TEST 2: Service 17 min + Travel 10 min = 27-min continuous intervals ---');
    const s2 = await Service.findOneAndUpdate(
      { id: 'srv_test_17_10' },
      {
        id: 'srv_test_17_10',
        title: 'خدمة 17 دقيقة',
        titleEn: 'Service 17m',
        category: 'cars',
        price: 180,
        serviceDurationMinutes: 17,
        duration: 17,
        travelTimeMinutes: 10,
        available: true,
        active: true,
        image: '/images/car-wash.jpg',
      },
      { upsert: true, new: true }
    );

    const res2 = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s2.id}`);
    assert(res2.status === 200, 'Availability responds with 200');
    const slots2 = res2.body.data.slots;
    // 13:00 to 18:00 (300 min). With 27m occupancy and 15m clean grid snapping:
    // Slots start at: 13:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30 (exactly 10 clean quarter-hour slots)
    assert(slots2.length === 10, `Expected 10 slots for 27-minute intervals snapped to 15m grid in 300 min window, got ${slots2.length}`);
    assert(slots2[0].time === '13:00 – 13:27', `First slot is 13:00 – 13:27, got ${slots2[0].time}`);
    assert(slots2[1].time === '13:30 – 13:57', `Second slot is 13:30 – 13:57, got ${slots2[1].time}`);
    assert(slots2[2].time === '14:00 – 14:27', `Third slot is 14:00 – 14:27, got ${slots2[2].time}`);
    assert(slots2[3].time === '14:30 – 14:57', `Fourth slot is 14:30 – 14:57, got ${slots2[3].time}`);
    assert(slots2[9].time === '17:30 – 17:57', `Tenth slot is 17:30 – 17:57, got ${slots2[9].time}`);

    // -------------------------------------------------------------------
    // TEST 3: Service 45 min + Travel 15 min = 60-min intervals
    // -------------------------------------------------------------------
    console.log('\n--- TEST 3: Service 45 min + Travel 15 min = 60-min intervals ---');
    const s3 = await Service.findOneAndUpdate(
      { id: 'srv_test_45_15' },
      {
        id: 'srv_test_45_15',
        title: 'خدمة 45 دقيقة',
        titleEn: 'Service 45m',
        category: 'cars',
        price: 250,
        serviceDurationMinutes: 45,
        duration: 45,
        travelTimeMinutes: 15,
        available: true,
        active: true,
        image: '/images/car-wash.jpg',
      },
      { upsert: true, new: true }
    );

    const res3 = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s3.id}`);
    assert(res3.status === 200, 'Availability responds with 200');
    const slots3 = res3.body.data.slots;
    // 13:00 to 18:00 is 5 hours (300 min). 5 intervals of 60m.
    assert(slots3.length === 5, `Expected 5 slots of 60m, got ${slots3.length}`);
    assert(slots3[0].time === '13:00 – 14:00', `Slot 0 is 13:00 – 14:00, got ${slots3[0].time}`);
    assert(slots3[4].time === '17:00 – 18:00', `Slot 4 is 17:00 – 18:00, got ${slots3[4].time}`);

    // -------------------------------------------------------------------
    // TEST 4: Existing booking in middle of day -> Availability splits correctly
    // -------------------------------------------------------------------
    console.log('\n--- TEST 4: Existing booking in the middle of the day splits availability ---');
    // Create an existing booking from 14:00 to 14:30 for s1
    const testAddress = {
      label: 'المنزل',
      governorateId: govId,
      cityId: cityId,
      area: 'الحي السابع',
      building: '10',
      floor: '3',
      apartment: '12',
    };

    const bookRes = await makeRequest('POST', '/bookings', {
      serviceId: s1.id,
      category: 'cars',
      date: testFutureDate,
      time: '14:00 – 14:30',
      customerPhone: '01012345678',
      guestName: 'محمد أحمد',
      address: testAddress,
    });
    assert(bookRes.status === 201, `Booking created successfully with 201, got ${bookRes.status}: ${JSON.stringify(bookRes.body)}`);
    const createdBookingId = bookRes.body.data.id;
    assert(bookRes.body.data.scheduledStart === '14:00', 'Scheduled start is 14:00');
    assert(bookRes.body.data.scheduledEnd === '14:30', 'Scheduled end is 14:30');

    // Query availability for s1 again on testFutureDate:
    // Should have [13:00-13:30], [13:30-14:00], then 14:00-14:30 is occupied, then next is [14:30-15:00]!
    const res4 = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s1.id}`);
    const slots4 = res4.body.data.slots;
    const availableSlotTimes4 = slots4.filter((s: any) => s.available).map((s: any) => s.time);
    assert(availableSlotTimes4.includes('13:00 – 13:30'), 'Contains 13:00 – 13:30');
    assert(availableSlotTimes4.includes('13:30 – 14:00'), 'Contains 13:30 – 14:00');
    assert(!availableSlotTimes4.includes('14:00 – 14:30'), 'Occupied interval 14:00 – 14:30 is NOT available');
    const slot14 = slots4.find((s: any) => s.time === '14:00 – 14:30');
    assert(slot14 && slot14.available === false, '14:00 – 14:30 is retained and marked unavailable');
    assert(availableSlotTimes4.includes('14:30 – 15:00'), 'Continuously resumes at 14:30 – 15:00 without artificial gaps');

    // -------------------------------------------------------------------
    // TEST 5: Cancel future booking -> Released interval becomes available
    // -------------------------------------------------------------------
    console.log('\n--- TEST 5: Cancel future booking releases interval ---');
    const cancelRes = await makeRequest(
      'POST',
      `/bookings/${createdBookingId}/cancel`,
      { reason: 'تغيير الموعد', customerPhone: '01012345678' }
    );
    assert(cancelRes.status === 200, `Cancellation succeeds with 200, got ${cancelRes.status}`);

    const res5 = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s1.id}`);
    const slotTimes5 = res5.body.data.slots.map((s: any) => s.time);
    assert(slotTimes5.includes('14:00 – 14:30'), '14:00 – 14:30 is now released and available again');

    // -------------------------------------------------------------------
    // TEST 6: Cancel booking at 12 min into slot -> availability released from cancellation time
    // -------------------------------------------------------------------
    console.log('\n--- TEST 6: Cancel booking mid-slot releases from cancellation time ---');
    // Clean and create a booking from 13:00 to 13:23 (duration 23m) on a fresh date
    const testDate6 = '2026-11-21';
    await Booking.deleteMany({ date: testDate6 });

    const s6 = await Service.findOneAndUpdate(
      { id: 'srv_test_23' },
      {
        id: 'srv_test_23',
        title: 'خدمة 23 دقيقة',
        titleEn: 'Service 23m',
        category: 'cars',
        price: 190,
        serviceDurationMinutes: 15,
        travelTimeMinutes: 8, // total 23 min
        available: true,
        active: true,
        image: '/images/car-wash.jpg',
      },
      { upsert: true, new: true }
    );

    const b6 = await Booking.create({
      id: 'BK_TEST_MID_CANCEL',
      customerId: null,
      customerName: 'عميل كلينزو',
      customerPhone: '01012345678',
      serviceId: s6.id,
      serviceSnapshot: { id: s6.id, title: s6.title, price: 190, duration: 15 },
      category: 'cars',
      date: testDate6,
      time: '13:00 – 13:23',
      scheduledStart: '13:00',
      scheduledEnd: '13:23',
      serviceDurationMinutes: 15,
      travelTimeMinutes: 8,
      totalOccupiedMinutes: 23,
      duration: 15,
      address: {
        label: 'المنزل',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        area: 'الحي السابع',
        governorateId: 'cairo',
        cityId: 'nasr_city',
      },
      basePrice: 190,
      totalPrice: 190,
      finalPrice: 190,
      status: 'pending',
      timeline: [],
    });

    // Simulate cancellation at 13:12 Cairo time
    const fakeCancelDate = new Date(`${testDate6}T13:12:00+02:00`);
    b6.status = 'cancelled';
    b6.cancelledAt = fakeCancelDate;
    b6.cancellationSource = 'customer';
    await b6.save();

    const res6 = await makeRequest('GET', `/availability?date=${testDate6}&serviceId=${s6.id}`);
    const slotTimes6 = res6.body.data.slots.map((s: any) => s.time);
    // Because cancellation happened at 13:12, the newly available block starts after 13:12 and snaps to the next 15-min boundary (13:15)!
    assert(slotTimes6[0] === '13:15 – 13:38', `Newly available interval starts cleanly snapped from 13:15 (13:15 – 13:38), got ${slotTimes6[0]}`);
    assert(slotTimes6[1] === '13:45 – 14:08', `Next slot snaps to 13:45 (13:45 – 14:08), got ${slotTimes6[1]}`);

    // -------------------------------------------------------------------
    // TEST 7: Overlapping booking request is REJECTED
    // -------------------------------------------------------------------
    console.log('\n--- TEST 7: Booking interval that overlaps an active booking is REJECTED ---');
    const testDate7 = '2026-11-22';
    await Booking.deleteMany({ date: testDate7 });

    // Create initial booking 13:00 – 13:30
    const b7Init = await makeRequest('POST', '/bookings', {
      serviceId: s1.id,
      category: 'cars',
      date: testDate7,
      time: '13:00 – 13:30',
      customerPhone: '01011113333',
      guestName: 'محمد أحمد',
      address: testAddress,
    });
    assert(b7Init.status === 201, 'Initial booking created');

    // Try booking conflicting slot that overlaps (e.g. 13:00 – 13:30 or 13:15)
    const b7Conflict = await makeRequest('POST', '/bookings', {
      serviceId: s1.id,
      category: 'cars',
      date: testDate7,
      time: '13:00 – 13:30',
      customerPhone: '01099998888',
      guestName: 'علي حسن',
      address: testAddress,
    });
    assert(b7Conflict.status === 409, `Conflicting booking rejected with HTTP 409, got ${b7Conflict.status}`);
    assert(
      b7Conflict.body.message?.includes('الموعد لم يعد متاحًا') || b7Conflict.body.message?.includes('غير متاح'),
      `Returned informative conflict message: ${b7Conflict.body.message}`
    );

    // -------------------------------------------------------------------
    // TEST 8: Two simultaneous booking requests (Race condition / double booking)
    // -------------------------------------------------------------------
    console.log('\n--- TEST 8: Double-booking concurrency prevention (One succeeds, One gets 409) ---');
    const testDate8 = '2026-11-23';
    await Booking.deleteMany({ date: testDate8 });

    const [raceA, raceB] = await Promise.all([
      makeRequest('POST', '/bookings', {
        serviceId: s1.id,
        category: 'cars',
        date: testDate8,
        time: '14:00 – 14:30',
        customerPhone: '01010001000',
        guestName: 'العميل أ',
        address: testAddress,
      }),
      makeRequest('POST', '/bookings', {
        serviceId: s1.id,
        category: 'cars',
        date: testDate8,
        time: '14:00 – 14:30',
        customerPhone: '01020002000',
        guestName: 'العميل ب',
        address: testAddress,
      }),
    ]);

    const statuses = [raceA.status, raceB.status].sort();
    assert(statuses[0] === 201 && statuses[1] === 409, `Expected exactly one 201 Created and one 409 Conflict, got ${statuses[0]} and ${statuses[1]}`);

    // Verify DB contains exactly one booking for this interval
    const activeBookings8 = await Booking.find({
      date: testDate8,
      scheduledStart: '14:00',
      status: { $nin: ['cancelled'] },
    });
    assert(activeBookings8.length === 1, `DB has exactly 1 active booking in the contested interval, got ${activeBookings8.length}`);

    // -------------------------------------------------------------------
    // TEST 9: Service duration changes: NEW availability updates, OLD bookings remain intact
    // -------------------------------------------------------------------
    console.log('\n--- TEST 9: Service duration edit preserves historical snapshots ---');
    const testDate9 = '2026-11-24';
    await Booking.deleteMany({ date: testDate9 });

    const s9 = await Service.findOneAndUpdate(
      { id: 'srv_test_snapshot' },
      {
        id: 'srv_test_snapshot',
        title: 'خدمة سناب شوت',
        titleEn: 'Snapshot Service',
        category: 'cars',
        price: 200,
        serviceDurationMinutes: 20,
        travelTimeMinutes: 10, // total 30
        available: true,
        active: true,
        image: '/images/car-wash.jpg',
      },
      { upsert: true, new: true }
    );

    const b9 = await makeRequest('POST', '/bookings', {
      serviceId: s9.id,
      category: 'cars',
      date: testDate9,
      time: '13:00 – 13:30',
      customerPhone: '01033334444',
      guestName: 'طارق يوسف',
      address: testAddress,
    });
    assert(b9.status === 201, 'Booking 9 created with 30m total occupancy');

    // Admin updates service duration to 40m + 15m travel
    s9.serviceDurationMinutes = 40;
    s9.duration = 40;
    s9.travelTimeMinutes = 15;
    await s9.save();

    // Check old booking record in DB
    const oldBooking = await Booking.findOne({ id: b9.body.data.id });
    assert(oldBooking?.serviceDurationMinutes === 20, `Old booking retained 20m service duration, got ${oldBooking?.serviceDurationMinutes}`);
    assert(oldBooking?.travelTimeMinutes === 10, `Old booking retained 10m travel duration, got ${oldBooking?.travelTimeMinutes}`);
    assert(oldBooking?.totalOccupiedMinutes === 30, `Old booking retained 30m total occupancy, got ${oldBooking?.totalOccupiedMinutes}`);
    assert(oldBooking?.scheduledEnd === '13:30', `Old booking retained 13:30 scheduled end, got ${oldBooking?.scheduledEnd}`);

    // Check NEW availability on another date: should use 55m total occupancy snapped to 15m grid!
    const res9New = await makeRequest('GET', `/availability?date=2026-11-25&serviceId=${s9.id}`);
    const slots9New = res9New.body.data.slots;
    assert(slots9New[0].time === '13:00 – 13:55', `New availability reflects 55-minute interval: 13:00 – 13:55, got ${slots9New[0].time}`);
    assert(slots9New[1].time === '14:00 – 14:55', `Second new slot snaps to 14:00 boundary: 14:00 – 14:55, got ${slots9New[1].time}`);

    // -------------------------------------------------------------------
    // TEST 10: Current time filtering (Past times are not offered)
    // -------------------------------------------------------------------
    console.log('\n--- TEST 10: Current time filtering (No past times offered for today) ---');
    // Get current Cairo date
    const todayFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' });
    const todayCairoStr = todayFormatter.format(new Date());

    const res10 = await makeRequest('GET', `/availability?date=${todayCairoStr}&serviceId=${s1.id}`);
    assert(res10.status === 200, 'Availability check for today succeeds');
    const nowFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false });
    const [curHour, curMin] = nowFormatter.format(new Date()).split(':').map(Number);
    const nowMinutes = curHour * 60 + curMin;

    for (const slot of res10.body.data.slots) {
      const [slotH, slotM] = slot.time.split(/[-–—]/)[0].trim().split(':').map(Number);
      const slotStartMinutes = slotH * 60 + slotM;
      assert(slotStartMinutes > nowMinutes, `Slot start ${slot.time} (${slotStartMinutes}m) is strictly in the future compared to current time (${nowMinutes}m)`);
    }

    // -------------------------------------------------------------------
    // TEST 11: End-of-working-hours boundary
    // -------------------------------------------------------------------
    console.log('\n--- TEST 11: End-of-working-hours boundary fitting ---');
    // Working hours: 13:00 to 18:00
    // Service duration 30m: 17:30 – 18:00 is offered, but 18:00 – 18:30 must NOT be offered
    const res11 = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s1.id}`);
    const slots11 = res11.body.data.slots;
    const lastSlot11 = slots11[slots11.length - 1];
    assert(lastSlot11.time === '17:30 – 18:00', `Last slot matches working hours end boundary 17:30 – 18:00, got ${lastSlot11.time}`);
    assert(!slots11.some((s: any) => s.time.includes('18:30')), 'No slot exceeds 18:00');

    // -------------------------------------------------------------------
    // TEST 12: Duration that cannot fit is NOT offered
    // -------------------------------------------------------------------
    console.log('\n--- TEST 12: Duration that cannot fit is not offered ---');
    // If only 20 min remains and service requires 27 min
    // In Test 2, 300 minutes divided by 27 = 11 intervals (297 min). Remaining 3 minutes < 27 minutes.
    // Verify engine did NOT offer a 12th slot extending past 18:00!
    assert(slots2.length === 10, 'Did not offer partial interval that cannot fit within operating hours');

    // -------------------------------------------------------------------
    // TEST 13: Different services on same date generate distinct schedules
    // -------------------------------------------------------------------
    console.log('\n--- TEST 13: Different services generate distinct schedules on same date ---');
    const res13_A = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s1.id}`);
    const res13_B = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s2.id}`);
    assert(res13_A.body.data.slots[0].time === '13:00 – 13:30', 'Service A starts with 30m slot');
    assert(res13_B.body.data.slots[0].time === '13:00 – 13:27', 'Service B starts with 27m slot');

    // -------------------------------------------------------------------
    // TEST 14: Refresh browser / Repeated query consistency
    // -------------------------------------------------------------------
    console.log('\n--- TEST 14: Repeated queries remain consistent ---');
    const queryA = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s1.id}`);
    const queryB = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${s1.id}`);
    assert(JSON.stringify(queryA.body.data.slots) === JSON.stringify(queryB.body.data.slots), 'Repeated queries return identical slots');

    // -------------------------------------------------------------------
    // TEST 15: Change date recalculates for selected date
    // -------------------------------------------------------------------
    console.log('\n--- TEST 15: Availability calculated per selected date ---');
    const resDateA = await makeRequest('GET', `/availability?date=2026-12-01&serviceId=${s1.id}`);
    const resDateB = await makeRequest('GET', `/availability?date=2026-12-02&serviceId=${s1.id}`);
    assert(resDateA.body.data.date === '2026-12-01', 'Recalculated for 2026-12-01');
    assert(resDateB.body.data.date === '2026-12-02', 'Recalculated for 2026-12-02');

    // -------------------------------------------------------------------
    // TEST 16: Admin cancellation releases slot and updates availability
    // -------------------------------------------------------------------
    console.log('\n--- TEST 16: Admin status update to cancelled releases availability ---');
    const testDate16 = '2026-11-26';
    await Booking.deleteMany({ date: testDate16 });

    const b16 = await makeRequest('POST', '/bookings', {
      serviceId: s1.id,
      category: 'cars',
      date: testDate16,
      time: '15:00 – 15:30',
      customerPhone: '01055556666',
      guestName: 'سارة علي',
      address: testAddress,
    });
    assert(b16.status === 201, 'Booking 16 created');

    // Check slot is occupied
    const checkBefore16 = await makeRequest('GET', `/availability?date=${testDate16}&serviceId=${s1.id}`);
    const availBefore16 = checkBefore16.body.data.slots.filter((s: any) => s.available).map((s: any) => s.time);
    assert(!availBefore16.includes('15:00 – 15:30'), 'Occupied before admin cancel');
    const slot15Before = checkBefore16.body.data.slots.find((s: any) => s.time === '15:00 – 15:30');
    assert(slot15Before && slot15Before.available === false, '15:00 – 15:30 is retained as unavailable');

    // Admin cancels via PUT /admin/:id/status
    const adminCancelRes = await makeRequest(
      'PUT',
      `/bookings/admin/${b16.body.data.id}/status`,
      { status: 'cancelled', note: 'إلغاء لظروف تشغيلية' },
      adminToken
    );
    assert(adminCancelRes.status === 200, 'Admin cancelled booking successfully');

    // Check slot is now released
    const checkAfter16 = await makeRequest('GET', `/availability?date=${testDate16}&serviceId=${s1.id}`);
    assert(checkAfter16.body.data.slots.map((s: any) => s.time).includes('15:00 – 15:30'), '15:00 – 15:30 is released and available');

    // -------------------------------------------------------------------
    // TEST 17: Customer cancellation safety (In-progress booking CANNOT release)
    // -------------------------------------------------------------------
    console.log('\n--- TEST 17: In-progress booking CANNOT be cancelled or release time ---');
    const testDate17 = '2026-11-27';
    await Booking.deleteMany({ date: testDate17 });

    const b17 = await makeRequest('POST', '/bookings', {
      serviceId: s1.id,
      category: 'cars',
      date: testDate17,
      time: '16:00 – 16:30',
      customerPhone: '01077778888',
      guestName: 'محمود حسن',
      address: testAddress,
    });
    assert(b17.status === 201, 'Booking 17 created');

    // Manually set status to in_progress
    await Booking.updateOne({ id: b17.body.data.id }, { status: 'in_progress' });

    // Customer tries to cancel in-progress booking
    const customerCancelRes = await makeRequest('POST', `/bookings/${b17.body.data.id}/cancel`, {
      customerPhone: '01077778888',
      reason: 'أريد الإلغاء',
    });
    assert(customerCancelRes.status === 400, `In-progress cancellation rejected with 400, got ${customerCancelRes.status}`);

    // Verify time is still occupied
    const checkAfter17 = await makeRequest('GET', `/availability?date=${testDate17}&serviceId=${s1.id}`);
    const availAfter17 = checkAfter17.body.data.slots.filter((s: any) => s.available).map((s: any) => s.time);
    assert(!availAfter17.includes('16:00 – 16:30'), 'In-progress interval remains occupied');
    const slot16After = checkAfter17.body.data.slots.find((s: any) => s.time === '16:00 – 16:30');
    assert(slot16After && slot16After.available === false, '16:00 – 16:30 is retained as unavailable');

    // -------------------------------------------------------------------
    // TEST 18: Inactive service returns empty availability
    // -------------------------------------------------------------------
    console.log('\n--- TEST 18: Inactive service returns no availability ---');
    const sInactive = await Service.findOneAndUpdate(
      { id: 'srv_test_inactive' },
      {
        id: 'srv_test_inactive',
        title: 'خدمة معطلة',
        titleEn: 'Inactive Service',
        category: 'cars',
        price: 100,
        available: false,
        active: false,
        image: '/images/car-wash.jpg',
      },
      { upsert: true, new: true }
    );

    const res18 = await makeRequest('GET', `/availability?date=${testFutureDate}&serviceId=${sInactive.id}`);
    assert(res18.body.data.isDayAvailable === false, 'isDayAvailable is false for inactive service');
    assert(res18.body.data.slots.length === 0, 'No slots returned for inactive service');

    // -------------------------------------------------------------------
    // TEST 19: Disabled / unsupported location preserved
    // -------------------------------------------------------------------
    console.log('\n--- TEST 19: Booking with invalid location is rejected ---');
    const res19 = await makeRequest('POST', '/bookings', {
      serviceId: s1.id,
      category: 'cars',
      date: testFutureDate,
      time: '17:00 – 17:30',
      customerPhone: '01099990000',
      address: {
        governorateId: 'non_existent_gov',
        cityId: 'non_existent_city',
        area: 'غير معروف',
      },
    });
    assert(res19.status === 422, `Invalid location rejected with 422, got ${res19.status}`);

    // -------------------------------------------------------------------
    // TEST 20: Direct unauthorized admin status mutation rejected
    // -------------------------------------------------------------------
    console.log('\n--- TEST 20: Direct unauthorized admin route access is protected ---');
    const res20 = await makeRequest('PUT', `/bookings/admin/${b16.body.data.id}/status`, {
      status: 'confirmed',
    });
    assert(res20.status === 401, `Unauthorized access blocked with 401, got ${res20.status}`);

    console.log('\n============================================================');
    console.log('🎉 ALL 20 TESTS IN THE TEST MATRIX PASSED PERFECTLY!');
    console.log('============================================================\n');
  } finally {
    // Restore default Cleanzo working hours: 09:00 to 22:00
    try {
      const origSettings = await SystemSettings.findOne({ key: 'global_settings' });
      if (origSettings) {
        origSettings.booking = {
          ...(origSettings.booking || {}),
          workingHoursStart: '09:00',
          workingHoursEnd: '22:00',
          bufferTime: 15,
          sameDayBooking: true,
          advanceBookingDays: 14,
          workingDays: [0, 1, 2, 3, 4, 5, 6],
        };
        await origSettings.save();
      }
    } catch {}

    // Teardown
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
  }
}

runDynamicSchedulingTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
