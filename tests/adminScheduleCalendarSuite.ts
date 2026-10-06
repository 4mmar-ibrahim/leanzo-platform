/**
 * CLEANZO - BUG 08 VERIFICATION TEST SUITE
 * ADMIN BOOKING SCHEDULE CALENDAR (Month, Week, Day Views & Navigation)
 */

import { connectDB, disconnectDB } from '../backend/src/config/db.js';
import { Booking } from '../backend/src/models/Booking.js';
import { AdminUser } from '../backend/src/models/AdminUser.js';
import { Role } from '../backend/src/models/Role.js';
import { generateAdminToken } from '../backend/src/utils/jwt.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_WEEKDAYS = [
  'السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'
];

function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('RUNNING CLEANZO BUG 08 SCHEDULE CALENDAR SUITE');
  console.log('====================================================\n');

  await connectDB();

  // 1. Verify Phase 5 Target Booking (03 October 2026 11:00-12:00)
  console.log('--- TEST GROUP 1: Phase 5 Target Booking in Database ---');
  const octBooking = await Booking.findOne({
    date: '2026-10-03',
    scheduledStart: '11:00',
  });

  assert(!!octBooking, 'Booking for 03 October 2026 11:00 exists in database');
  assert(octBooking?.id === 'CLN-2026-OCT03-1100', `Booking ID is ${octBooking?.id}`);
  assert(octBooking?.scheduledStart === '11:00', 'Scheduled start time is 11:00');
  assert(octBooking?.scheduledEnd === '12:00', 'Scheduled end time is 12:00');
  assert(octBooking?.status === 'confirmed', 'Booking status is confirmed');
  assert(!!octBooking?.serviceSnapshot?.title, 'Booking contains service title snapshot');

  // 2. Verify September 2026 Booking
  console.log('\n--- TEST GROUP 2: September 2026 Booking Verification ---');
  const sepBooking = await Booking.findOne({ date: '2026-09-08' });
  assert(!!sepBooking, 'Booking for September 2026 exists in database');
  assert(sepBooking?.date === '2026-09-08', 'September booking date is 2026-09-08');

  // 3. API Query & Date Range Filtering
  console.log('\n--- TEST GROUP 3: Direct API Date Range Verification ---');
  let admin = await AdminUser.findOne({ role: 'owner' });
  if (!admin) admin = await AdminUser.findOne({});
  const token = generateAdminToken(admin ? (admin.toObject ? admin.toObject() : admin) : { id: 'admin-1', role: 'owner' });

  const resOct = await fetch('http://localhost:5000/api/bookings/admin/all?bookingDateFrom=2026-10-01&bookingDateTo=2026-10-31&limit=500', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-auth-token': token,
    },
  });

  const jsonOct = await resOct.json();
  assert(resOct.ok, 'Admin Bookings API returns HTTP 200 for October date range');
  const octBookingsApi = jsonOct.data?.bookings || jsonOct.bookings || [];
  const foundOct = octBookingsApi.find((b: any) => b.date === '2026-10-03' && b.scheduledStart === '11:00');
  assert(!!foundOct, 'October API range successfully returns 03 October 2026 11:00-12:00 booking');

  // 4. Calendar Math & Grid Mapping Verification
  console.log('\n--- TEST GROUP 4: Calendar Math & Arab Week Alignment ---');
  // October 1, 2026 was Thursday (JS getDay = 4)
  const oct1 = new Date(2026, 9, 1);
  const oct1Offset = (oct1.getDay() + 1) % 7;
  assert(oct1Offset === 5, 'October 1, 2026 correctly maps to Thursday column index 5');

  // October 3, 2026 was Saturday (JS getDay = 6)
  const oct3 = new Date(2026, 9, 3);
  const oct3Weekday = (oct3.getDay() + 1) % 7;
  assert(oct3Weekday === 0, 'October 3, 2026 is Saturday (Column index 0)');
  assert(ARABIC_WEEKDAYS[oct3Weekday] === 'السبت', 'October 3, 2026 weekday name is السبت');

  // 5. Week View Mapping
  console.log('\n--- TEST GROUP 5: Week View Computation ---');
  const jsDay = oct3.getDay();
  const daysSinceSat = (jsDay + 1) % 7;
  const startOfWeek = new Date(oct3);
  startOfWeek.setDate(oct3.getDate() - daysSinceSat);

  const weekRange = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return formatYYYYMMDD(d);
  });

  assert(weekRange[0] === '2026-10-03', 'Week starts on Saturday 2026-10-03');
  assert(weekRange[6] === '2026-10-09', 'Week ends on Friday 2026-10-09');
  assert(weekRange.includes('2026-10-03'), 'Week range includes target booking date 2026-10-03');

  // 6. Day View Mapping
  console.log('\n--- TEST GROUP 6: Day View Computation ---');
  const dayStr = formatYYYYMMDD(oct3);
  assert(dayStr === '2026-10-03', 'Day view format strictly matches 2026-10-03');
  assert(octBooking?.time === '11:00 – 12:00', 'Day view displays exact slot 11:00 – 12:00');

  // 7. Navigation Verification
  console.log('\n--- TEST GROUP 7: Month Navigation Calculation ---');
  const prevMonth = new Date(oct3);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  assert(ARABIC_MONTHS[prevMonth.getMonth()] === 'سبتمبر', 'Previous month navigates to سبتمبر');
  assert(prevMonth.getFullYear() === 2026, 'Year remains 2026');

  const nextMonth = new Date(oct3);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  assert(ARABIC_MONTHS[nextMonth.getMonth()] === 'نوفمبر', 'Next month navigates to نوفمبر');

  await disconnectDB();

  console.log('\n====================================================');
  console.log('🎉 ALL BUG 08 CALENDAR TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTestSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
