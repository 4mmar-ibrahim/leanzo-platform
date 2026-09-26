import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Technician } from '../src/models/Technician.js';
import { Service } from '../src/models/Service.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateAdminToken } from '../src/utils/jwt.js';

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
            let body: any = parsed;
            if (parsed && typeof parsed === 'object' && parsed.data !== undefined) {
              if (typeof parsed.data === 'object' && parsed.data !== null && !Array.isArray(parsed.data)) {
                body = {
                  ...parsed.data,
                  _raw: parsed,
                  message: parsed.message,
                  error: parsed.code || parsed.error || parsed.message,
                };
              } else {
                body = parsed.data;
              }
            } else if (parsed && typeof parsed === 'object') {
              body = { ...parsed, error: parsed.code || parsed.error || parsed.message };
            }
            resolve({ status: res.statusCode || 500, body });
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

async function runTechnicianPermissionsSuite() {
  console.log('\n============================================================');
  console.log('🧪 CLEANZO MODIFICATION 08 — RBAC & TECHNICIAN USER TEST SUITE');
  console.log('============================================================\n');

  await connectDB();

  // Start test server on random ephemeral port
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      console.log(`[Test Server] running at ${baseUrl}`);
      resolve();
    });
  });

  const testSuffix = Date.now().toString().slice(-6);
  const ammarTechId = `tech-ammar-${testSuffix}`;
  const otherTechId = `tech-other-${testSuffix}`;
  const ammarUsername = `ammar.tech.${testSuffix}`;
  const ammarPassword = 'Password123!';
  const ammarBookingIds: string[] = [];
  const otherBookingIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // Setup 1: Ensure Platform Owner & Generate Token
    // -------------------------------------------------------------
    console.log('\n--- STEP 1: Setup Platform Owner and Technicians ---');
    let owner = await AdminUser.findOne({ role: 'owner' });
    if (!owner) {
      owner = await AdminUser.create({
        name: 'Platform Owner',
        username: `owner.${testSuffix}`,
        email: `owner.${testSuffix}@cleanzo.test`,
        password: 'password123',
        role: 'owner',
        status: 'active',
      });
    }
    ownerToken = generateAdminToken({
      id: owner.id,
      username: owner.username,
      role: owner.role,
      userType: 'admin',
    });
    assert(Boolean(ownerToken), 'Owner token created successfully');

    // Create Technician Ammar in DB
    const ammarTech = await Technician.create({
      id: ammarTechId,
      name: 'عمار الشريف',
      phone: '01011112222',
      specialty: 'تنظيف عميق وبخار',
      active: true,
      status: 'available',
      rating: 4.9,
    });
    assert(Boolean(ammarTech), 'Technician Ammar record created');

    // Create Another Technician
    const otherTech = await Technician.create({
      id: otherTechId,
      name: 'محمود عبد الله',
      phone: '01033334444',
      specialty: 'مكافحة حشرات',
      active: true,
      status: 'available',
      rating: 4.8,
    });
    assert(Boolean(otherTech), 'Technician Other record created');

    // -------------------------------------------------------------
    // Setup 2: Service Info for Test Bookings
    // -------------------------------------------------------------
    const serviceId = 'car-wash-steam';
    const serviceName = 'تنظيف كنب بالبخار الفندقي';

    // -------------------------------------------------------------
    // STEP 2: Create Technician User with Granular Permissions
    // -------------------------------------------------------------
    console.log('\n--- STEP 2: Create Technician User Linked by ID ---');
    const grantedPermissions = [
      'orders.view_assigned',
      'orders.view_details',
      'orders.view_customer',
      'orders.view_customer_phone',
      'orders.view_address',
      'orders.receive',
      'orders.start_execution',
      'orders.mark_finished',
    ];

    const createTechUserRes = await makeRequest(
      'POST',
      '/auth/admin/users',
      {
        name: 'عمار الشريف',
        username: ammarUsername,
        email: `${ammarUsername}@cleanzo.local`,
        password: ammarPassword,
        userType: 'technician',
        technicianId: ammarTechId,
        granularPermissions: grantedPermissions,
      },
      ownerToken
    );

    assert(createTechUserRes.status === 201, `Technician user created (Status: ${createTechUserRes.status})`);
    assert(createTechUserRes.body.userType === 'technician', 'Returned userType is technician');
    assert(createTechUserRes.body.technicianId === ammarTechId, 'Returned technicianId matches Ammar ID');
    assert(!createTechUserRes.body.password, 'Password hash is NEVER returned in response');

    // -------------------------------------------------------------
    // STEP 3: Enforce Single Active Account per Technician Rule
    // -------------------------------------------------------------
    console.log('\n--- STEP 3: Test Single Account Per Technician Constraint ---');
    const duplicateRes = await makeRequest(
      'POST',
      '/auth/admin/users',
      {
        name: 'حساب مكرر لعمار',
        username: `duplicate.${testSuffix}`,
        email: `dup.${testSuffix}@cleanzo.local`,
        password: 'Password123!',
        userType: 'technician',
        technicianId: ammarTechId,
        granularPermissions: grantedPermissions,
      },
      ownerToken
    );
    assert(duplicateRes.status === 409, `Duplicate technician account blocked with 409 Conflict (Got: ${duplicateRes.status})`);
    console.log(`  ✓ 409 Error message: ${duplicateRes.body.message || duplicateRes.body.error}`);

    // -------------------------------------------------------------
    // STEP 4: Login as Technician User Ammar
    // -------------------------------------------------------------
    console.log('\n--- STEP 4: Technician User Login & Token Verification ---');
    const loginRes = await makeRequest('POST', '/auth/admin/login', {
      username: ammarUsername,
      password: ammarPassword,
    });
    assert(loginRes.status === 200, `Technician login succeeded (Status: ${loginRes.status})`);
    const ammarToken = loginRes.body.token;
    assert(Boolean(ammarToken), 'JWT token returned for technician');
    assert(loginRes.body.admin.userType === 'technician', 'Admin profile userType is technician');
    assert(loginRes.body.admin.technicianId === ammarTechId, 'Admin profile technicianId matches Ammar');

    // -------------------------------------------------------------
    // STEP 5: Create 50 Test Orders (20 assigned to Ammar, 30 others)
    // -------------------------------------------------------------
    console.log('\n--- STEP 5: Create 50 Orders (20 assigned to Ammar, 30 other/unassigned) ---');

    async function createTestBooking(id: string, techId: string | null, techName?: string, price = 250) {
      return await Booking.create({
        id,
        customerName: `عميل طلب ${id}`,
        customerPhone: '01012345678',
        serviceId: 'car-wash-steam',
        serviceSnapshot: {
          id: 'car-wash-steam',
          title: 'غسيل بخار مكثف',
          titleEn: 'Steam Wash Intensive',
          category: 'car',
          image: '/images/car.png',
          price,
          duration: 45,
        },
        category: 'car',
        date: '2026-10-15',
        time: '11:00 AM',
        timeSlotStart: '11:00',
        scheduledStart: '11:00',
        scheduledEnd: '11:45',
        duration: 45,
        serviceDurationMinutes: 45,
        travelTimeMinutes: 15,
        totalOccupiedMinutes: 60,
        address: {
          governorate: 'القاهرة',
          city: 'مدينة نصر',
          area: 'مكرم عبيد',
          details: 'شارع 15 عمارة 4',
          label: 'المنزل',
        },
        basePrice: price,
        discount: 0,
        serviceFee: 0,
        finalPrice: price,
        currency: 'ج.م',
        status: 'pending',
        assignedTechnicianId: techId || undefined,
        technician: techId ? { id: techId, name: techName, phone: '01011112222', avatar: '', rating: 5, specialty: '' } : undefined,
        timeline: [
          {
            status: 'pending',
            label: 'طلب جديد قيد الانتظار',
            labelEn: 'New Pending Order',
            timestamp: new Date().toISOString(),
            completed: true,
          },
        ],
      });
    }

    // 20 Orders for Ammar
    for (let i = 1; i <= 20; i++) {
      const bId = `ord-ammar-${testSuffix}-${i}`;
      await createTestBooking(bId, ammarTechId, 'عمار الشريف', 250);
      ammarBookingIds.push(bId);
    }

    // 30 Orders for others / unassigned (15 other tech, 15 unassigned)
    for (let i = 1; i <= 15; i++) {
      const bId = `ord-other-${testSuffix}-${i}`;
      await createTestBooking(bId, otherTechId, 'محمود عبد الله', 300);
      otherBookingIds.push(bId);
    }
    for (let i = 16; i <= 30; i++) {
      const bId = `ord-unassigned-${testSuffix}-${i}`;
      await createTestBooking(bId, null, undefined, 350);
      otherBookingIds.push(bId);
    }
    assert(ammarBookingIds.length === 20, '20 orders created for Ammar');
    assert(otherBookingIds.length === 30, '30 orders created for other/unassigned');

    // -------------------------------------------------------------
    // STEP 6: Query-Level Isolation Test (Orders List API)
    // -------------------------------------------------------------
    console.log('\n--- STEP 6: Enforce Assigned-Orders-Only Isolation at DB Query Level ---');
    const ammarOrdersRes = await makeRequest('GET', '/bookings/admin/all?limit=100', undefined, ammarToken);
    assert(ammarOrdersRes.status === 200, `Orders query succeeded (Status: ${ammarOrdersRes.status})`);
    
    const returnedBookings: any[] = ammarOrdersRes.body.bookings || [];
    assert(returnedBookings.length === 20, `Backend returned EXACTLY 20 orders for Ammar (Got: ${returnedBookings.length})`);

    const hasAnyOtherOrder = returnedBookings.some((b) => b.assignedTechnicianId !== ammarTechId);
    assert(!hasAnyOtherOrder, 'ZERO orders belonging to other technicians or unassigned are returned');

    const allReturnedAreAmmar = returnedBookings.every((b) => ammarBookingIds.includes(b.id));
    assert(allReturnedAreAmmar, 'All returned orders match Ammar order IDs');

    // -------------------------------------------------------------
    // STEP 7: Direct API Access Protection (IDOR / BOLA)
    // -------------------------------------------------------------
    console.log('\n--- STEP 7: Direct API Access Protection (IDOR Prevention) ---');
    const targetOtherOrderId = otherBookingIds[0];
    const directOtherRes = await makeRequest('GET', `/bookings/admin/${targetOtherOrderId}`, undefined, ammarToken);
    assert(
      directOtherRes.status === 403,
      `Direct GET of other technician order rejected with 403 Forbidden (Got: ${directOtherRes.status})`
    );
    assert(
      directOtherRes.body.error === 'FORBIDDEN_UNASSIGNED_ORDER',
      'Error code matches FORBIDDEN_UNASSIGNED_ORDER'
    );

    // Direct access to Ammar's own order should be 200 OK
    const targetAmmarOrderId = ammarBookingIds[0];
    const directAmmarRes = await makeRequest('GET', `/bookings/admin/${targetAmmarOrderId}`, undefined, ammarToken);
    assert(directAmmarRes.status === 200, `Direct GET of own order succeeds with 200 OK (Got: ${directAmmarRes.status})`);
    assert(directAmmarRes.body.id === targetAmmarOrderId, 'Returned order matches requested assigned order');

    // -------------------------------------------------------------
    // STEP 8: Granular Permissions Enforcement Tests
    // -------------------------------------------------------------
    console.log('\n--- STEP 8: Granular Order Permissions Enforcement ---');

    // 8.1 Try Cancel (NOT GRANTED)
    const cancelRes = await makeRequest(
      'PUT',
      `/bookings/admin/${targetAmmarOrderId}/status`,
      { status: 'cancelled' },
      ammarToken
    );
    assert(cancelRes.status === 403, `Cancel without permission blocked with 403 Forbidden (Got: ${cancelRes.status})`);
    assert(cancelRes.body.error === 'FORBIDDEN_CANCEL_PERMISSION', 'Error code matches FORBIDDEN_CANCEL_PERMISSION');

    // 8.2 Try Delete (NOT GRANTED)
    const deleteRes = await makeRequest('DELETE', `/bookings/admin/${targetAmmarOrderId}`, undefined, ammarToken);
    assert(deleteRes.status === 403, `Delete without permission blocked with 403 Forbidden (Got: ${deleteRes.status})`);
    assert(
      deleteRes.body.error === 'FORBIDDEN_DELETE_PERMISSION' || deleteRes.body.error === 'ACCESS_DENIED_PERMISSION',
      'Error code matches FORBIDDEN_DELETE_PERMISSION or ACCESS_DENIED_PERMISSION'
    );

    // 8.3 Try Assign / Change Technician (NOT GRANTED)
    const assignRes = await makeRequest(
      'PUT',
      `/bookings/admin/${targetAmmarOrderId}/assign`,
      { technicianId: otherTechId },
      ammarToken
    );
    assert(assignRes.status === 403, `Assign technician without permission blocked with 403 Forbidden (Got: ${assignRes.status})`);
    assert(
      assignRes.body.error === 'FORBIDDEN_ASSIGN_PERMISSION' || assignRes.body.error === 'ACCESS_DENIED_PERMISSION',
      'Error code matches FORBIDDEN_ASSIGN_PERMISSION or ACCESS_DENIED_PERMISSION'
    );

    // 8.4 Try Add Note without permission (NOT GRANTED: orders.add_note)
    const noteRes = await makeRequest(
      'PUT',
      `/bookings/admin/${targetAmmarOrderId}/status`,
      { status: 'confirmed', note: 'ملاحظة غير مصرح بها' },
      ammarToken
    );
    assert(noteRes.status === 403, `Adding note without permission blocked with 403 (Got: ${noteRes.status})`);
    assert(noteRes.body.error === 'FORBIDDEN_NOTE_PERMISSION', 'Error code matches FORBIDDEN_NOTE_PERMISSION');

    // 8.5 Try Receive Order (GRANTED: orders.receive)
    const receiveRes = await makeRequest(
      'PUT',
      `/bookings/admin/${targetAmmarOrderId}/status`,
      { status: 'confirmed' },
      ammarToken
    );
    assert(receiveRes.status === 200, `Receive order allowed (Status: ${receiveRes.status})`);
    assert(receiveRes.body.status === 'confirmed', 'Order status updated to confirmed');

    // 8.6 Try Start Execution (GRANTED: orders.start_execution)
    const startRes = await makeRequest(
      'PUT',
      `/bookings/admin/${targetAmmarOrderId}/status`,
      { status: 'in_progress' },
      ammarToken
    );
    assert(startRes.status === 200, `Start execution allowed (Status: ${startRes.status})`);
    assert(startRes.body.status === 'in_progress', 'Order status updated to in_progress');

    // 8.7 Try Complete / Mark Finished (GRANTED: orders.mark_finished)
    const finishRes = await makeRequest(
      'PUT',
      `/bookings/admin/${targetAmmarOrderId}/status`,
      { status: 'completed' },
      ammarToken
    );
    assert(finishRes.status === 200, `Mark finished / complete allowed (Status: ${finishRes.status})`);
    assert(finishRes.body.status === 'completed', 'Order status updated to completed');

    // -------------------------------------------------------------
    // STEP 9: Privilege Escalation Prevention
    // -------------------------------------------------------------
    console.log('\n--- STEP 9: Server-Side Privilege Escalation Prevention ---');

    // 9.1 Access users management
    const usersAccessRes = await makeRequest('GET', '/auth/admin/users', undefined, ammarToken);
    assert(usersAccessRes.status === 403, `Technician cannot access users management (Status: ${usersAccessRes.status})`);

    // 9.2 Access customers management
    const customersAccessRes = await makeRequest('GET', '/customers', undefined, ammarToken);
    assert(customersAccessRes.status === 403, `Technician cannot access customers management (Status: ${customersAccessRes.status})`);

    // 9.3 Self-elevation attempt
    const myProfileRes = await makeRequest('GET', '/auth/admin/me', undefined, ammarToken);
    const myUserId = myProfileRes.body.id;
    const elevateRes = await makeRequest(
      'PUT',
      `/auth/admin/users/${myUserId}`,
      { role: 'owner', userType: 'admin', technicianId: null },
      ammarToken
    );
    assert(elevateRes.status === 403, `Technician cannot edit users or escalate role (Status: ${elevateRes.status})`);

    // -------------------------------------------------------------
    // STEP 10: Inactive Technician Account Blocking
    // -------------------------------------------------------------
    console.log('\n--- STEP 10: Inactive Technician Record Enforcement ---');
    // Deactivate Ammar's technician record
    await Technician.updateOne({ id: ammarTechId }, { active: false });

    // Login must now be blocked
    const inactiveLoginRes = await makeRequest('POST', '/auth/admin/login', {
      username: ammarUsername,
      password: ammarPassword,
    });
    assert(
      inactiveLoginRes.status === 403,
      `Inactive technician login blocked with 403 Forbidden (Got: ${inactiveLoginRes.status})`
    );
    assert(
      inactiveLoginRes.body.error === 'TECHNICIAN_RECORD_INACTIVE',
      'Error code is TECHNICIAN_RECORD_INACTIVE'
    );

    // Existing token must also be rejected
    const inactiveOrdersRes = await makeRequest('GET', '/bookings/admin/all', undefined, ammarToken);
    assert(
      inactiveOrdersRes.status === 403,
      `Existing token for inactive technician rejected with 403 (Got: ${inactiveOrdersRes.status})`
    );

    // Reactivate for hygiene
    await Technician.updateOne({ id: ammarTechId }, { active: true });

    // -------------------------------------------------------------
    // STEP 11: Audit Log Security & Verification
    // -------------------------------------------------------------
    console.log('\n--- STEP 11: Activity Log Security Verification ---');
    // Allow setImmediate in auditService to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    const ammarAdminId = createTechUserRes.body.id || createTechUserRes.body._id;
    const logs = await AuditLog.find({
      $or: [
        { actorName: 'عمار الشريف' },
        { actorName: ammarUsername },
        { actorId: ammarAdminId },
      ],
    });
    assert(logs.length > 0, `Audit logs exist for technician actions (Found: ${logs.length})`);

    const hasUnauthorizedAttemptLog = await AuditLog.findOne({
      action: 'unauthorized_order_access_attempt',
      targetId: targetOtherOrderId,
    });
    assert(
      Boolean(hasUnauthorizedAttemptLog),
      `Security event 'unauthorized_order_access_attempt' logged for order ${targetOtherOrderId}`
    );

    const sensitiveLeaks = await AuditLog.find({
      $or: [
        { details: { $regex: /Password123/ } },
        { action: { $regex: /Password123/ } },
      ],
    });
    assert(sensitiveLeaks.length === 0, 'No passwords or password hashes appear in audit logs');

    console.log('\n============================================================');
    console.log('🎉 ALL 11 TEST PHASES PASSED WITH 100% SUCCESS!');
    console.log('============================================================\n');
  } finally {
    // Cleanup created test records
    try {
      console.log('[Cleanup] Cleaning up test records...');
      await Booking.deleteMany({ id: { $in: [...ammarBookingIds, ...otherBookingIds] } });
      await AdminUser.deleteMany({ username: { $regex: testSuffix } });
      await Technician.deleteMany({ id: { $in: [ammarTechId, otherTechId] } }).catch(() => {});
      await AuditLog.deleteMany({ actorName: ammarUsername }).catch(() => {});
    } catch (cleanErr) {
      console.warn('[Cleanup Warning]', cleanErr);
    }

    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runTechnicianPermissionsSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:\n', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
