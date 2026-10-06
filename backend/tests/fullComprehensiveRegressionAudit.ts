/**
 * CLEANZO — FINAL FULL COMPREHENSIVE REGRESSION AUDIT SUITE
 * Covers Bugs 01 through 11 in an end-to-end integrated test.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import prisma from '../src/config/prisma.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { Technician } from '../src/models/Technician.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { generateAdminToken } from '../src/utils/jwt.js';
import { getServiceDisplayPrice, calculateItemizedPricing } from '../src/utils/pricingCalculator.js';
import { calculateBookingPrice } from '../src/services/bookingPriceService.js';
import { getAvailableSlots } from '../src/services/availabilityService.js';
import { isValidEgyptianPhone, normalizeEgyptianPhone } from '../src/utils/phoneValidator.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
    throw new Error(`Assertion failed: ${testName}`);
  }
  console.log(`  ✅ PASS: ${testName}`);
  passed++;
}

async function request(
  method: string,
  pathStr: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const finalPath = pathStr.startsWith('/api') ? pathStr : `/api${pathStr}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {};
    let data = '';

    if (body !== undefined) {
      data = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data).toString();
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, body: raw ? JSON.parse(raw) : {} });
        } catch {
          resolve({ status: res.statusCode || 500, body: raw });
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      resolve({ status: 500, body: { error: err.message } });
    });

    if (data) req.write(data);
    req.end();
  });
}

const AUDIT_DATE = '2026-10-15';

async function createAuditBooking(data: Partial<any>): Promise<any> {
  const id = data.id || `b_audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const time = data.time || data.timeSlot || '11:00-12:00';
  const parts = time.split(/[-–—]/).map((p: string) => p.trim());
  const scheduledStart = data.timeSlotStart || parts[0] || '11:00';
  const scheduledEnd = data.timeSlotEnd || parts[1] || parts[0] || '12:00';
  const [sH, sM] = scheduledStart.split(':').map(Number);
  const [eH, eM] = scheduledEnd.split(':').map(Number);
  const diffM = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
  const duration = data.totalOccupiedMinutes || (diffM > 0 ? diffM : 60);

  return await Booking.create({
    id,
    bookingNumber: data.orderNumber || data.bookingNumber || `CLN-AUDIT-${Date.now()}`,
    serviceId: data.serviceId || 'srv_test_car_wash',
    category: data.category || 'car',
    serviceSnapshot: {
      id: 'srv_test_car_wash',
      title: 'غسيل سيارات تجريبي',
      titleEn: 'Test Car Wash',
      category: 'car',
      price: data.basePrice || 220,
      duration: duration,
    },
    customerName: data.customerName || 'عميل تدقيق',
    customerPhone: data.customerPhone || '01011112222',
    date: data.date || AUDIT_DATE,
    time,
    timeSlotStart: scheduledStart,
    scheduledStart,
    scheduledEnd,
    status: data.status || 'confirmed',
    basePrice: data.basePrice || 220,
    totalPrice: data.totalPrice || 220,
    finalPrice: data.finalPrice || 187,
    discount: data.discount || 33,
    totalOccupiedMinutes: duration,
    serviceDurationMinutes: duration,
    address: {
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      street: 'شارع الثورة',
    },
    assignedTechnicianId: data.technicianId || null,
    technician: data.technicianId ? { id: data.technicianId, name: data.technicianName || 'الفني', phone: '01099112233' } : null,
  });
}

async function runAudit() {
  console.log('=============================================================');
  console.log('🔍 CLEANZO — COMPREHENSIVE FINAL REGRESSION AUDIT (BUGS 01–11)');
  console.log('=============================================================\n');

  await connectDB();
  server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as any).port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`🚀 Audit Server running on ${baseUrl}`);

  let admin = await AdminUser.findOne({ role: 'owner' });
  if (!admin) {
    admin = await AdminUser.create({
      name: 'Owner Admin',
      username: 'owner_audit',
      email: 'owner@cleanzo.test',
      phone: '01099998888',
      role: 'owner',
      permissions: ['*'],
      isActive: true,
    });
  }

  adminToken = generateAdminToken({
    id: admin._id ? admin._id.toString() : admin.id,
    username: admin.username || 'audit_admin',
    role: admin.role || 'owner',
  });

  // Ensure clean test technician
  const techId = `tech_audit_${Date.now()}`;
  const techEmad = await Technician.create({
    id: techId,
    name: 'عماد فني التدقيق',
    phone: '01011112222',
    status: 'available',
    specialty: 'غسيل وتلميع',
  });

  // -------------------------------------------------------------
  // PHASE 2: BUG 01 — RESERVATION DATE & TIME IN ORDER DETAILS
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 2: BUG 01] RESERVATION DATE & TIME IN ORDER DETAILS ---');
  const booking1 = await createAuditBooking({
    date: AUDIT_DATE,
    time: '11:00-12:00',
    timeSlotStart: '11:00',
    timeSlotEnd: '12:00',
    basePrice: 220,
    finalPrice: 187,
    discount: 33,
  });

  const b1Res = await request('GET', `/bookings/${booking1.id}`, undefined, adminToken);
  assert(b1Res.status === 200, 'Order details endpoint returns HTTP 200');
  const b1Data = b1Res.body.data || b1Res.body.booking || b1Res.body;
  assert(b1Data.date === AUDIT_DATE, `Reservation date strictly matches DB (${AUDIT_DATE})`);
  assert(
    b1Data.scheduledStart === '11:00' || b1Data.timeSlotStart === '11:00',
    'Reservation start time strictly matches DB (11:00)'
  );
  assert(
    b1Data.scheduledEnd === '12:00' || b1Data.timeSlotEnd === '12:00',
    'Reservation end time strictly matches DB (12:00)'
  );
  await prisma.booking.delete({ where: { id: booking1.id } });

  // -------------------------------------------------------------
  // PHASE 3: BUG 02 — PREVENT OVERLAPPING WORKER ASSIGNMENTS
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 3: BUG 02] PREVENT OVERLAPPING WORKER ASSIGNMENTS ---');
  const bookingA = await createAuditBooking({
    date: AUDIT_DATE,
    time: '11:00-12:00',
    technicianId: techEmad.id,
    technicianName: techEmad.name,
    status: 'assigned',
  });

  // Attempt Booking B (11:15–13:30) with same worker -> MUST BE REJECTED WITH 409
  const bookingB = await createAuditBooking({
    date: AUDIT_DATE,
    time: '11:15-13:30',
    status: 'confirmed',
  });

  const assignBRes = await request(
    'PUT',
    `/bookings/admin/${bookingB.id}/assign`,
    { technicianId: techEmad.id },
    adminToken
  );
  assert(
    assignBRes.status === 409,
    'Overlapping assignment (11:15–13:30 onto 11:00–12:00) is strictly blocked with HTTP 409'
  );

  // Attempt Booking C (10:00–11:00) -> MUST BE ALLOWED
  const bookingC = await createAuditBooking({
    date: AUDIT_DATE,
    time: '10:00-11:00',
    status: 'confirmed',
  });
  const assignCRes = await request(
    'PUT',
    `/bookings/admin/${bookingC.id}/assign`,
    { technicianId: techEmad.id },
    adminToken
  );
  assert(
    assignCRes.status === 200,
    'Back-to-back non-overlapping booking (10:00–11:00) is allowed with HTTP 200'
  );

  // Clean up overlap test bookings
  await prisma.booking.deleteMany({
    where: { id: { in: [bookingA.id, bookingB.id, bookingC.id] } },
  });

  // -------------------------------------------------------------
  // PHASE 4 & 11: BUG 03 & 10 — ORDER AMOUNT & DISCOUNT CONSISTENCY
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 4 & 11: BUG 03 & 10] AUTHORITATIVE PRICING & DISCOUNT ---');
  // Case A: 220 original price with 15% discount -> 187 EGP
  const display15 = getServiceDisplayPrice({
    id: 'srv-test-15',
    price: 220,
    originalPrice: null,
    discount: 15,
  });
  assert(display15.originalPrice === 220, 'Display original price is 220 EGP');
  assert(display15.discountAmount === 33, '15% discount on 220 is exactly 33 EGP');
  assert(display15.sellingPrice === 187, 'Final payable price is exactly 187 EGP (220 - 33)');

  // Case B: 260 MSRP with 220 sale price -> 220 EGP (NO DOUBLE DISCOUNTING TO 187!)
  const displayMsrp = getServiceDisplayPrice({
    id: 'srv-test-msrp',
    price: 220,
    originalPrice: 260,
    discount: 15,
  });
  assert(displayMsrp.originalPrice === 260, 'MSRP original price is 260 EGP');
  assert(displayMsrp.discountAmount === 40, 'Direct catalog discount is 40 EGP (260 - 220)');
  assert(displayMsrp.sellingPrice === 220, 'Final price stays 220 EGP without double discounting');

  // Case C: Server-side pricing calculation via calculateBookingPrice
  const testSrvId = `srv-audit-price-${Date.now()}`;
  await Service.create({
    id: testSrvId,
    category: 'car',
    title: 'خدمة تدقيق السعر',
    titleEn: 'Price Audit Service',
    price: 220,
    originalPrice: null,
    discount: 15,
    available: true,
    duration: 60,
    image: '/images/car-wash.jpg',
  });

  const serverCalc = await calculateBookingPrice(testSrvId);
  assert(serverCalc.basePrice === 220, 'Backend calculateBookingPrice basePrice is 220');
  assert(serverCalc.catalogDiscount === 33, 'Backend calculateBookingPrice catalogDiscount is 33');
  assert(serverCalc.finalPrice === 187, 'Backend calculateBookingPrice finalPrice is 187');

  // Case D: Client price tampering rejection in POST /bookings
  let gov = await LocationGovernorate.findOne({ active: true });
  if (!gov) {
    gov = await LocationGovernorate.create({
      id: `gov-test-${Date.now()}`,
      name: 'القاهرة',
      nameEn: 'Cairo',
      active: true,
      cities: [
        {
          id: 'city-nasr',
          name: 'مدينة نصر',
          nameEn: 'Nasr City',
          active: true,
          areas: [{ id: 'area-1', name: 'الحي السابع', nameEn: '7th District', active: true }],
        },
      ],
    });
  }
  const validCity = gov.cities?.[0]?.name || 'مدينة نصر';
  const validArea = (gov.cities?.[0] as any)?.areas?.[0]?.name || 'الحي السابع';

  const tamperedBookingRes = await request('POST', '/bookings', {
    serviceId: testSrvId,
    category: 'car',
    date: AUDIT_DATE,
    time: '14:00',
    timeSlotStart: '14:00',
    timeSlotEnd: '15:00',
    customerName: 'عميل تلاعب',
    customerPhone: '01099881122',
    address: {
      governorate: gov.name,
      city: validCity,
      area: validArea,
      building: '10',
      street: 'شارع الثورة',
    },
    basePrice: 1,      // Manipulated!
    finalPrice: 1,     // Manipulated!
    totalPrice: 1,     // Manipulated!
    discount: 9999,    // Manipulated!
  });
  if (tamperedBookingRes.status !== 201) {
    console.error('Tampered booking response error:', tamperedBookingRes.body);
  }
  assert(
    tamperedBookingRes.status === 201,
    'Tampered booking creation request accepted and sanitized'
  );
  const createdBooking = tamperedBookingRes.body.data || tamperedBookingRes.body.booking || tamperedBookingRes.body;
  assert(
    createdBooking.finalPrice === 187,
    'Backend strictly rejected manipulated client finalPrice of 1 and computed authoritative 187'
  );
  if (createdBooking.id) {
    await prisma.booking.delete({ where: { id: createdBooking.id } }).catch(() => {});
  }
  await prisma.service.deleteMany({ where: { id: testSrvId } });

  // -------------------------------------------------------------
  // PHASE 5: BUG 04 — ADMIN CUSTOMER DATA PERSISTENCE
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 5: BUG 04] ADMIN CUSTOMER DATA PERSISTENCE ---');
  const QA_PHONE = '01088776655';
  await prisma.user.deleteMany({ where: { phone: QA_PHONE } });

  const createCustRes = await request(
    'POST',
    '/customers',
    {
      name: 'عميل اختبار الاستمرارية الكامل',
      phone: QA_PHONE,
      email: 'persistence.qa@cleanzo.com',
      source: 'instagram',
      discount: 10,
      tags: ['vip', 'residential'],
      notes: [{ id: 'n-1', text: 'ملاحظة خاصة بالعميل', createdAt: new Date().toISOString() }],
    },
    adminToken
  );
  assert(createCustRes.status === 201, 'Create customer with all fields returns HTTP 201');
  const custInDb = await prisma.user.findUnique({ where: { phone: QA_PHONE } });
  assert(custInDb !== null, 'Customer persisted in PostgreSQL database');
  assert(custInDb?.source === 'instagram', 'Acquisition source "instagram" persisted in DB');
  assert(custInDb?.discount === 10, 'Customer discount (10%) persisted in DB');
  assert(Boolean(custInDb?.tags?.includes('vip')), 'Customer tag "vip" persisted in DB');

  // Verify profile retrieval
  const profileRes = await request('GET', `/customers/${custInDb?.id}`, undefined, adminToken);
  assert(profileRes.status === 200, 'Customer profile endpoint returns HTTP 200');
  const profileData = profileRes.body.data?.customer || profileRes.body.customer || profileRes.body.data || profileRes.body;
  assert(profileData.email === 'persistence.qa@cleanzo.com', 'Email retained in customer profile');

  // Modify one field and verify update
  const updateCustRes = await request(
    'PUT',
    `/customers/${custInDb?.id}`,
    { name: 'عميل اختبار الاستمرارية (معدل)' },
    adminToken
  );
  assert(updateCustRes.status === 200, 'Customer update returns HTTP 200');
  const updatedInDb = await prisma.user.findUnique({ where: { id: custInDb?.id } });
  assert(
    updatedInDb?.name === 'عميل اختبار الاستمرارية (معدل)',
    'Updated name successfully verified in DB'
  );
  await prisma.user.delete({ where: { id: custInDb?.id } });

  // -------------------------------------------------------------
  // PHASE 6: BUG 05 — MISSING BOOKING SLOT AVAILABILITY
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 6: BUG 05] MISSING BOOKING SLOT ENGINE ---');
  const testServiceSlot = await Service.create({
    id: `srv-slot-${Date.now()}`,
    title: 'غسيل 45 دقيقة مع تنقل 15 دقيقة',
    titleEn: 'Wash 45m + Transit 15m',
    category: 'car',
    price: 220,
    duration: 45,
    serviceDurationMinutes: 45,
    travelTimeMinutes: 15,
    active: true,
    available: true,
    image: '/images/car-wash.jpg',
  });

  const slotDate = '2026-10-25';
  await Booking.deleteMany({ date: slotDate });

  const freeDayRes = await getAvailableSlots(slotDate, testServiceSlot.id);
  assert(freeDayRes.isDayAvailable === true, 'Test date is marked available');
  const slotTimes = freeDayRes.slots.map((s) => s.time);
  assert(slotTimes.includes('10:00 – 11:00'), '10:00 – 11:00 slot appears on free day');
  assert(slotTimes.includes('11:00 – 12:00'), '11:00 – 12:00 slot appears on free day');
  assert(slotTimes.includes('12:00 – 13:00'), '12:00 – 13:00 slot appears on free day');

  // Fully occupy 11:00–12:00 capacity
  const occBooking = await createAuditBooking({
    date: slotDate,
    time: '11:00 - 12:00',
    timeSlotStart: '11:00',
    timeSlotEnd: '12:00',
    serviceId: testServiceSlot.id,
    status: 'confirmed',
  });

  const occRes = await getAvailableSlots(slotDate, testServiceSlot.id);
  const slot11 = occRes.slots.find((s) => s.time === '11:00 – 12:00');
  assert(slot11 !== undefined && slot11.available === false, 'Occupied 11:00–12:00 slot is marked unavailable');

  // Release capacity
  await prisma.booking.delete({ where: { id: occBooking.id } });
  const releasedRes = await getAvailableSlots(slotDate, testServiceSlot.id);
  const slot11Released = releasedRes.slots.find((s) => s.time === '11:00 – 12:00');
  assert(slot11Released !== undefined && slot11Released.available === true, 'Released 11:00–12:00 slot becomes available again');
  await prisma.service.deleteMany({ where: { id: testServiceSlot.id } });

  // -------------------------------------------------------------
  // PHASE 7: BUG 06 — PHONE INPUT DISPLAY & NORMALIZATION
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 7: BUG 06] PHONE INPUT NORMALIZATION ---');
  const arabicDigitsPhone = '٠١٠١٢٣٤٥٦٧٨';
  const normalizedPhone = normalizeEgyptianPhone(arabicDigitsPhone);
  assert(normalizedPhone === '01012345678', 'Eastern Arabic digits ٠١٠١٢٣٤٥٦٧٨ normalize to 01012345678');
  assert(normalizedPhone.startsWith('0'), 'Leading zero is strictly preserved');
  assert(isValidEgyptianPhone('01012345678') === true, '01012345678 passes Egyptian phone validation');

  // -------------------------------------------------------------
  // PHASE 8: BUG 07 — ADMIN BOOKING CALENDAR RANGE MAPPING
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 8: BUG 07] ADMIN BOOKING CALENDAR ---');
  const calBooking = await createAuditBooking({
    date: '2026-10-03',
    time: '11:00-12:00',
    status: 'confirmed',
  });

  const adminOrdersRes = await request(
    'GET',
    '/bookings/admin/all?limit=100&sortBy=date&sortOrder=asc',
    undefined,
    adminToken
  );
  assert(adminOrdersRes.status === 200, 'Admin orders endpoint for calendar returns HTTP 200');
  const ordersList = adminOrdersRes.body.data?.bookings || adminOrdersRes.body.bookings || [];
  const foundInCal = ordersList.some((o: any) => o.id === calBooking.id || o.bookingNumber === calBooking.bookingNumber);
  assert(foundInCal === true, 'October 2026 booking retrieved in calendar orders dataset');
  await prisma.booking.delete({ where: { id: calBooking.id } });

  // -------------------------------------------------------------
  // PHASE 9: BUG 08 — STATUS BANNER & ORDER TIMELINE SYNC
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 9: BUG 08] STATUS BANNER & TIMELINE SYNCHRONIZATION ---');
  const trackBooking = await createAuditBooking({
    date: AUDIT_DATE,
    time: '15:00-16:00',
    status: 'assigned',
    technicianId: techEmad.id,
    technicianName: techEmad.name,
  });

  const trackingNum = trackBooking.id;

  // Verify transition: assigned -> on_the_way
  await request(
    'PUT',
    `/bookings/admin/${trackBooking.id}/status`,
    { status: 'on_the_way' },
    adminToken
  );
  const trackRes1 = await request(
    'GET',
    `/bookings/track/${trackingNum}?phone=01011112222`
  );
  assert(trackRes1.status === 200, 'Public tracking endpoint returns HTTP 200');
  const trackData1 = trackRes1.body.data || trackRes1.body.booking || trackRes1.body;
  assert(
    trackData1.status === 'on_the_way',
    'Tracking status synchronously reflects "on_the_way"'
  );

  // Verify transition: on_the_way -> in_progress
  await request(
    'PUT',
    `/bookings/admin/${trackBooking.id}/status`,
    { status: 'in_progress' },
    adminToken
  );
  const trackRes2 = await request(
    'GET',
    `/bookings/track/${trackingNum}?phone=01011112222`
  );
  const trackData2 = trackRes2.body.data || trackRes2.body.booking || trackRes2.body;
  assert(
    trackData2.status === 'in_progress',
    'Tracking status synchronously reflects "in_progress"'
  );

  // Verify transition: in_progress -> completed
  await request(
    'PUT',
    `/bookings/admin/${trackBooking.id}/status`,
    { status: 'completed' },
    adminToken
  );
  const trackRes3 = await request(
    'GET',
    `/bookings/track/${trackingNum}?phone=01011112222`
  );
  const trackData3 = trackRes3.body.data || trackRes3.body.booking || trackRes3.body;
  assert(
    trackData3.status === 'completed',
    'Tracking status synchronously reflects "completed"'
  );
  await prisma.booking.delete({ where: { id: trackBooking.id } });

  // -------------------------------------------------------------
  // PHASE 10: BUG 09 — WORKER PHONE VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 10: BUG 09] WORKER PHONE VALIDATION ---');
  const invalidWorkerRes = await request(
    'POST',
    '/technicians',
    {
      name: 'فني غير صالح',
      phone: '01612345678', // Invalid Egyptian mobile prefix!
      city: 'القاهرة',
    },
    adminToken
  );
  assert(
    invalidWorkerRes.status === 400,
    'Backend strictly rejects invalid worker phone 01612345678 with HTTP 400'
  );

  const invalidShortRes = await request(
    'POST',
    '/technicians',
    {
      name: 'فني قصير',
      phone: '011223', // Invalid length!
      city: 'القاهرة',
    },
    adminToken
  );
  assert(
    invalidShortRes.status === 400,
    'Backend strictly rejects invalid worker phone 011223 with HTTP 400'
  );

  const validWorkerRes = await request(
    'POST',
    '/technicians',
    {
      name: 'فني صالح للاختبار',
      phone: '01198765432', // Valid Egyptian mobile!
      city: 'القاهرة',
    },
    adminToken
  );
  assert(
    validWorkerRes.status === 201,
    'Backend accepts valid worker phone 01198765432 with HTTP 201'
  );
  const createdTech = validWorkerRes.body.data || validWorkerRes.body.technician;
  if (createdTech?.id) {
    await prisma.technician.delete({ where: { id: createdTech.id } });
  }

  // -------------------------------------------------------------
  // PHASE 12: BUG 11 — ZO MASCOT ARTWORK & CLICK INTERACTION
  // -------------------------------------------------------------
  console.log('\n--- [PHASE 12: BUG 11] ZO MASCOT ARTWORK INTEGRITY ---');
  const zoPublishedRes = await request('GET', '/zo/published');
  assert(zoPublishedRes.status === 200, 'GET /api/zo/published returns HTTP 200');

  // Verify that zo approved file exists on disk
  const zoAssetPath = path.resolve('../public/brand/zo/zo-approved.png');
  const zoAssetExists = fs.existsSync(zoAssetPath);
  assert(zoAssetExists === true, 'Approved Zo asset exists at /public/brand/zo/zo-approved.png');

  if (zoAssetExists) {
    const buf = fs.readFileSync(zoAssetPath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert(width === 712 && height === 1000, `Zo asset dimensions are exactly 712x1000 (aspect ratio: ${width}/${height})`);
  }

  // Clean up test technician
  await prisma.technician.deleteMany({ where: { id: techEmad.id } });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=============================================================');
  console.log(`🏁 AUDIT RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (server) server.close();
  await disconnectDB();

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(async (err) => {
  console.error('Fatal audit error:', err);
  if (server) server.close();
  await disconnectDB();
  process.exit(1);
});
