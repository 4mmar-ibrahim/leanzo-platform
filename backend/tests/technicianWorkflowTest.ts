import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import assert from 'assert';
import { AdminUser } from '../src/models/AdminUser.js';
import { Technician } from '../src/models/Technician.js';
import { Booking } from '../src/models/Booking.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string,
  contentType = 'application/json'
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'User-Agent': 'CleanzoTechnicianSystemTest/1.0',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload: Buffer | undefined;
    if (body !== undefined) {
      if (Buffer.isBuffer(body)) {
        payload = body;
        headers['Content-Type'] = contentType;
        headers['Content-Length'] = body.length.toString();
      } else {
        const json = JSON.stringify(body);
        payload = Buffer.from(json);
        headers['Content-Type'] = contentType;
        headers['Content-Length'] = Buffer.byteLength(json).toString();
      }
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode || 0, body: parsed });
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

// Simple multipart form builder for binary file upload test
function buildMultipartBody(fieldName: string, fileName: string, mimeType: string, fileBuffer: Buffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, fileBuffer, tail]);
  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function runTechnicianWorkflowTest() {
  console.log('🚀 Starting Cleanzo Technician System & Profile Dashboard Test Suite...');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  console.log(`🌐 Test server listening at ${baseUrl}`);

  try {
    // 1. Setup Admin User (Owner)
    await AdminUser.deleteMany({ username: 'tech_test_owner' });
    const ownerAdmin = await AdminUser.create({
      name: 'Owner Tester',
      username: 'tech_test_owner',
      email: 'owner@cleanzo.eg',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });
    const ownerToken = generateAdminToken({
      id: ownerAdmin._id.toString(),
      username: ownerAdmin.username,
      role: ownerAdmin.role,
    });

    // 2. Setup Technician Role Admin User for RBAC testing
    await AdminUser.deleteMany({ username: 'tech_restricted_user' });
    const techUser = await AdminUser.create({
      name: 'Field Captain',
      username: 'tech_restricted_user',
      email: 'captain@cleanzo.eg',
      password: 'password123',
      role: 'technician',
      status: 'active',
    });
    const techToken = generateAdminToken({
      id: techUser._id.toString(),
      username: techUser.username,
      role: techUser.role,
    });

    console.log('✅ Admin credentials and RBAC tokens initialized.');

    // -------------------------------------------------------------
    // Test Step 1: Media Upload (Direct Device Upload)
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Upload Technician Image via Device Upload ---');
    // Minimal valid 1x1 PNG buffer
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ]);

    const { body: multipartBody, contentType } = buildMultipartBody(
      'file',
      'technician_avatar.png',
      'image/png',
      validPngBuffer
    );

    const uploadRes = await makeRequest(
      'POST',
      '/api/media/upload',
      multipartBody,
      ownerToken,
      contentType
    );

    assert.strictEqual(uploadRes.status, 201, `Expected 201 Created for media upload, got: ${uploadRes.status}`);
    assert(uploadRes.body?.data?.url, 'Expected uploaded media to contain a valid URL');
    assert(uploadRes.body.data.url.startsWith('/uploads/images/'), 'Expected URL to point to /uploads/images/');
    const uploadedAvatarUrl = uploadRes.body.data.url;
    console.log(`✅ Real device image upload succeeded: stored at ${uploadedAvatarUrl}`);

    // -------------------------------------------------------------
    // Test Step 2: Technician Creation with Validation
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Validation - Reject Raw Base64 in Database ---');
    const base64Payload = {
      name: 'كابتن محمود سمير',
      phone: '01011122233',
      specialty: 'تلميع سيارات متنقل',
      avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const rejectBase64Res = await makeRequest(
      'POST',
      '/api/technicians',
      base64Payload,
      ownerToken
    );
    assert.strictEqual(rejectBase64Res.status, 422, 'Expected 422 for base64 avatar rejection');
    assert.strictEqual(rejectBase64Res.body?.code, 'BASE64_NOT_ALLOWED', 'Expected BASE64_NOT_ALLOWED error code');
    console.log('✅ Base64 avatar was correctly rejected by backend validation.');

    console.log('\n--- Test 3: Save Technician with Uploaded Image URL ---');
    const validTechPayload = {
      name: 'كابتن كريم ممدوح',
      phone: '01099887766',
      email: 'karim@cleanzo.eg',
      specialty: 'خبير غسيل وتلميع سيارات بالبخار',
      bio: 'فني معتمد خبرة 6 سنوات',
      avatar: uploadedAvatarUrl,
    };

    const createTechRes = await makeRequest(
      'POST',
      '/api/technicians',
      validTechPayload,
      ownerToken
    );

    assert.strictEqual(createTechRes.status, 201, `Expected 201 for technician creation, got ${createTechRes.status}`);
    const createdTech = createTechRes.body?.data;
    assert(createdTech?.id, 'Expected created technician to have an id');
    assert.strictEqual(createdTech.name, validTechPayload.name);
    assert.strictEqual(createdTech.avatar, uploadedAvatarUrl);
    console.log(`✅ Technician created successfully with ID: ${createdTech.id} and avatar: ${createdTech.avatar}`);

    // -------------------------------------------------------------
    // Test Step 4: Seed Real Database Bookings for This Technician
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Seed Real Database Bookings & Calculations ---');
    const testTechId = createdTech.id;
    await Booking.deleteMany({ assignedTechnicianId: testTechId });

    // Order 1: Completed - Car Wash
    const b1 = await Booking.create({
      id: `CLN-TEST-${Date.now()}-01`,
      customerName: 'أحمد سعيد',
      customerPhone: '01012345671',
      serviceId: 'srv-car-wash',
      serviceSnapshot: {
        id: 'srv-car-wash',
        title: 'غسيل وتلميع بخار سيارات',
        titleEn: 'Steam Car Wash',
        category: 'car',
        image: '/uploads/images/default.jpg',
        price: 350,
        duration: 45,
      },
      category: 'car',
      date: '2026-09-22',
      time: '10:00 AM',
      timeSlotStart: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '10:45',
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 60,
      address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'مكرم عبيد', label: 'المنزل' },
      basePrice: 350,
      discount: 0,
      serviceFee: 0,
      finalPrice: 350,
      currency: 'EGP',
      status: 'completed',
      completedAt: new Date(),
      assignedTechnicianId: testTechId,
      technician: {
        id: testTechId,
        name: createdTech.name,
        phone: createdTech.phone,
        avatar: createdTech.avatar,
        rating: 5.0,
        specialty: createdTech.specialty,
      },
    });

    // Order 2: Completed - Home Cleaning (Same Customer Ahmed)
    const b2 = await Booking.create({
      id: `CLN-TEST-${Date.now()}-02`,
      customerName: 'أحمد سعيد',
      customerPhone: '01012345671',
      serviceId: 'srv-sofa-clean',
      serviceSnapshot: {
        id: 'srv-sofa-clean',
        title: 'تنظيف كنب ومفروشات',
        titleEn: 'Sofa Cleaning',
        category: 'home',
        image: '/uploads/images/default.jpg',
        price: 500,
        duration: 60,
      },
      category: 'home',
      date: '2026-09-22',
      time: '12:00 PM',
      timeSlotStart: '12:00',
      scheduledStart: '12:00',
      scheduledEnd: '13:00',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 75,
      address: { governorate: 'القاهرة', city: 'التجمع الخامس', area: 'الحي الأول', label: 'الفيلا' },
      basePrice: 500,
      discount: 0,
      serviceFee: 0,
      finalPrice: 500,
      currency: 'EGP',
      status: 'completed',
      completedAt: new Date(),
      assignedTechnicianId: testTechId,
      technician: {
        id: testTechId,
        name: createdTech.name,
        phone: createdTech.phone,
        avatar: createdTech.avatar,
        rating: 5.0,
        specialty: createdTech.specialty,
      },
    });

    // Order 3: In Progress - Car Wash (Customer Mostafa)
    const b3 = await Booking.create({
      id: `CLN-TEST-${Date.now()}-03`,
      customerName: 'مصطفى كمال',
      customerPhone: '01122334455',
      serviceId: 'srv-car-wash',
      serviceSnapshot: {
        id: 'srv-car-wash',
        title: 'غسيل وتلميع بخار سيارات',
        titleEn: 'Steam Car Wash',
        category: 'car',
        image: '/uploads/images/default.jpg',
        price: 350,
        duration: 45,
      },
      category: 'car',
      date: '2026-09-22',
      time: '02:00 PM',
      timeSlotStart: '14:00',
      scheduledStart: '14:00',
      scheduledEnd: '14:45',
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 60,
      address: { governorate: 'الجيزة', city: 'الشيخ زايد', area: 'بيفرلي هيلز', label: 'العمل' },
      basePrice: 350,
      discount: 0,
      serviceFee: 0,
      finalPrice: 350,
      currency: 'EGP',
      status: 'in_progress',
      assignedTechnicianId: testTechId,
      technician: {
        id: testTechId,
        name: createdTech.name,
        phone: createdTech.phone,
        avatar: createdTech.avatar,
        rating: 5.0,
        specialty: createdTech.specialty,
      },
    });

    // Order 4: Cancelled - Home Cleaning (Customer Sara)
    const b4 = await Booking.create({
      id: `CLN-TEST-${Date.now()}-04`,
      customerName: 'سارة عبد الله',
      customerPhone: '01233445566',
      serviceId: 'srv-carpet-clean',
      serviceSnapshot: {
        id: 'srv-carpet-clean',
        title: 'غسيل سجاد بالبخار',
        titleEn: 'Carpet Steam Wash',
        category: 'home',
        image: '/uploads/images/default.jpg',
        price: 400,
        duration: 50,
      },
      category: 'home',
      date: '2026-09-22',
      time: '04:00 PM',
      timeSlotStart: '16:00',
      scheduledStart: '16:00',
      scheduledEnd: '16:50',
      duration: 50,
      serviceDurationMinutes: 50,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 65,
      address: { governorate: 'القاهرة', city: 'المعادي', area: 'دجلة', label: 'الشقة' },
      basePrice: 400,
      discount: 0,
      serviceFee: 0,
      finalPrice: 400,
      currency: 'EGP',
      status: 'cancelled',
      assignedTechnicianId: testTechId,
      technician: {
        id: testTechId,
        name: createdTech.name,
        phone: createdTech.phone,
        avatar: createdTech.avatar,
        rating: 5.0,
        specialty: createdTech.specialty,
      },
    });

    console.log('✅ 4 Test Bookings successfully seeded in MongoDB for technician.');

    // -------------------------------------------------------------
    // Test Step 5: Test Technician Profile Dashboard API Aggregation
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Verify Profile Dashboard Live Calculations ---');
    const profileRes = await makeRequest(
      'GET',
      `/api/technicians/${testTechId}`,
      undefined,
      ownerToken
    );

    assert.strictEqual(profileRes.status, 200, `Expected 200, got ${profileRes.status}`);
    const dash = profileRes.body?.data;
    assert(dash, 'Expected dashboard data object');

    console.log('Dashboard Metrics Received:', dash.metrics);
    assert.strictEqual(dash.metrics.totalAssigned, 4, `Expected totalAssigned=4, got ${dash.metrics.totalAssigned}`);
    assert.strictEqual(dash.metrics.completedOrders, 2, `Expected completedOrders=2, got ${dash.metrics.completedOrders}`);
    assert.strictEqual(dash.metrics.inProgressOrders, 1, `Expected inProgressOrders=1, got ${dash.metrics.inProgressOrders}`);
    assert.strictEqual(dash.metrics.cancelledOrders, 1, `Expected cancelledOrders=1, got ${dash.metrics.cancelledOrders}`);
    assert.strictEqual(dash.metrics.uniqueCustomersCount, 3, `Expected uniqueCustomersCount=3 (Ahmed, Mostafa, Sara), got ${dash.metrics.uniqueCustomersCount}`);
    assert.strictEqual(dash.metrics.completionRate, 50, `Expected completionRate=50%, got ${dash.metrics.completionRate}%`);

    // Verify services distribution
    assert(dash.servicesExecuted.length >= 2, 'Expected services distribution to contain multiple services');
    console.log('Services Executed:', dash.servicesExecuted.map((s: any) => `${s.title}: ${s.count}`));

    // Verify monthly trend
    assert(Array.isArray(dash.monthlyTrend), 'Expected monthlyTrend array');
    console.log('Monthly Trend Count:', dash.monthlyTrend.length);

    console.log('✅ All KPI calculations and database aggregations verified perfectly with NO mock data!');

    // -------------------------------------------------------------
    // Test Step 6: Backend-backed Filters Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Verify Backend Filters ---');

    // Filter by status=completed
    const completedFilterRes = await makeRequest(
      'GET',
      `/api/technicians/${testTechId}?status=completed`,
      undefined,
      ownerToken
    );
    assert.strictEqual(completedFilterRes.status, 200);
    assert.strictEqual(completedFilterRes.body.data.orders.length, 2, 'Expected exactly 2 completed orders');
    completedFilterRes.body.data.orders.forEach((o: any) => assert.strictEqual(o.status, 'completed'));
    console.log('✅ Filter by status=completed returned exactly 2 completed orders.');

    // Filter by category=car
    const categoryFilterRes = await makeRequest(
      'GET',
      `/api/technicians/${testTechId}?category=car`,
      undefined,
      ownerToken
    );
    assert.strictEqual(categoryFilterRes.status, 200);
    assert.strictEqual(categoryFilterRes.body.data.orders.length, 2, 'Expected 2 car wash orders');
    categoryFilterRes.body.data.orders.forEach((o: any) => assert.strictEqual(o.category, 'car'));
    console.log('✅ Filter by category=car returned exactly 2 car orders.');

    // Filter by search=مصطفى (Mostafa)
    const searchFilterRes = await makeRequest(
      'GET',
      `/api/technicians/${testTechId}?search=مصطفى`,
      undefined,
      ownerToken
    );
    assert.strictEqual(searchFilterRes.status, 200);
    assert.strictEqual(searchFilterRes.body.data.orders.length, 1, 'Expected 1 order for Mostafa');
    assert.strictEqual(searchFilterRes.body.data.orders[0].customerName, 'مصطفى كمال');
    console.log('✅ Search filter by customer name succeeded.');

    // -------------------------------------------------------------
    // Test Step 7: Edit Technician & Toggle Availability
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Update Technician & Toggle Availability ---');
    const updateRes = await makeRequest(
      'PUT',
      `/api/technicians/${testTechId}`,
      { specialty: 'كبير أخصائيي النانو سيراميك والتلميع' },
      ownerToken
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.specialty, 'كبير أخصائيي النانو سيراميك والتلميع');

    const toggleRes = await makeRequest(
      'PATCH',
      `/api/technicians/${testTechId}/availability`,
      {},
      ownerToken
    );
    assert.strictEqual(toggleRes.status, 200);
    console.log(`✅ Availability toggled to: ${toggleRes.body.data.status}`);

    // -------------------------------------------------------------
    // Test Step 8: RBAC & Security Validation
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Security & RBAC Enforcement ---');

    // 8a. Unauthenticated access rejected
    const unauthRes = await makeRequest('GET', `/api/technicians`);
    assert.strictEqual(unauthRes.status, 401, 'Expected 401 for unauthenticated request');
    console.log('✅ Unauthenticated requests strictly rejected (401).');

    // 8b. Technician role accessing restricted /api/technicians rejected
    const techAccessRes = await makeRequest('GET', `/api/technicians`, undefined, techToken);
    assert.strictEqual(techAccessRes.status, 403, 'Expected 403 for technician accessing technician management');
    console.log('✅ Technician user restricted from accessing full technician management (403).');

    console.log('\n🎉 ALL 8 TEST SUITES PASSED FLAWLESSLY WITH 100% SUCCESS!');
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runTechnicianWorkflowTest().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
