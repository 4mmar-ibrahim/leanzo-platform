import '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import prisma from '../src/config/prisma.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import { CMSContent } from '../src/models/CMSContent.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';
import {
  getAvailableSlots,
  assertSlotAvailability,
  getCairoDayOfWeek,
  getCurrentCairoDateString,
  timeStringToMinutes,
  minutesToTimeString,
} from '../src/services/availabilityService.js';
import { formatWorkingHoursText } from '../src/controllers/settingsController.js';

let server: http.Server;
let baseUrl: string;

function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

async function runSuite() {
  console.log('\n====================================================================');
  console.log('🧪 AUTHORITATIVE WORKING HOURS, TIMEZONE & AVAILABILITY SUITE');
  console.log('====================================================================\n');

  await connectDB();
  await startServer();

  // Ensure test location & service exist
  await LocationGovernorate.deleteMany({ id: { $in: ['test-gov-hours'] } });
  await LocationGovernorate.create({
    id: 'test-gov-hours',
    name: 'محافظة الساعات التجريبية',
    nameEn: 'Hours Test Gov',
    active: true,
    cities: [
      { id: 'test-city-hours', name: 'مدينة الساعات', nameEn: 'Hours City', active: true, priceMultiplier: 1.0 },
    ],
  });

  const testServiceId = 'test-srv-hours-45';
  await Service.deleteMany({ id: testServiceId });
  await Service.create({
    id: testServiceId,
    title: 'خدمة الغسيل السريع 45 دقيقة',
    titleEn: 'Quick Wash 45 Min',
    category: 'car',
    price: 300,
    duration: 45,
    serviceDurationMinutes: 45,
    travelTimeMinutes: 0,
    totalOccupiedMinutes: 45,
    active: true,
    available: true,
    image: '/services/test.jpg',
  });

  const testLongServiceId = 'test-srv-hours-105';
  await Service.deleteMany({ id: testLongServiceId });
  await Service.create({
    id: testLongServiceId,
    title: 'خدمة التلميع العميق 105 دقيقة',
    titleEn: 'Deep Polish 105 Min',
    category: 'car',
    price: 800,
    duration: 105,
    serviceDurationMinutes: 105,
    travelTimeMinutes: 0,
    totalOccupiedMinutes: 105,
    active: true,
    available: true,
    image: '/services/test.jpg',
  });

  // Reset SystemSettings to canonical 09:00 - 22:00
  await SystemSettings.updateOne(
    { key: 'global_settings' },
    {
      $set: {
        'booking.workingHoursStart': '09:00',
        'booking.workingHoursEnd': '22:00',
        'booking.workingDays': [0, 1, 2, 3, 4, 5, 6],
        'booking.blockedDates': [],
        'booking.holidays': [],
        'booking.bufferTime': 0,
        'booking.minNoticeHours': 0,
        'booking.sameDayBooking': true,
      },
    },
    { upsert: true }
  );

  const testDate = '2026-11-25'; // A future Wednesday

  // ---------------------------------------------------------------------------
  // TEST 1: Default 09:00 - 22:00 Slot Boundaries & No Post-Closing Slots
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Canonical 09:00 - 22:00 Slot Generation & Boundary Enforcement ---');
  {
    const slotsRes = await getAvailableSlots(testDate, testServiceId, 45);
    assert(slotsRes.isDayAvailable === true, 'Day should be available');
    assert(slotsRes.slots.length > 0, `Slots should be generated, got ${slotsRes.slots.length}`);

    const firstSlot = slotsRes.slots[0];
    assert(firstSlot.start === '09:00', `First slot must start at 09:00, got ${firstSlot.start}`);

    // Last slot for 45 min service must finish at or before 22:00 (i.e. 21:15 – 22:00)
    const lastSlot = slotsRes.slots[slotsRes.slots.length - 1];
    const lastSlotEndMin = timeStringToMinutes(lastSlot.end || lastSlot.time.split(/[-–—]/)[1]);
    assert(lastSlotEndMin <= 1320, `Last slot end must be <= 22:00 (1320 min), got ${lastSlotEndMin} (${lastSlot.time})`);

    // Strictly ensure NO slot ending at 22:30 (10:30 PM) is generated when closing is 22:00!
    const slotEnding1030 = slotsRes.slots.find((s) => {
      const endPart = s.end || (s.time.includes('–') ? s.time.split('–')[1].trim() : '');
      return endPart === '22:30' || s.time.includes('22:30');
    });
    assert(!slotEnding1030, 'No slot ending at 22:30 (10:30 PM) must be generated when closing is 22:00');
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Rejection of Slots Outside Working Hours (Before Start & Past End)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Strict Server Rejection for Slots Outside Working Window ---');
  {
    // A. Rejection before opening (08:30 when open is 09:00)
    let errBefore: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '08:30 – 09:15',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      errBefore = e;
    }
    assert(errBefore !== null, 'Booking starting before 09:00 must be rejected');
    assert(
      errBefore.code === 'TIME_BEFORE_WORK_HOURS',
      `Error code must be TIME_BEFORE_WORK_HOURS, got ${errBefore?.code}`
    );
    assert(errBefore.statusCode === 409, `Status code must be 409, got ${errBefore?.statusCode}`);

    // B. Rejection after closing (21:30 – 22:15 for 45 min service when closing is 22:00)
    let errPastEnd: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '21:30 – 22:15',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      errPastEnd = e;
    }
    assert(errPastEnd !== null, 'Booking ending after 22:00 must be rejected');
    assert(
      errPastEnd.code === 'TIME_EXCEEDS_WORK_HOURS',
      `Error code must be TIME_EXCEEDS_WORK_HOURS, got ${errPastEnd?.code}`
    );
    assert(errPastEnd.statusCode === 409, `Status code must be 409, got ${errPastEnd?.statusCode}`);

    // C. Rejection of 10:30 PM slot attempt (21:45 – 22:30)
    let err1030: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '21:45 – 22:30',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      err1030 = e;
    }
    assert(err1030 !== null, '45 min booking ending at 22:30 (10:30 PM) must be rejected');
    assert(err1030.code === 'TIME_EXCEEDS_WORK_HOURS', 'Code must be TIME_EXCEEDS_WORK_HOURS');

    // D. Long service (105 min): starting at 21:00 (ends 22:45) must be rejected!
    let errLongService: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '21:00 – 22:45',
        serviceId: testLongServiceId,
        customDuration: 105,
      });
    } catch (e: any) {
      errLongService = e;
    }
    assert(errLongService !== null, '105-min service ending at 22:45 must be rejected');
    assert(errLongService.code === 'TIME_EXCEEDS_WORK_HOURS', 'Code must be TIME_EXCEEDS_WORK_HOURS');

    // E. Valid boundary bookings MUST succeed
    const validFirst = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '09:00 – 09:45',
      serviceId: testServiceId,
      customDuration: 45,
    });
    assert(validFirst.scheduledStart === '09:00', 'Opening slot 09:00 must succeed');

    const validLast = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '21:15 – 22:00',
      serviceId: testServiceId,
      customDuration: 45,
    });
    assert(validLast.scheduledEnd === '22:00', 'Closing slot ending at 22:00 must succeed');
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Dynamic Sync of Public/Marketing Hours & Custom Working Hours
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Dynamic Sync of Public Contact Hours & 12:00 - 23:00 Custom Hours ---');
  {
    // Check formatWorkingHoursText helper
    const text0922 = formatWorkingHoursText('09:00', '22:00');
    assert(text0922.workingHours === 'يومياً من 9:00 ص حتى 10:00 م', `Arabic text: ${text0922.workingHours}`);
    assert(text0922.workingHoursEn === 'Daily 9:00 AM – 10:00 PM', `English text: ${text0922.workingHoursEn}`);

    const text1223 = formatWorkingHoursText('12:00', '23:00');
    assert(text1223.workingHours === 'يومياً من 12:00 م حتى 11:00 م', `Arabic text: ${text1223.workingHours}`);
    assert(text1223.workingHoursEn === 'Daily 12:00 PM – 11:00 PM', `English text: ${text1223.workingHoursEn}`);

    // Create test admin and generate JWT
    await AdminUser.deleteMany({ username: 'hours.admin' });
    const testAdmin = await AdminUser.create({
      name: 'Hours Test Admin',
      username: 'hours.admin',
      email: 'hours.admin@cleanzo.app',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });
    const adminToken = generateAdminToken({
      id: testAdmin._id.toString(),
      username: testAdmin.username,
      role: 'owner',
    });

    // Update settings to 12:00 - 23:00 via API
    const updateRes = await fetch(`${baseUrl}/api/settings/admin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        booking: {
          workingHoursStart: '12:00',
          workingHoursEnd: '23:00',
          workingDays: [0, 1, 2, 3, 4, 5, 6],
        },
      }),
    });
    assert(updateRes.status === 200, `Admin settings update should return 200, got ${updateRes.status}`);

    // Fetch public settings: verify contact.workingHours is dynamically derived
    const publicRes = await fetch(`${baseUrl}/api/settings/public`);
    assert(publicRes.status === 200, 'Public settings should return 200');
    const publicJson = await publicRes.json();
    assert(
      publicJson.data.contact.workingHours === 'يومياً من 12:00 م حتى 11:00 م',
      `Public contact working hours must match updated settings, got: ${publicJson.data.contact.workingHours}`
    );
    assert(
      publicJson.data.contact.workingHoursEn === 'Daily 12:00 PM – 11:00 PM',
      `Public contact working hours EN must match updated settings, got: ${publicJson.data.contact.workingHoursEn}`
    );

    // Now with 12:00 - 23:00 active:
    // Slot at 09:00 should be rejected!
    let errMorning: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '09:00 – 09:45',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      errMorning = e;
    }
    assert(errMorning !== null && errMorning.code === 'TIME_BEFORE_WORK_HOURS', '09:00 is now before work hours (12:00)');

    // Slot ending at 22:30 (10:30 PM) is now ALLOWED because 22:30 <= 23:00!
    const valid1030Slot = await assertSlotAvailability({
      dateStr: testDate,
      timeStr: '21:45 – 22:30',
      serviceId: testServiceId,
      customDuration: 45,
    });
    assert(valid1030Slot.scheduledEnd === '22:30', 'Slot ending at 22:30 is now valid under 23:00 closing');

    // Slot ending past 23:00 (e.g. 22:30 – 23:15) must be rejected!
    let errPast23: any = null;
    try {
      await assertSlotAvailability({
        dateStr: testDate,
        timeStr: '22:30 – 23:15',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      errPast23 = e;
    }
    assert(errPast23 !== null && errPast23.code === 'TIME_EXCEEDS_WORK_HOURS', 'Slot past 23:00 must be rejected');
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Holidays, Blocked Dates & Working Days Enforcement
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Respect Holidays, Blocked Dates & Working Days ---');
  {
    // A. Blocked Date
    const blockedDay = '2026-11-26';
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      { $set: { 'booking.blockedDates': [blockedDay] } }
    );

    let errBlocked: any = null;
    try {
      await assertSlotAvailability({
        dateStr: blockedDay,
        timeStr: '12:00 – 12:45',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      errBlocked = e;
    }
    assert(errBlocked !== null && errBlocked.code === 'BLOCKED_DATE', 'Blocked date must be rejected with BLOCKED_DATE');

    // B. Holiday
    const holidayDay = '2026-11-27';
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      { $set: { 'booking.holidays': [{ date: holidayDay, name: 'عطلة تجريبية خاصة' }] } }
    );

    let errHoliday: any = null;
    try {
      await assertSlotAvailability({
        dateStr: holidayDay,
        timeStr: '12:00 – 12:45',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      errHoliday = e;
    }
    assert(errHoliday !== null && errHoliday.code === 'OFFICIAL_HOLIDAY', 'Holiday must be rejected with OFFICIAL_HOLIDAY');

    // C. Disabled Working Day (e.g. disable Friday = day 5)
    // 2026-11-27 is a Friday (day 5)
    await SystemSettings.updateOne(
      { key: 'global_settings' },
      {
        $set: {
          'booking.holidays': [],
          'booking.blockedDates': [],
          'booking.workingDays': [0, 1, 2, 3, 4, 6], // Friday (5) disabled
        },
      }
    );

    let errDayOff: any = null;
    try {
      await assertSlotAvailability({
        dateStr: '2026-11-27',
        timeStr: '12:00 – 12:45',
        serviceId: testServiceId,
        customDuration: 45,
      });
    } catch (e: any) {
      errDayOff = e;
    }
    assert(errDayOff !== null && errDayOff.code === 'OUTSIDE_WORKING_DAYS', 'Friday must be rejected when workingDays excludes 5');
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Timezone Stability (Africa/Cairo) & Day Drift Immunity
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Africa/Cairo Timezone Precision & Day Shift Immunity ---');
  {
    // Test various days of the week across midnight boundaries
    // 2026-11-22 is Sunday (0)
    // 2026-11-23 is Monday (1)
    // 2026-11-27 is Friday (5)
    // 2026-11-28 is Saturday (6)
    assert(getCairoDayOfWeek('2026-11-22') === 0, '2026-11-22 must be Sunday (0)');
    assert(getCairoDayOfWeek('2026-11-23') === 1, '2026-11-23 must be Monday (1)');
    assert(getCairoDayOfWeek('2026-11-27') === 5, '2026-11-27 must be Friday (5)');
    assert(getCairoDayOfWeek('2026-11-28') === 6, '2026-11-28 must be Saturday (6)');

    const currentCairoDate = getCurrentCairoDateString();
    assert(/^\d{4}-\d{2}-\d{2}$/.test(currentCairoDate), `Current Cairo date is valid format: ${currentCairoDate}`);
  }

  // Cleanup test data & restore standard settings
  await SystemSettings.updateOne(
    { key: 'global_settings' },
    {
      $set: {
        'booking.workingHoursStart': '09:00',
        'booking.workingHoursEnd': '22:00',
        'booking.workingDays': [0, 1, 2, 3, 4, 5, 6],
        'booking.blockedDates': [],
        'booking.holidays': [],
      },
    }
  );
  await LocationGovernorate.deleteMany({ id: 'test-gov-hours' });
  await Service.deleteMany({ id: { $in: [testServiceId, testLongServiceId] } });
  await AdminUser.deleteMany({ username: 'hours.admin' });

  await stopServer();
  await disconnectDB();

  console.log('\n====================================================================');
  console.log('✅ ALL WORKING HOURS, TIMEZONE & AVAILABILITY TESTS PASSED (5/5)');
  console.log('====================================================================\n');
}

runSuite().catch(async (err) => {
  console.error('\n❌ Suite execution error:', err);
  await stopServer();
  await disconnectDB();
  process.exit(1);
});
