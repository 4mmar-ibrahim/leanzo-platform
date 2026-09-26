import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import assert from 'assert';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { Booking } from '../src/models/Booking.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'User-Agent': 'CleanzoSoftDeleteAndDashboardTest/1.0',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload: string | undefined;
    if (body !== undefined) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
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

    req.on('error', (e) => reject(e));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Customer Soft Delete & Profile Dashboard End-to-End Tests...');
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

  // Setup Admin user & token
  let admin = await AdminUser.findOne({ role: 'owner' });
  if (!admin) {
    admin = await AdminUser.create({
      name: 'Owner Admin',
      username: 'owner_test',
      email: 'owner@cleanzo.com',
      password: 'password123',
      role: 'owner',
      status: 'active',
      permissions: ['*'],
    });
  }
  const adminToken = generateAdminToken({
    id: admin._id.toString(),
    username: admin.username,
    role: admin.role,
  });

  // Test Customer
  const testPhone = `010${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `cust_${Date.now()}@cleanzo-test.com`;

  const customer = await User.create({
    name: 'عميل الاختبار المحذوف',
    phone: testPhone,
    email: testEmail,
    password: 'password123',
    status: 'active',
  });

  // Create Bookings for this customer: 1 completed, 1 in_progress, 1 cancelled
  await Booking.create([
    {
      id: `CLN-TEST-${Date.now()}-1`,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      serviceId: 'srv-deep-clean',
      serviceSnapshot: {
        id: 'srv-deep-clean',
        title: 'غسيل وتفصيل داخلي شامل',
        titleEn: 'Interior Deep Clean',
        category: 'car',
        image: '/car.png',
        price: 350,
        duration: 90,
      },
      category: 'car',
      date: '2026-09-15',
      time: '10:00 AM',
      timeSlotStart: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '11:30',
      duration: 90,
      serviceDurationMinutes: 90,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 105,
      address: {
        governorate: 'القاهرة',
        city: 'المعادي',
        area: 'دجلة',
        label: 'المنزل',
      },
      basePrice: 350,
      discount: 50,
      serviceFee: 0,
      finalPrice: 300,
      currency: 'EGP',
      promoCode: 'CLEANZO50',
      couponSnapshot: {
        couponId: 'cpn-50',
        couponCode: 'CLEANZO50',
        discountType: 'fixed',
        discountValue: 50,
        discountAmount: 50,
        actualDiscountAmount: 50,
        originalPrice: 350,
        finalPrice: 300,
      },
      status: 'completed',
    },
    {
      id: `CLN-TEST-${Date.now()}-2`,
      customerId: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      serviceId: 'srv-home-sofa',
      serviceSnapshot: {
        id: 'srv-home-sofa',
        title: 'تنظيف وتطهير أطقم الكنب',
        titleEn: 'Sofa Deep Clean',
        category: 'home',
        image: '/sofa.png',
        price: 400,
        duration: 60,
      },
      category: 'home',
      date: '2026-09-20',
      time: '02:00 PM',
      timeSlotStart: '14:00',
      scheduledStart: '14:00',
      scheduledEnd: '15:00',
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 75,
      address: {
        governorate: 'القاهرة',
        city: 'المعادي',
        area: 'دجلة',
        label: 'المنزل',
      },
      basePrice: 400,
      discount: 0,
      serviceFee: 0,
      finalPrice: 400,
      currency: 'EGP',
      status: 'in_progress',
    },
  ]);

  console.log('✅ Setup completed: Customer & Bookings created.');

  // ==========================================
  // Test 1: Get Customer Profile Dashboard API
  // ==========================================
  console.log('\n--- Test 1: Fetch Customer Details Dashboard with Real Analytics ---');
  const detailsRes = await makeRequest('GET', `/customers/${customer._id}`, undefined, adminToken);
  assert.strictEqual(detailsRes.status, 200, `Expected 200, got ${detailsRes.status}`);
  assert.ok(detailsRes.body.success, 'Expected success: true');
  assert.ok(detailsRes.body.data.customer, 'Expected customer object');
  assert.ok(detailsRes.body.data.summary, 'Expected summary analytics object');
  assert.strictEqual(detailsRes.body.data.summary.totalOrders, 2, 'Expected 2 total orders');
  assert.strictEqual(detailsRes.body.data.summary.completedOrders, 1, 'Expected 1 completed order');
  assert.strictEqual(detailsRes.body.data.summary.totalSpent, 300, 'Expected 300 total spent');
  assert.strictEqual(detailsRes.body.data.summary.servicesBreakdown.length, 2, 'Expected 2 services breakdown items');
  assert.strictEqual(detailsRes.body.data.summary.promotionsUsed.length, 1, 'Expected 1 promotion used');
  console.log('✅ Test 1 Passed: Customer Details returned real database metrics correctly.');

  // ==========================================
  // Test 2: Execute Soft Delete on Customer
  // ==========================================
  console.log('\n--- Test 2: Execute Soft Delete (Account Deactivation & Ban) ---');
  const deleteRes = await makeRequest('DELETE', `/customers/${customer._id}`, { reason: 'مخالفة سياسة الخدمة' }, adminToken);
  assert.strictEqual(deleteRes.status, 200, `Expected 200, got ${deleteRes.status}`);
  assert.ok(deleteRes.body.success, 'Expected delete success: true');
  assert.strictEqual(deleteRes.body.data.status, 'deleted', 'Expected status to be deleted');
  assert.strictEqual(deleteRes.body.data.isDeleted, true, 'Expected isDeleted to be true');

  // Verify in MongoDB: User document MUST NOT BE DELETED!
  const userInDB = await User.findById(customer._id);
  assert.ok(userInDB !== null, 'User document must still exist in MongoDB (Soft Delete)');
  assert.strictEqual(userInDB?.status, 'deleted', 'User status in DB must be deleted');
  assert.strictEqual(userInDB?.isDeleted, true, 'User isDeleted in DB must be true');
  assert.ok(userInDB?.deletedAt !== undefined, 'User deletedAt must be set');

  // Verify Bookings: Customer bookings MUST NOT BE DELETED or UNLINKED
  const customerBookings = await Booking.find({ customerPhone: testPhone });
  assert.strictEqual(customerBookings.length, 2, 'Expected all 2 bookings preserved in DB');
  const inProgressBooking = customerBookings.find((b) => b.serviceId === 'srv-home-sofa');
  assert.strictEqual(inProgressBooking?.status, 'cancelled', 'In-flight booking should be cancelled upon soft delete');
  const completedBooking = customerBookings.find((b) => b.serviceId === 'srv-deep-clean');
  assert.strictEqual(completedBooking?.status, 'completed', 'Completed historical booking must remain completed');
  console.log('✅ Test 2 Passed: Soft Delete properly modified user, preserved bookings, and cancelled active jobs.');

  // ==========================================
  // Test 3: Login Attempt with Deleted Customer
  // ==========================================
  console.log('\n--- Test 3: Login Attempt with Deleted Customer ---');
  const loginRes = await makeRequest('POST', '/auth/customer/login', {
    phone: testPhone,
    password: 'password123',
  });
  assert.strictEqual(loginRes.status, 403, `Expected 403 Forbidden, got ${loginRes.status}`);
  assert.strictEqual(loginRes.body.code, 'ACCOUNT_DELETED', 'Expected error code ACCOUNT_DELETED');
  console.log('✅ Test 3 Passed: Deleted customer is strictly blocked from logging in with 403.');

  // ==========================================
  // Test 4: Register Attempt with Deleted Phone/Email
  // ==========================================
  console.log('\n--- Test 4: Register Attempt with Banned/Deleted Identifiers ---');
  // Attempt with same phone
  const registerPhoneRes = await makeRequest('POST', '/auth/customer/register', {
    name: 'شخص آخر محتال',
    phone: testPhone,
    password: 'newpassword123',
  });
  assert.strictEqual(registerPhoneRes.status, 409, `Expected 409 Conflict, got ${registerPhoneRes.status}`);
  assert.strictEqual(registerPhoneRes.body.code, 'ACCOUNT_BANNED_OR_DELETED', 'Expected ACCOUNT_BANNED_OR_DELETED');

  // Attempt with same email
  const registerEmailRes = await makeRequest('POST', '/auth/customer/register', {
    name: 'شخص آخر محتال 2',
    phone: '01099998888',
    email: testEmail,
    password: 'newpassword123',
  });
  assert.strictEqual(registerEmailRes.status, 409, `Expected 409 Conflict, got ${registerEmailRes.status}`);
  assert.strictEqual(registerEmailRes.body.code, 'ACCOUNT_BANNED_OR_DELETED', 'Expected ACCOUNT_BANNED_OR_DELETED');
  console.log('✅ Test 4 Passed: Banned/deleted identifiers cannot be reused to register new accounts.');

  // ==========================================
  // Test 5: Restore / Reactivate Customer
  // ==========================================
  console.log('\n--- Test 5: Restore Customer Account ---');
  const restoreRes = await makeRequest('POST', `/customers/${customer._id}/restore`, undefined, adminToken);
  assert.strictEqual(restoreRes.status, 200, `Expected 200, got ${restoreRes.status}`);
  assert.ok(restoreRes.body.success, 'Expected restore success: true');
  assert.strictEqual(restoreRes.body.data.status, 'active', 'Expected status to be active');
  assert.strictEqual(restoreRes.body.data.isDeleted, false, 'Expected isDeleted to be false');

  // Login should now succeed
  const loginAfterRestoreRes = await makeRequest('POST', '/auth/customer/login', {
    phone: testPhone,
    password: 'password123',
  });
  assert.strictEqual(loginAfterRestoreRes.status, 200, `Expected 200 OK after restore, got ${loginAfterRestoreRes.status}`);
  assert.ok(loginAfterRestoreRes.body.data.token, 'Expected login token after restore');
  console.log('✅ Test 5 Passed: Customer restored successfully and login re-enabled.');

  // Clean up test data
  await Booking.deleteMany({ customerPhone: testPhone });
  await User.findByIdAndDelete(customer._id);

  server.close();
  await disconnectDB();
  console.log('\n🎉 ALL 5 END-TO-END TESTS PASSED WITH 100% SUCCESS!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
