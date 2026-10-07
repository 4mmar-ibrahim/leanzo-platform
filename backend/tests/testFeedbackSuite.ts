import { PrismaClient } from '@prisma/client';
import { formatSingleTimeTo12Hour, parseTimeToMinutes } from '../src/utils/timeFormat';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function runFeedbackVerification() {
  console.log('====================================================');
  console.log('CLEANZO BOOKING SYSTEM FEEDBACK VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      console.error(`[FAIL] ${testName}`, detail !== undefined ? detail : '');
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. TIME FORMAT 12-HOUR FORMAT AUDIT
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: 12-Hour Format Conversions ---');
  const timeEdgeCases: Array<[string, string]> = [
    ['00:00', '12:00 AM'],
    ['00:30', '12:30 AM'],
    ['01:00', '1:00 AM'],
    ['11:59', '11:59 AM'],
    ['12:00', '12:00 PM'],
    ['12:30', '12:30 PM'],
    ['13:00', '1:00 PM'],
    ['18:00', '6:00 PM'],
    ['20:15', '8:15 PM'],
    ['22:30', '10:30 PM'],
    ['23:59', '11:59 PM'],
  ];

  for (const [input24, expected12] of timeEdgeCases) {
    const formatted = formatSingleTimeTo12Hour(input24);
    assert(formatted === expected12, `Convert ${input24} -> ${expected12} (got: ${formatted})`);
  }

  // Check that 6:00 PM is NOT parsed as 6:00 AM
  const pmMinutes = parseTimeToMinutes('6:00 PM');
  const amMinutes = parseTimeToMinutes('6:00 AM');
  assert(pmMinutes === 1080, `6:00 PM is 1080 minutes (got ${pmMinutes})`);
  assert(amMinutes === 360, `6:00 AM is 360 minutes (got ${amMinutes})`);
  assert(pmMinutes !== amMinutes, '6:00 PM is strictly distinct from 6:00 AM');

  // -------------------------------------------------------------------------
  // 2. OFFICIAL HOLIDAYS ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Official Holidays Backend Enforcement ---');
  const holidayDate = '2026-11-20';
  const holidayName = 'عطلة رسمية تجريبية لاختبار الحظر';

  // Update SystemSettings in PostgreSQL with this holiday
  const settingsDoc = await prisma.systemSettings.findFirst({ where: { key: 'global_settings' } });
  const currentBooking = (settingsDoc?.booking as any) || {};
  const currentHolidays = Array.isArray(currentBooking.holidays) ? currentBooking.holidays : [];
  const updatedHolidays = [
    ...currentHolidays.filter((h: any) => h.date !== holidayDate),
    { date: holidayDate, name: holidayName },
  ];

  if (settingsDoc) {
    await prisma.systemSettings.update({
      where: { id: settingsDoc.id },
      data: {
        booking: {
          ...currentBooking,
          holidays: updatedHolidays,
        },
      },
    });
  }

  // 2a. Check availability for holidayDate
  const availRes = await fetch(`${API_URL}/availability?date=${holidayDate}&serviceId=srv-house-clean`);
  const availData: any = await availRes.json();
  const dayInfo = availData.data || availData;
  assert(dayInfo.isDayAvailable === false, 'Holiday date reports isDayAvailable = false');
  assert(Array.isArray(dayInfo.slots) && dayInfo.slots.length === 0, 'Holiday date returns 0 slots');

  // 2b. Direct booking attempt on holidayDate MUST fail with 400 OFFICIAL_HOLIDAY
  const holidayBookingRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: 'srv-house-clean',
      category: 'home',
      date: holidayDate,
      time: '18:00',
      guestName: 'أحمد محمود التست',
      guestPhone: '01012345678',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة',
        area: 'وسط البلد',
        street: 'شارع 9',
        label: 'المنزل',
      },
    }),
  });

  const holidayJson: any = await holidayBookingRes.json();
  assert(holidayBookingRes.status === 400, 'Direct booking on holiday returns HTTP 400');
  assert(
    holidayJson.code === 'OFFICIAL_HOLIDAY' ||
    (holidayJson.error && holidayJson.error.includes('عطلة رسمية')) ||
    (holidayJson.message && holidayJson.message.includes('عطلة رسمية')),
    'Rejection code or message strictly identifies official holiday',
    holidayJson
  );

  // -------------------------------------------------------------------------
  // 3. EXACT USER SCENARIO: MULTI-SERVICE BOOKING
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Exact User Scenario Multi-Service Booking ---');
  console.log('Customer selects: 1. تنظيف البيت | 2. تنظيف السيارة | 3. إزالة الدهون');

  const s1 = await prisma.service.findUnique({ where: { id: 'srv-house-clean' } });
  const s2 = await prisma.service.findUnique({ where: { id: 'srv-car-clean' } });
  const s3 = await prisma.service.findUnique({ where: { id: 'srv-grease-remove' } });

  assert(!!s1 && s1.title === 'تنظيف البيت', 'Service 1 (تنظيف البيت) exists in PostgreSQL');
  assert(!!s2 && s2.title === 'تنظيف السيارة', 'Service 2 (تنظيف السيارة) exists in PostgreSQL');
  assert(!!s3 && s3.title === 'إزالة الدهون', 'Service 3 (إزالة الدهون) exists in PostgreSQL');

  const expectedBase = Number(s1!.price) + Number(s2!.price) + Number(s3!.price); // 300 + 200 + 150 = 650
  const expectedDuration = Number(s1!.duration) + Number(s2!.duration) + Number(s3!.duration); // 60 + 45 + 30 = 135

  // 3a. Calculate Price for the 3 services together
  const calcRes = await fetch(`${API_URL}/bookings/calculate-price`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: s1!.id,
      services: [
        { serviceId: s1!.id },
        { serviceId: s2!.id },
        { serviceId: s3!.id },
      ],
    }),
  });
  const calcData: any = await calcRes.json();
  assert(calcData.success === true, 'Price calculation succeeds for multi-service payload');
  const pricingData = calcData.data || calcData.pricing || calcData;
  assert(pricingData.baseSellingPrice === expectedBase, `Subtotal is exact sum of services: ${expectedBase} EGP (got ${pricingData.baseSellingPrice})`);
  assert(pricingData.totalServiceDuration === expectedDuration, `Total duration is exact sum of durations: ${expectedDuration} min (got ${pricingData.totalServiceDuration})`);
  assert(pricingData.items.length === 3, 'Pricing breakdown includes all 3 separate services');

  // 3b. Create Multi-Service Booking on a valid working day with an available slot
  const validBookingDate = '2026-11-25';
  const validBookingTime = '10:00 AM'; // 10:00 AM
  await prisma.booking.deleteMany({ where: { date: validBookingDate } });

  const bookingRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: s1!.id,
      services: [
        { serviceId: s1!.id },
        { serviceId: s2!.id },
        { serviceId: s3!.id },
      ],
      category: 'home',
      date: validBookingDate,
      time: validBookingTime,
      guestName: 'محمد عبد الله مصطفى',
      guestPhone: '01098765432',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة',
        area: 'وسط البلد',
        street: 'شارع حسن المأمون',
        building: '15',
        floor: '4',
        apartment: '402',
        label: 'المنزل الرئيسي',
      },
      notes: 'يرجى إحضار ماكينة البخار الخاصة بإزالة الدهون وتجهيزات غسيل السيارة',
    }),
  });

  const bookingData: any = await bookingRes.json();
  assert(bookingRes.status === 201, 'Multi-service booking creation returns HTTP 201');
  const createdBooking = bookingData.data?.booking || bookingData.data || bookingData.booking;
  assert(!!createdBooking && !!createdBooking.id, `Booking ID generated: ${createdBooking?.id}`);
  const actualPrice = Number(createdBooking.finalPrice ?? createdBooking.totalPrice ?? createdBooking.basePrice);
  assert(actualPrice === expectedBase, `Booking total price is authoritative: ${expectedBase} EGP (got ${actualPrice})`);

  // 3c. Inspect PostgreSQL row directly
  const dbBooking = await prisma.booking.findUnique({
    where: { id: createdBooking.id },
  });
  assert(!!dbBooking, 'Booking record exists in PostgreSQL database');
  const snapshot: any = dbBooking?.serviceSnapshot;
  assert(!!snapshot, 'Service snapshot stored in PostgreSQL');
  assert(Array.isArray(snapshot.services) && snapshot.services.length === 3, 'Service snapshot contains all 3 itemized services');
  assert(snapshot.services[0].title === 'تنظيف البيت', 'Snapshot Service 1 title is correct');
  assert(snapshot.services[1].title === 'تنظيف السيارة', 'Snapshot Service 2 title is correct');
  assert(snapshot.services[2].title === 'إزالة الدهون', 'Snapshot Service 3 title is correct');

  // Verify Address preservation in DB
  const dbAddress: any = dbBooking?.address;
  assert(dbAddress.city === 'القاهرة' && dbAddress.building === '15', 'Full address persisted accurately without data loss');

  // Clean up test booking to keep database pristine
  await prisma.booking.delete({ where: { id: createdBooking.id } });
  console.log(`[CLEANUP] Deleted test booking #${createdBooking.id}`);

  console.log('\n====================================================');
  console.log(`ALL VERIFICATION TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================\n');
}

runFeedbackVerification()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
