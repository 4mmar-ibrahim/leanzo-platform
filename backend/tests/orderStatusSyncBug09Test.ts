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

    req.on('error', (err) => reject(err));

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runBug09TestSuite() {
  console.log('\n============================================================');
  console.log('🧪 CLEANZO BUG 09 FIX TEST: SYNCHRONIZE ORDER STATUS BANNER & TIMELINE');
  console.log('============================================================\n');

  await connectDB();

  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        baseUrl = `http://127.0.0.1:${address.port}`;
        console.log(`[Test Server] running at ${baseUrl}`);
      }
      resolve();
    });
  });

  const testSuffix = Date.now().toString().slice(-6);

  try {
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
      id: admin._id ? admin._id.toString() : admin.id,
      username: admin.username,
      role: admin.role,
    });

    // Create a test technician
    const techId = `tech_bug09_${testSuffix}`;
    const tech = await Technician.create({
      id: techId,
      name: 'كابتن عماد - Bug09 Test',
      phone: '01099887766',
      status: 'available',
      specialty: 'car_wash',
    });

    console.log('\n--- Step 1: Create a Test Booking ---');
    const orderNumber = `CLN-BUG09-${testSuffix}`;
    const bookingId = orderNumber;
    const createdBooking = await Booking.create({
      id: bookingId,
      bookingNumber: orderNumber,
      serviceId: 'srv_test_car_wash',
      serviceSnapshot: {
        id: 'srv_test_car_wash',
        title: 'تلميع وغسيل سيارات متنقلة',
        titleEn: 'Mobile Car Wash & Detailing',
        price: 220,
      },
      category: 'car',
      customerName: 'أحمد محمود',
      customerPhone: '01012345678',
      date: '2026-10-10',
      time: '11:00 AM',
      timeSlotStart: '11:00',
      scheduledStart: '11:00',
      scheduledEnd: '12:00',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 20,
      totalOccupiedMinutes: 80,
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة الجديدة',
        district: 'شارع الشروق',
        street: 'شارع الشروق',
        building: '12',
        floor: '3',
        apartment: '301',
      },
      basePrice: 220,
      totalPrice: 220,
      finalPrice: 220,
      status: 'pending',
    });
    console.log(`Created booking ID=${bookingId}, orderNumber=${orderNumber}`);

    // Verify initial public tracking response
    let trackRes = await makeRequest('GET', `/bookings/track/${orderNumber}?phone=01012345678`);
    assert(trackRes.status === 200, 'Public tracking returns 200 for orderNumber');
    assert(trackRes.body.data.status === 'pending', 'Initial tracking status is pending');
    assert(trackRes.body.data.id === orderNumber, 'Tracking order id matches');

    console.log('\n--- Step 2: Confirm Order and Assign Technician ---');
    // Admin confirms order
    const confirmRes = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingId}/status`,
      { status: 'confirmed' },
      ownerToken
    );
    assert(confirmRes.status === 200, 'Admin confirm booking returns 200');

    // Admin assigns technician
    const assignRes = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingId}/assign`,
      { technicianId: techId },
      ownerToken
    );
    assert(assignRes.status === 200, 'Admin assign technician returns 200');

    // Public track order after assignment
    trackRes = await makeRequest('GET', `/bookings/track/${orderNumber}?phone=01012345678`);
    assert(trackRes.status === 200, 'Public tracking returns 200');
    assert(trackRes.body.data.status === 'assigned', 'Authoritative backend status is assigned');
    assert(trackRes.body.data.technician != null, 'Technician data populated in tracking');
    assert(
      trackRes.body.data.technician.name === 'كابتن عماد - Bug09 Test',
      'Technician name matches assigned tech'
    );

    console.log('\n--- Step 3: Transition to on_the_way ---');
    // Admin updates status to on_the_way
    const onTheWayRes = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingId}/status`,
      { status: 'on_the_way', note: 'الفني في الطريق إلى الموقع' },
      ownerToken
    );
    assert(onTheWayRes.status === 200, 'Admin can transition booking to on_the_way');
    assert(onTheWayRes.body.data.status === 'on_the_way', 'Status in response is on_the_way');

    // Public track order
    trackRes = await makeRequest('GET', `/bookings/track/${orderNumber}?phone=01012345678`);
    assert(trackRes.body.data.status === 'on_the_way', 'Authoritative tracking status is on_the_way');
    assert(trackRes.body.data.travelTimeMinutes === 20, 'Travel time is accurately preserved');

    console.log('\n--- Step 4: Transition to in_progress ---');
    // Admin updates status to in_progress
    const inProgressRes = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingId}/status`,
      { status: 'in_progress', note: 'بدء تنفيذ الخدمة في الموقع' },
      ownerToken
    );
    assert(inProgressRes.status === 200, 'Admin can transition booking to in_progress');
    assert(inProgressRes.body.data.status === 'in_progress', 'Status is in_progress');

    // Public track order
    trackRes = await makeRequest('GET', `/bookings/track/${orderNumber}?phone=01012345678`);
    assert(trackRes.body.data.status === 'in_progress', 'Authoritative tracking status is in_progress');

    console.log('\n--- Step 5: Transition to completed ---');
    // Admin updates status to completed
    const completedRes = await makeRequest(
      'PUT',
      `/bookings/admin/${bookingId}/status`,
      { status: 'completed', note: 'تم إتمام الخدمة بنجاح' },
      ownerToken
    );
    assert(completedRes.status === 200, 'Admin can transition booking to completed');
    assert(completedRes.body.data.status === 'completed', 'Status is completed');

    // Public track order
    trackRes = await makeRequest('GET', `/bookings/track/${orderNumber}?phone=01012345678`);
    assert(trackRes.body.data.status === 'completed', 'Authoritative tracking status is completed');

    console.log('\n--- Step 6: Multi-Session / Stale State Verification ---');
    // Create another booking
    const secondOrderNumber = `CLN-BUG09-STALE-${testSuffix}`;
    const secondBookingId = secondOrderNumber;
    const secondBooking = await Booking.create({
      id: secondBookingId,
      bookingNumber: secondOrderNumber,
      serviceId: 'srv_test_carpet',
      serviceSnapshot: {
        id: 'srv_test_carpet',
        title: 'تنظيف سجاد وكنب بالبخار',
        titleEn: 'Carpet & Sofa Steam Cleaning',
        price: 350,
      },
      category: 'home',
      customerName: 'سارة خالد',
      customerPhone: '01098765432',
      date: '2026-10-11',
      time: '02:00 PM',
      timeSlotStart: '14:00',
      scheduledStart: '14:00',
      scheduledEnd: '15:00',
      address: {
        governorate: 'القاهرة',
        city: 'المعادي',
        street: 'شارع النصر',
        building: '5',
      },
      basePrice: 350,
      totalPrice: 350,
      finalPrice: 350,
      totalOccupiedMinutes: 60,
      assignedTechnicianId: techId,
      technician: { id: techId, name: 'كابتن عماد - Bug09 Test' },
      status: 'assigned',
    });

    // Session 1 fetches initial tracking: assigned
    let session1Track = await makeRequest('GET', `/bookings/track/${secondOrderNumber}?phone=01098765432`);
    assert(session1Track.body.data.status === 'assigned', 'Session 1 initially reads assigned');

    // Session 2 (Admin) changes status to on_the_way
    await makeRequest(
      'PUT',
      `/bookings/admin/${secondBookingId}/status`,
      { status: 'on_the_way' },
      ownerToken
    );

    // Session 1 refreshes (makes a new request like page refresh)
    session1Track = await makeRequest('GET', `/bookings/track/${secondOrderNumber}?phone=01098765432`);
    assert(
      session1Track.body.data.status === 'on_the_way',
      'Refreshed tracking immediately returns latest saved status on_the_way without stale cache'
    );

    // Clean up test data
    await prisma.booking.deleteMany({
      where: { id: { in: [bookingId, secondBookingId] } },
    });
    await prisma.technician.deleteMany({ where: { id: techId } });

    console.log('\n============================================================');
    console.log('✅ ALL BUG 09 TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runBug09TestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
