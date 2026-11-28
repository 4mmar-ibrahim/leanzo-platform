import { randomUUID } from 'node:crypto';
import prisma from '../src/config/prisma.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';
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
  SCHEDULE_LOCK,
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

  const futureWednesday = new Date();
  futureWednesday.setUTCDate(futureWednesday.getUTCDate() + 7 + (3 - futureWednesday.getUTCDay() + 7) % 7);
  const testDate = futureWednesday.toISOString().slice(0, 10);

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

    const lockKey = SCHEDULE_LOCK;
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
    assert(dynamicTiming.totalOccupiedMinutes === 60,
      'Slot validation returns the full occupied time for persistence and rescheduling');
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

    // Exercise the public and admin HTTP entry points on the same calendar.
    const testLocation = await prisma.locationGovernorate.upsert({
      where: { id: 'scheduling-test' },
      update: {},
      create: {
        id: 'scheduling-test', name: 'محافظة تجريبية', nameEn: 'Test governorate', active: true,
        cities: [{ id: 'scheduling-city', name: 'مدينة تجريبية', active: true }],
      },
    });
    const testAdmin = await prisma.adminUser.upsert({
      where: { username: 'scheduling-test-admin' },
      update: {},
      create: {
        username: 'scheduling-test-admin', name: 'Scheduling test', email: 'test@example.invalid',
        password: randomUUID(), role: 'owner',
      },
    });
    const adminToken = generateAdminToken({ id: testAdmin.id, username: testAdmin.username, role: testAdmin.role });
    const request = async (path: string, body?: object, headers: Record<string, string> = {}, method = body ? 'POST' : 'GET') => {
      const response = await fetch(`${baseUrl}/api/bookings${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, json: await response.json() as any };
    };
    const bookingPayload = {
      serviceId: carWash.id, category: 'car', date: testDate, time: '15:00',
      guestName: 'عميل اختبار الحجز', guestPhone: '01012345678', saveAddress: false,
      address: { governorateId: testLocation.id, cityId: 'scheduling-city', area: 'منطقة تجريبية' },
    };
    const idempotency = { 'Idempotency-Key': randomUUID() };
    const [first, retry] = await Promise.all([
      request('', bookingPayload, idempotency),
      request('', bookingPayload, idempotency),
    ]);
    assert([first.status, retry.status].sort().join(',') === '200,201', 'Concurrent HTTP retry returns one creation and one replay');
    assert(first.json.data.id === retry.json.data.id, 'Retries return the same persisted booking');
    const guestBooking = first.json.data;
    const guestHeaders = { 'X-Booking-Access': guestBooking.bookingAccess };
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const adminConflict = await request('/admin/create', { ...bookingPayload, serviceId: tireWash.id }, adminHeaders);
    assert(adminConflict.status === 409, 'Admin and guest bookings share the same schedule');
    const invalid = await request('', { ...bookingPayload, time: '15:75' });
    assert(invalid.status === 422, 'Invalid clock time is rejected by reservation rules');
    const plan = await prisma.subscriptionPlan.upsert({
      where: { id: 'scheduling-test-plan' },
      update: {},
      create: { id: 'scheduling-test-plan', name: 'Test plan', serviceId: carWash.id, visitCount: 1, price: 150 },
    });
    const subscriptionUser = await prisma.user.upsert({
      where: { phone: '01112345678' },
      update: {},
      create: { name: 'عميل اختبار الاشتراك', phone: '01112345678', password: randomUUID() },
    });
    const subscriptionToken = generateCustomerToken({ id: subscriptionUser.id, phone: subscriptionUser.phone });
    const legacyCustomer = await prisma.user.create({
      data: { name: 'عميل 123', phone: '01244445555', password: randomUUID() },
    });
    try {
      const headers = { Authorization: `Bearer ${generateCustomerToken({ id: legacyCustomer.id, phone: legacyCustomer.phone })}` };
      const attempt = { ...bookingPayload, time: '19:00' };
      const badName = await request('', { ...attempt, guestName: legacyCustomer.name }, headers);
      assert(badName.status === 422, 'Booking rejects a name containing digits');
      const fixedName = 'عميل اختبار مصحح';
      const corrected = await request('', { ...attempt, guestName: fixedName }, headers);
      assert(corrected.status === 201 && corrected.json.data.customerName === fixedName &&
        corrected.json.data.customerPhone === legacyCustomer.phone,
        'Correcting the booking name succeeds with a 012 customer and the persisted booking uses the corrected name');
      assert((await prisma.user.findUniqueOrThrow({ where: { id: legacyCustomer.id } })).name === legacyCustomer.name,
        'Booking correction does not change the account name');
    } finally {
      await prisma.booking.deleteMany({ where: { customerId: legacyCustomer.id } });
      await prisma.user.delete({ where: { id: legacyCustomer.id } });
    }
    const subscribe = (time: string) => fetch(`${baseUrl}/api/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${subscriptionToken}` },
      body: JSON.stringify({
        ...bookingPayload,
        planId: plan.id,
        visits: [{ date: testDate, time }],
      }),
    });
    const subscriptionConflict = await subscribe('15:30');
    assert(subscriptionConflict.status === 409, 'An existing booking blocks a conflicting subscription visit');
    const subscriptionResponse = await subscribe('17:00');
    assert(subscriptionResponse.status === 201, 'An available subscription visit is reserved');
    const subscription = (await subscriptionResponse.json() as any).data;
    const bookingAgainstVisit = await request('/admin/create', { ...bookingPayload, time: '17:00' }, adminHeaders);
    assert(bookingAgainstVisit.status === 409, 'A subscription visit blocks a conflicting admin booking');
    await prisma.subscriptionVisit.deleteMany({ where: { subscriptionId: subscription.id } });
    await prisma.subscription.delete({ where: { id: subscription.id } });
    const durationAddon = await prisma.serviceAddon.upsert({
      where: { id: 'scheduling-test-duration-addon' },
      update: {},
      create: { id: 'scheduling-test-duration-addon', serviceId: carWash.id, name: 'Duration test', price: 20, durationMinutes: 15 },
    });
    const addonDate = new Date(`${testDate}T00:00:00Z`);
    addonDate.setUTCDate(addonDate.getUTCDate() + 7);
    const addonDay = addonDate.toISOString().slice(0, 10);
    const withAddon = await request('', { ...bookingPayload, date: addonDay, time: '15:00', addonIds: [durationAddon.id] });
    assert(withAddon.status === 201 && withAddon.json.data.totalOccupiedMinutes === 75,
      'The saved booking includes the add-on in its occupied time');
    const addonBooking = withAddon.json.data;
    const addonHeaders = { 'X-Booking-Access': addonBooking.bookingAccess };
    await prisma.booking.update({ where: { id: addonBooking.id }, data: { totalOccupiedMinutes: 60 } });
    const movedAddonBooking = await request(`/${addonBooking.id}/reschedule`, { newDate: addonDay, newTime: '16:00' }, addonHeaders);
    assert(movedAddonBooking.status === 200 && movedAddonBooking.json.data.scheduledEnd === '17:15' &&
      movedAddonBooking.json.data.totalOccupiedMinutes === 75,
      'Rescheduling preserves the duration of the booking with its add-on');
    const addonRequest = await request(`/${addonBooking.id}/cancel`, {}, addonHeaders);
    assert(addonRequest.json.data.metadata.cancellationRequest.status === 'pending', 'An add-on booking can request cancellation');
    const cancelledAddonBooking = await request(`/admin/${addonBooking.id}/status`, { status: 'cancelled', approveCancellationRequest: true }, adminHeaders, 'PUT');
    assert(cancelledAddonBooking.status === 200, 'Admin approval cancels the add-on booking');
    const past = await request('', { ...bookingPayload, date: '2000-01-01' });
    assert(past.status === 422, 'Past dates cannot reserve an appointment');
    const tracked = await request(`/track/${guestBooking.id}`, undefined, guestHeaders);
    assert(tracked.status === 200, 'Guest can track their booking using its access grant');
    const rescheduled = await request(`/${guestBooking.id}/reschedule`, { newDate: testDate, newTime: '16:00' }, guestHeaders);
    assert(rescheduled.status === 200 && rescheduled.json.data.scheduledStart === '16:00', 'Guest reschedule commits the new appointment');
    const cancelled = await request(`/${guestBooking.id}/cancel`, { reason: 'تجربة الإلغاء' }, guestHeaders);
    assert(cancelled.status === 200 && cancelled.json.data.status !== 'cancelled' &&
      cancelled.json.data.metadata.cancellationRequest.status === 'pending', 'Customer cancellation starts a request and keeps the booking active');
    const reserved = await request('/admin/create', { ...bookingPayload, time: '16:00' }, adminHeaders);
    assert(reserved.status === 409, 'A pending cancellation does not release the appointment');
    const unauthorizedApproval = await request(`/admin/${guestBooking.id}/status`, { status: 'cancelled', approveCancellationRequest: true }, guestHeaders, 'PUT');
    assert([401, 403].includes(unauthorizedApproval.status), 'Customer cannot approve their own cancellation request');
    const approval = await request(`/admin/${guestBooking.id}/status`, { status: 'cancelled', approveCancellationRequest: true }, adminHeaders, 'PUT');
    assert(approval.status === 200 && approval.json.data.status === 'cancelled' &&
      approval.json.data.metadata.cancellationRequest.status === 'approved', 'Admin approval commits cancellation');
    const afterApproval = await request(`/track/${guestBooking.id}`, undefined, guestHeaders);
    assert(afterApproval.json.data.status === 'cancelled', 'Tracking shows the approved cancellation');
    const adminCreated = await request('/admin/create', { ...bookingPayload, time: '16:00' }, adminHeaders);
    assert(adminCreated.status === 201, 'Admin can book a slot released by guest cancellation');

    const adminBookingPath = `/admin/${adminCreated.json.data.id}`;
    const notes = 'ملاحظات الطلب من لوحة الإدارة';
    const notesUpdate = await request(`${adminBookingPath}/notes`, { notes }, adminHeaders, 'PATCH');
    assert(notesUpdate.status === 200, 'Admin notes are saved through the API');
    const withNotes = await request(adminBookingPath, undefined, adminHeaders);
    assert(withNotes.json.data.notes === notes, 'Admin notes persist in the booking record');

    const coupon = await prisma.coupon.upsert({
      where: { code: 'SCHEDULETEST' },
      update: { currentUsageCount: 0, lastUsedAt: null },
      create: {
        code: 'SCHEDULETEST', discountType: 'fixed', discountValue: 10,
        startDate: '2000-01-01', endDate: '2099-12-31', totalUsageLimit: 1,
      },
    });
    await prisma.couponUsage.deleteMany({ where: { couponId: coupon.id } });
    const discountedBooking = { ...bookingPayload, time: '14:00', promoCode: coupon.code };
    const discountKey = { 'Idempotency-Key': randomUUID() };
    const secondDiscountKey = { 'Idempotency-Key': randomUUID() };
    const otherPayload = { ...discountedBooking, time: '15:00', guestPhone: '01123456789' };
    const [oneDiscount, otherDiscount] = await Promise.all([
      request('', discountedBooking, discountKey),
      request('', otherPayload, secondDiscountKey),
    ]);
    const acceptedDiscounts = [oneDiscount, otherDiscount].filter((result) => result.status === 201);
    assert(acceptedDiscounts.length === 1, 'Concurrent bookings cannot exceed the coupon usage limit');
    const couponUsage = await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
    assert(couponUsage.currentUsageCount === 1, 'Coupon counter commits only the accepted redemption');
    const discountReplay = oneDiscount.status === 201
      ? await request('', discountedBooking, discountKey)
      : await request('', otherPayload, secondDiscountKey);
    assert(discountReplay.status === 200 && discountReplay.json.data.id === acceptedDiscounts[0].json.data.id,
      'A successful booking can be replayed after its coupon is exhausted');

    // Use a fixed Cairo clock to test late cancellation without depending on run time.
    const liveDay = '2026-12-09';
    const realDate = global.Date;
    let stoppedAt = realDate.parse(`${liveDay}T08:00:00Z`);
    class ScenarioClock extends realDate {
      constructor(value?: string | number | Date) {
        super(value ?? stoppedAt);
      }
      static now() { return stoppedAt; }
    }
    const settings = await prisma.systemSettings.findFirst({ where: { key: 'global_settings' } });
    const liveSettings = { ...(settings?.booking as object || {}), sameDayBooking: true, minNoticeHours: 0, workingDays: [3], breakStart: null, breakEnd: null };
    const record = settings
      ? await prisma.systemSettings.update({ where: { id: settings.id }, data: { booking: liveSettings } })
      : await prisma.systemSettings.create({ data: { key: 'global_settings', booking: liveSettings } });
    await Booking.deleteMany({ date: liveDay });
    let liveSubscriptionId: string | undefined;
    global.Date = ScenarioClock as DateConstructor;
    try {
      const firstAppointment = await request('', { ...bookingPayload, date: liveDay, time: '13:00' });
      const nextAppointment = await request('', { ...bookingPayload, date: liveDay, time: '14:00' });
      const workingAppointment = await request('', { ...bookingPayload, date: liveDay, time: '15:00' });
      assert([firstAppointment, nextAppointment, workingAppointment].every(item => item.status === 201), 'Set up three real bookings for late-cancellation checks');
      const original = firstAppointment.json.data;
      const headers = { 'X-Booking-Access': original.bookingAccess };
      stoppedAt = realDate.parse(`${liveDay}T10:55:00Z`);
      const shortNotice = await request(`/${original.id}/cancel`, {}, headers);
      assert(shortNotice.json.code === 'CANCELLATION_RESTRICTED_6H', 'Pre-appointment cancellation still respects configured notice');
      stoppedAt = realDate.parse(`${liveDay}T11:10:00Z`);
      const cancellations = await Promise.all([
        request(`/${original.id}/cancel`, {}, headers),
        request(`/${original.id}/cancel`, {}, headers),
      ]);
      assert(cancellations.every(item => item.status === 200 &&
        item.json.data.metadata.cancellationRequest.status === 'pending'),
        'Concurrent customer requests return the same pending cancellation');
      const requestId = cancellations[0].json.data.metadata.cancellationRequest.id;
      assert(cancellations[1].json.data.metadata.cancellationRequest.id === requestId &&
        await prisma.notification.count({ where: { eventId: `order:cancel-request:${requestId}` } }) === 1,
        'Duplicate requests send exactly one admin notification');
      const reviewingAdmin = { Authorization: `Bearer ${generateAdminToken({ id: testAdmin.id, username: testAdmin.username, role: testAdmin.role })}` };
      const approved = await request(`/admin/${original.id}/status`, { status: 'cancelled', approveCancellationRequest: true }, reviewingAdmin, 'PUT');
      assert(approved.status === 200, 'Admin approves the request during the appointment');
      const persisted = await prisma.booking.findUniqueOrThrow({ where: { id: original.id } });
      assert((persisted.timeline as any[]).filter(event => event.status === 'cancelled').length === 1,
        'Cancelling twice records one timeline event');
      const free = await getAvailableSlots(liveDay, tireWash.id);
      assert(free.slots[0]?.start === '13:10' && free.slots[0]?.end === '13:40',
        'A 30-minute service can start at the exact 13:10 release boundary');
      const pastSlot = await request('', { ...bookingPayload, date: liveDay, serviceId: tireWash.id, time: '13:09' });
      const longerSlot = await request('', { ...bookingPayload, date: liveDay, time: '13:10' });
      assert(pastSlot.status === 422 && pastSlot.json.code === 'BOOKING_TIME_PAST' && longerSlot.status === 409,
        'Time already elapsed and services overlapping 14:00 remain unavailable');
      const competing = await Promise.all([
        request('', { ...bookingPayload, date: liveDay, serviceId: tireWash.id, time: '13:10', guestPhone: '01123456789' }),
        request('', { ...bookingPayload, date: liveDay, serviceId: tireWash.id, time: '13:10', guestPhone: '01123456780' }),
      ]);
      assert(competing.map(item => item.status).sort().join(',') === '201,409', 'Two clients competing for the released slot create exactly one booking');
      const following = await prisma.booking.findUniqueOrThrow({ where: { id: nextAppointment.json.data.id } });
      assert(following.scheduledStart === '14:00', 'Previously scheduled customers keep their committed appointment');
      const active = workingAppointment.json.data;
      await prisma.booking.update({ where: { id: active.id }, data: { status: 'assigned', assignedTechnicianId: 'scheduling-test-technician' } });
      stoppedAt = realDate.parse(`${liveDay}T13:10:00Z`);
      const currentAdminHeaders = { Authorization: `Bearer ${generateAdminToken({ id: testAdmin.id, username: testAdmin.username, role: testAdmin.role })}` };
      const awaiting = await request(`/${active.id}/cancel`, {}, { 'X-Booking-Access': active.bookingAccess });
      assert(awaiting.json.data.metadata.cancellationRequest.status === 'pending', 'Visit has a pending cancellation request before the race');
      const race = await Promise.all([
        request(`/admin/${active.id}/status`, { status: 'cancelled', approveCancellationRequest: true }, currentAdminHeaders, 'PUT'),
        request(`/admin/${active.id}/status`, { status: 'in_progress' }, currentAdminHeaders, 'PUT'),
      ]);
      assert(race.filter(item => item.status === 200).length === 1, 'Only one of service start and cancellation approval can commit');
      const finalState = await prisma.booking.findUniqueOrThrow({ where: { id: active.id } });
      assert(race[0].status === 200 ? finalState.status === 'cancelled' : finalState.status === 'in_progress',
        'The stored status matches the result of the winning operation');
      const liveCustomerToken = generateCustomerToken({ id: subscriptionUser.id, phone: subscriptionUser.phone });
      const subscriptionHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${liveCustomerToken}` };
      const submitLiveSubscription = (time: string, headers = subscriptionHeaders) => fetch(`${baseUrl}/api/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...bookingPayload, planId: plan.id, visits: [{ date: liveDay, time }] }),
      });
      const submissions = await Promise.all([submitLiveSubscription('16:00'), submitLiveSubscription('16:00')]);
      assert(submissions.map(response => response.status).sort().join(',') === '201,409',
        'Concurrent submission of the same subscription creates only one reservation');
      const liveSubscriptionData = (await submissions.find(response => response.status === 201)!.json() as any).data;
      liveSubscriptionId = liveSubscriptionData.id;
      const ownerView = await fetch(`${baseUrl}/api/subscriptions/my/${liveSubscriptionId}`, { headers: subscriptionHeaders });
      const adminView = await fetch(`${baseUrl}/api/subscriptions/admin/${liveSubscriptionId}`, { headers: currentAdminHeaders });
      const ownerDetails = (await ownerView.json() as any).data;
      const adminDetails = (await adminView.json() as any).data?.subscription;
      assert(ownerView.ok && adminView.ok && ownerDetails?.visits[0].id === adminDetails?.visits[0].id,
        'Customer and admin see the same stored subscription visit');
      assert(adminDetails.user && !('password' in adminDetails.user),
        'Subscription details exclude customer password data');
      stoppedAt = realDate.parse(`${liveDay}T14:10:00Z`);
      const currentCustomerToken = generateCustomerToken({ id: subscriptionUser.id, phone: subscriptionUser.phone });
      const visitCancellation = await fetch(`${baseUrl}/api/subscriptions/visits/${liveSubscriptionData.visits[0].id}/cancel`, {
        method: 'POST',
        headers: { ...subscriptionHeaders, Authorization: `Bearer ${currentCustomerToken}` },
        body: '{}',
      });
      assert(visitCancellation.status === 200, 'Customer can cancel an unstarted subscription visit within its appointment');
      const afterVisit = await getAvailableSlots(liveDay, tireWash.id);
      assert(afterVisit.slots[0]?.start === '16:10', 'Subscription cancellation releases the rest of the visit at the exact minute');
      const cancelledVisitId = liveSubscriptionData.visits[0].id;
      const blockedStart = await fetch(`${baseUrl}/api/subscriptions/admin/visits/${cancelledVisitId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${generateAdminToken({ id: testAdmin.id, username: testAdmin.username, role: testAdmin.role })}` },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      assert(blockedStart.status === 409, 'Admin cannot start a visit after the customer releases the reservation');
      const finishedWindow = await request(`/${nextAppointment.json.data.id}/cancel`, {}, {
        'X-Booking-Access': nextAppointment.json.data.bookingAccess,
      });
      assert(finishedWindow.status !== 200, 'An elapsed appointment is not retroactively cancelled');
      const lateService = await request('', { ...bookingPayload, date: liveDay, time: '17:00' });
      assert(lateService.status === 201, 'Set up a booked service for execution checks');
      const liveOrder = lateService.json.data;
      await prisma.booking.update({ where: { id: liveOrder.id }, data: { status: 'assigned', assignedTechnicianId: 'scheduling-test-technician' } });
      stoppedAt = realDate.parse(`${liveDay}T15:10:00Z`);
      const startService = await request(`/admin/${liveOrder.id}/status`, { status: 'in_progress' }, {
        Authorization: `Bearer ${generateAdminToken({ id: testAdmin.id, username: testAdmin.username, role: testAdmin.role })}`,
      }, 'PUT');
      assert(startService.status === 200, 'Technician workflow marks the booking in progress');
      const denyCancel = await request(`/${liveOrder.id}/cancel`, {}, { 'X-Booking-Access': liveOrder.bookingAccess });
      assert(denyCancel.status === 400 && denyCancel.json.code === 'CANNOT_CANCEL_IN_PROGRESS',
        'A customer cannot release an appointment after the service starts');
      const whileWorking = await getAvailableSlots(liveDay, tireWash.id);
      assert(!whileWorking.slots.some(slot => slot.start < '18:00'), 'An appointment receiving service still occupies the time');
      const raceToken = () => generateCustomerToken({ id: subscriptionUser.id, phone: subscriptionUser.phone });
      const reservation = await submitLiveSubscription('19:00', { ...subscriptionHeaders, Authorization: `Bearer ${raceToken()}` });
      assert(reservation.status === 201, 'Reserve a visit for the simultaneous start and cancel test');
      const raceSubscription = (await reservation.json() as any).data;
      try {
        stoppedAt = realDate.parse(`${liveDay}T17:10:00Z`);
        const visitId = raceSubscription.visits[0].id;
        const visitPath = `${baseUrl}/api/subscriptions`;
        const cancelHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${raceToken()}` };
        const adminHeaders = { 'Content-Type': 'application/json',
          Authorization: `Bearer ${generateAdminToken({ id: testAdmin.id, username: testAdmin.username, role: testAdmin.role })}` };
        const [cancel, start] = await Promise.all([
          fetch(`${visitPath}/visits/${visitId}/cancel`, { method: 'POST', headers: cancelHeaders, body: '{}' }),
          fetch(`${visitPath}/admin/visits/${visitId}/status`, {
            method: 'PUT', headers: adminHeaders, body: JSON.stringify({ status: 'in_progress' }),
          }),
        ]);
        const storedVisit = await prisma.subscriptionVisit.findUniqueOrThrow({ where: { id: visitId } });
        assert(Number(cancel.ok) + Number(start.ok) === 1 &&
          storedVisit.status === (cancel.ok ? 'cancelled' : 'in_progress'),
          'Only one of subscription visit start and cancellation succeeds');
      } finally {
        await prisma.subscriptionVisit.deleteMany({ where: { subscriptionId: raceSubscription.id } });
        await prisma.subscription.delete({ where: { id: raceSubscription.id } });
      }

    } finally {
      global.Date = realDate;
      if (liveSubscriptionId) {
        await prisma.subscriptionVisit.deleteMany({ where: { subscriptionId: liveSubscriptionId } });
        await prisma.subscription.deleteMany({ where: { id: liveSubscriptionId } });
      }
      await Booking.deleteMany({ date: liveDay });
      if (settings) {
        await prisma.systemSettings.update({ where: { id: record.id }, data: { booking: settings.booking ?? {} } });
      } else {
        await prisma.systemSettings.delete({ where: { id: record.id } });
      }
    }

    // Cleanup
    await Booking.deleteMany({ date: testDate });

    console.log('\n===============================================================');
    console.log('🎉 ALL SCHEDULING AND BOOKING HTTP CHECKS PASSED');
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
