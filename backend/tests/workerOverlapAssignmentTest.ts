import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Technician } from '../src/models/Technician.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';
import prisma from '../src/config/prisma.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;

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
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {};

    let payload = '';
    if (body !== undefined && body !== null) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

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
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 500, body: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  console.log('\n======================================================');
  console.log(' CLEANZO BUG 03: PREVENT OVERLAPPING WORKER ASSIGNMENT ');
  console.log('======================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });

  const testSuffix = Date.now().toString().slice(-6);

  // 1. Setup Admin token
  let admin = await AdminUser.findOne({ role: 'owner' });
  if (!admin) {
    admin = await AdminUser.create({
      name: 'Owner Admin',
      username: `owner_${testSuffix}`,
      password: 'password123',
      role: 'owner',
      permissions: ['*'],
      isActive: true,
    });
  }
  ownerToken = generateAdminToken({
    id: admin._id.toString(),
    username: admin.username,
    role: admin.role,
  });

  // 2. Setup Technicians: Emad and Tarek
  const techEmad = await Technician.create({
    id: `tech_emad_${testSuffix}`,
    name: 'عماد فني الاختبار',
    phone: '01011112222',
    status: 'available',
    specialty: 'غسيل وتلميع',
  });

  const techTarek = await Technician.create({
    id: `tech_tarek_${testSuffix}`,
    name: 'طارق فني الاختبار',
    phone: '01033334444',
    status: 'available',
    specialty: 'تنظيف بالبخار',
  });

  const createdBookingIds: string[] = [];

  async function createTestBooking(date: string, time: string, durationMinutes: number = 60) {
    const id = `b_test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    createdBookingIds.push(id);

    const parts = time.split(/[-–—]/).map((p) => p.trim());
    const scheduledStart = parts[0];
    const scheduledEnd = parts[1] || parts[0];

    const b = await Booking.create({
      id,
      serviceId: 'srv_test_car_wash',
      category: 'car',
      serviceSnapshot: {
        id: 'srv_test_car_wash',
        title: 'غسيل سيارات تجريبي',
        titleEn: 'Test Car Wash',
        category: 'car',
        price: 200,
        duration: durationMinutes,
      },
      customerName: 'عميل اختبار',
      customerPhone: '01012345678',
      date,
      time,
      timeSlotStart: scheduledStart,
      scheduledStart,
      scheduledEnd,
      status: 'confirmed',
      basePrice: 200,
      totalPrice: 200,
      finalPrice: 200,
      totalOccupiedMinutes: durationMinutes,
      serviceDurationMinutes: durationMinutes,
      address: {
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        street: 'شارع 1',
        building: '10',
      },
    });

    return b;
  }

  try {
    const TEST_DATE = '2026-10-03';

    // -------------------------------------------------------------------------
    // TEST 1: Booking A (11:00–12:00) -> Assign Emad -> MUST SUCCEED
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] Assign Emad to Booking A (11:00–12:00)...');
    const bookingA = await createTestBooking(TEST_DATE, '11:00 - 12:00', 60);
    const assignResA = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingA.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResA.status === 200, 'Assignment to Booking A succeeds with 200');
    assert(assignResA.body.data.assignedTechnicianId === techEmad.id, 'Emad assigned to Booking A in response');

    // -------------------------------------------------------------------------
    // TEST 2: Booking B (11:15–13:30) on same date -> Assign Emad -> MUST BE BLOCKED
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Overlap: Assign Emad to Booking B (11:15–13:30) on same date -> MUST BLOCK (409)...');
    const bookingB = await createTestBooking(TEST_DATE, '11:15 - 13:30', 135);
    const assignResB = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingB.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResB.status === 409, `Overlap rejected with status 409 (got ${assignResB.status})`);
    assert(
      assignResB.body.message === 'هذا العامل غير متاح في هذا الوقت لوجود حجز آخر متداخل.',
      `Rejection message matches canonical Arabic text: "${assignResB.body.message}"`
    );

    // Verify DB state was NOT modified
    const dbB = await prisma.booking.findUnique({ where: { id: bookingB.id } });
    assert(dbB?.assignedTechnicianId === null, 'Booking B technician is still null in DB');

    // -------------------------------------------------------------------------
    // TEST 3: Preceding Back-to-back: Booking C (10:00–11:00) -> MUST SUCCEED (boundary edge)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Boundary Check: Booking C (10:00–11:00) -> MUST ALLOW...');
    const bookingC = await createTestBooking(TEST_DATE, '10:00 - 11:00', 60);
    const assignResC = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingC.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResC.status === 200, 'Back-to-back 10:00-11:00 succeeds with 200');

    // -------------------------------------------------------------------------
    // TEST 4: Following Back-to-back: Booking D (12:00–13:00) -> MUST SUCCEED (boundary edge)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Boundary Check: Booking D (12:00–13:00) -> MUST ALLOW...');
    const bookingD = await createTestBooking(TEST_DATE, '12:00 - 13:00', 60);
    const assignResD = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingD.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResD.status === 200, 'Back-to-back 12:00-13:00 succeeds with 200');

    // -------------------------------------------------------------------------
    // TEST 5: Partial overlap before: Booking E (10:30–11:30) -> MUST BE BLOCKED
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Overlap: Booking E (10:30–11:30) overlaps Booking A -> MUST BLOCK...');
    const bookingE = await createTestBooking(TEST_DATE, '10:30 - 11:30', 60);
    const assignResE = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingE.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResE.status === 409, 'Partial overlap (10:30-11:30) rejected with 409');

    // -------------------------------------------------------------------------
    // TEST 6: Exact same time: Booking F (11:00–12:00) -> MUST BE BLOCKED
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Overlap: Booking F (11:00–12:00) identical interval -> MUST BLOCK...');
    const bookingF = await createTestBooking(TEST_DATE, '11:00 - 12:00', 60);
    const assignResF = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingF.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResF.status === 409, 'Identical interval (11:00-12:00) rejected with 409');

    // -------------------------------------------------------------------------
    // TEST 7: Different Date: Booking G (2026-10-04, 11:15–13:30) -> MUST SUCCEED
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Different Date: Booking G on 2026-10-04 (11:15–13:30) -> MUST ALLOW...');
    const bookingG = await createTestBooking('2026-10-04', '11:15 - 13:30', 135);
    const assignResG = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingG.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResG.status === 200, 'Same time on different date succeeds with 200');

    // -------------------------------------------------------------------------
    // TEST 8: Different Worker: Assign Tarek to Booking B (11:15–13:30) -> MUST SUCCEED
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Different Worker: Assign Tarek to Booking B (11:15–13:30) -> MUST ALLOW...');
    const assignResTarek = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingB.id}/assign`,
      { technicianId: techTarek.id },
      ownerToken
    );
    assert(assignResTarek.status === 200, 'Different worker assignment succeeds with 200');

    // -------------------------------------------------------------------------
    // TEST 9: Cancelled booking releases worker: Cancel Booking A -> Now Emad is free
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Cancelled Booking releases worker...');
    await prisma.booking.update({
      where: { id: bookingA.id },
      data: { status: 'cancelled' },
    });
    await Booking.updateOne({ id: bookingA.id }, { $set: { status: 'cancelled' } });

    // Unassign Tarek from booking B so we can test Emad
    await makeRequest(
      'PUT',
      `/bookings/admin/${bookingB.id}/assign`,
      { technicianId: null },
      ownerToken
    );

    // Also unassign C and D so interval 11:15-13:30 doesn't collide with D (12:00-13:00)
    await makeRequest(
      'PUT',
      `/bookings/admin/${bookingD.id}/assign`,
      { technicianId: null },
      ownerToken
    );

    const assignResAfterCancel = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingB.id}/assign`,
      { technicianId: techEmad.id },
      ownerToken
    );
    assert(assignResAfterCancel.status === 200, 'Worker assigned to Booking B after Booking A cancelled');

    // -------------------------------------------------------------------------
    // TEST 10: Race Condition Test: Two concurrent requests attempting assignment
    // -------------------------------------------------------------------------
    console.log('\n[TEST 10] Race Condition: 2 simultaneous assignments for overlapping bookings...');
    const raceBooking1 = await createTestBooking('2026-10-10', '15:00 - 16:00', 60);
    const raceBooking2 = await createTestBooking('2026-10-10', '15:30 - 16:30', 60);

    // Fire both requests concurrently using Promise.all
    const [res1, res2] = await Promise.all([
      makeRequest(
        'PUT',
        `/bookings/admin/${raceBooking1.id}/assign`,
        { technicianId: techEmad.id },
        ownerToken
      ),
      makeRequest(
        'PUT',
        `/bookings/admin/${raceBooking2.id}/assign`,
        { technicianId: techEmad.id },
        ownerToken
      ),
    ]);

    const statuses = [res1.status, res2.status].sort();
    console.log(`  Concurrent request statuses: ${res1.status} and ${res2.status}`);

    assert(
      statuses[0] === 200 && statuses[1] === 409,
      `Race condition handled correctly: exactly ONE succeeded (200) and ONE was rejected (409).`
    );

    // Check DB state to guarantee no double-assignment exists
    const dbRace1 = await prisma.booking.findUnique({ where: { id: raceBooking1.id } });
    const dbRace2 = await prisma.booking.findUnique({ where: { id: raceBooking2.id } });
    const assignedCount = [dbRace1?.assignedTechnicianId, dbRace2?.assignedTechnicianId].filter(
      (id) => id === techEmad.id
    ).length;

    assert(assignedCount === 1, `DB authoritative state: exactly 1 booking assigned to Emad (count = ${assignedCount})`);

    console.log('\n======================================================');
    console.log(' ALL 10 TESTS PASSED SUCCESSFULLY! ');
    console.log(' Overlap prevention & race condition safety verified. ');
    console.log('======================================================\n');
  } finally {
    // Cleanup created test records
    try {
      await Booking.deleteMany({ id: { $in: createdBookingIds } });
      await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      await Technician.deleteMany({ id: { $in: [techEmad.id, techTarek.id] } });
    } catch (e) {
      console.warn('Cleanup error:', e);
    }

    server.close();
    await disconnectDB();
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
