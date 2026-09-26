import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import assert from 'assert';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { Service } from '../src/models/Service.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { Booking } from '../src/models/Booking.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponUsage } from '../src/models/CouponUsage.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Technician } from '../src/models/Technician.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';

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
      'User-Agent': 'CleanzoCombinedFixSystemTest/1.0',
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

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runCombinedFixTests() {
  console.log('================================================================');
  console.log('🧪 CLEANZO COMBINED FIX TASK: COMPREHENSIVE END-TO-END TEST');
  console.log('   (Coupons Usage + Order Status Sync + Admin Complete Order)');
  console.log('================================================================\n');

  try {
    await connectDB();

    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    console.log(`📡 Test server running on: ${baseUrl}\n`);

    // 1. Prepare Seed Data
    console.log('🔧 [SETUP] Initializing seed data (Location, Service, Users, Tokens)...');

    // Location
    await LocationGovernorate.deleteMany({ id: 'cairo-test-gov' });
    await LocationGovernorate.create({
      id: 'cairo-test-gov',
      name: 'القاهرة',
      nameEn: 'Cairo',
      order: 1,
      active: true,
      cities: [
        {
          id: 'nasr-city-test',
          name: 'مدينة نصر',
          nameEn: 'Nasr City',
          order: 1,
          active: true,
        },
      ],
    });

    // Service
    await Service.deleteMany({ id: 'test-combined-service' });
    const service = await Service.create({
      id: 'test-combined-service',
      title: 'خدمة غسيل متكاملة (اختبار)',
      titleEn: 'Comprehensive Wash Service (Test)',
      shortDescription: 'خدمة مخصصة لاختبارات التكامل المتزامنة',
      category: 'car',
      image: '/images/test-service.jpg',
      price: 300,
      duration: 60,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      available: true,
      isArchived: false,
    });

    // Admin Users
    let ownerAdmin = await AdminUser.findOne({ username: 'owner-combined@cleanzo.app' });
    if (!ownerAdmin) {
      ownerAdmin = await AdminUser.create({
        name: 'أحمد المالك (اختبار)',
        username: 'owner-combined@cleanzo.app',
        email: 'owner-combined@cleanzo.app',
        password: 'Password@123',
        phone: '01099990001',
        role: 'owner',
        status: 'active',
      });
    }
    const ownerToken = generateAdminToken({
      id: ownerAdmin._id.toString(),
      username: ownerAdmin.username,
      role: ownerAdmin.role,
    });

    let viewerAdmin = await AdminUser.findOne({ username: 'viewer-combined@cleanzo.app' });
    if (!viewerAdmin) {
      viewerAdmin = await AdminUser.create({
        name: 'سامي المشاهد (مشاهد فقط)',
        username: 'viewer-combined@cleanzo.app',
        email: 'viewer-combined@cleanzo.app',
        password: 'Password@123',
        phone: '01099990002',
        role: 'operator',
        status: 'active',
        permissions: {
          orders: 'view',
          coupons: 'view',
        },
      });
    }
    const viewerToken = generateAdminToken({
      id: viewerAdmin._id.toString(),
      username: viewerAdmin.username,
      role: viewerAdmin.role,
    });

    // Customer Users
    let custA = await User.findOne({ phone: '01011112222' });
    if (!custA) {
      custA = await User.create({
        name: 'العميل أحمد أ',
        phone: '01011112222',
        password: 'Password@123',
        status: 'active',
      });
    }
    const tokenCustA = generateCustomerToken({
      id: custA._id.toString(),
      phone: custA.phone,
    });

    let custB = await User.findOne({ phone: '01033334444' });
    if (!custB) {
      custB = await User.create({
        name: 'العميل باسم ب',
        phone: '01033334444',
        password: 'Password@123',
        status: 'active',
      });
    }
    const tokenCustB = generateCustomerToken({
      id: custB._id.toString(),
      phone: custB.phone,
    });

    let custC = await User.findOne({ phone: '01055556666' });
    if (!custC) {
      custC = await User.create({
        name: 'العميل جمال ج',
        phone: '01055556666',
        password: 'Password@123',
        status: 'active',
      });
    }
    const tokenCustC = generateCustomerToken({
      id: custC._id.toString(),
      phone: custC.phone,
    });

    console.log('   ✅ Seed data & authorization credentials established.\n');

    // Clean old test bookings & coupons
    await Booking.deleteMany({ customerPhone: { $in: ['01011112222', '01033334444', '01055556666'] } });
    await Coupon.deleteMany({ code: 'FIX30' });
    await CouponUsage.deleteMany({ customerPhone: { $in: ['01011112222', '01033334444', '01055556666'] } });

    // ========================================================================
    // TEST PHASE 1: COUPON VALIDATION, ATOMIC COMMIT & STRICT LIMITS
    // ========================================================================
    console.log('----------------------------------------------------------------');
    console.log('🧪 TEST 1: COUPON CREATION & VALIDATION PRE-FLIGHT (NO USAGE LEAK)');
    console.log('----------------------------------------------------------------');

    const couponDoc = await Coupon.create({
      code: 'FIX30',
      name: 'كوبون اختبار الخصم الموحد',
      discountType: 'fixed',
      discountValue: 50,
      totalUsageLimit: 3,
      currentUsageCount: 0,
      perCustomerLimit: 2,
      minOrderTotal: 100,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'active',
    });

    // Validate coupon via public endpoint
    const valRes = await makeRequest('POST', '/coupons/validate', {
      code: 'FIX30',
      serviceId: service.id,
      customerPhone: '01011112222',
    });

    assert(valRes.status === 200, `Validate coupon returned 200 (got ${valRes.status})`);
    assert(valRes.body.data.actualDiscountAmount === 50, 'Calculated discount is 50 EGP');

    // CRITICAL: Verify usage counter was NOT incremented by validation alone
    const couponAfterVal = await Coupon.findById(couponDoc._id);
    assert(couponAfterVal?.currentUsageCount === 0, 'Usage counter strictly remains 0 after validation');
    const usagesAfterVal = await CouponUsage.countDocuments({ couponId: couponDoc._id });
    assert(usagesAfterVal === 0, 'No CouponUsage document was created during validation');
    console.log('   ✅ Coupon validation works authoritatively without incrementing usage counters.');

    console.log('\n----------------------------------------------------------------');
    console.log('🧪 TEST 2: ATOMIC COUPON COMMIT UPON BOOKING CREATION');
    console.log('----------------------------------------------------------------');

    // Order 1 by Customer A
    const order1Res = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: service.id,
        date: '2026-10-15',
        time: '10:00 AM',
        address: {
          governorateId: 'cairo-test-gov',
          cityId: 'nasr-city-test',
          area: 'المنطقة الأولى',
          building: '10',
          floor: '2',
        },
        promoCode: 'FIX30',
      },
      tokenCustA
    );

    assert(order1Res.status === 201 || order1Res.status === 200, `Order 1 created successfully with HTTP 201/200 (got ${order1Res.status})`);
    const order1Id = order1Res.body.data.id;
    assert(order1Id, 'Order 1 returned valid ID');

    // Check DB: Counter incremented to 1
    const couponAfterOrder1 = await Coupon.findById(couponDoc._id);
    assert(couponAfterOrder1?.currentUsageCount === 1, `Coupon currentUsageCount is 1 (got ${couponAfterOrder1?.currentUsageCount})`);
    const usageDoc1 = await CouponUsage.findOne({ orderId: order1Id });
    assert(usageDoc1 !== null, 'CouponUsage document created for Order 1');
    assert(usageDoc1?.customerPhone === '01011112222', 'CouponUsage recorded Customer A phone');
    assert(usageDoc1?.actualDiscountAmount === 50, 'CouponUsage recorded 50 EGP discount');

    // Check DB: Booking contains both discountAmount and actualDiscountAmount
    const booking1 = await Booking.findOne({ id: order1Id });
    assert(booking1?.couponSnapshot?.discountAmount === 50, 'couponSnapshot.discountAmount is 50');
    assert(booking1?.couponSnapshot?.actualDiscountAmount === 50, 'couponSnapshot.actualDiscountAmount is 50');
    assert(booking1?.finalPrice === 250, 'Final price is 250 (300 - 50)');
    console.log('   ✅ Order 1 successfully committed coupon usage to DB and snapshots.');

    // Order 2 by Customer A
    const order2Res = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: service.id,
        date: '2026-10-15',
        time: '12:00 PM',
        address: {
          governorateId: 'cairo-test-gov',
          cityId: 'nasr-city-test',
          area: 'المنطقة الأولى',
        },
        promoCode: 'FIX30',
      },
      tokenCustA
    );

    assert(order2Res.status === 201 || order2Res.status === 200, `Order 2 created with HTTP 201/200 (got ${order2Res.status})`);
    const couponAfterOrder2 = await Coupon.findById(couponDoc._id);
    assert(couponAfterOrder2?.currentUsageCount === 2, `Coupon currentUsageCount is 2 (got ${couponAfterOrder2?.currentUsageCount})`);
    console.log('   ✅ Order 2 committed second usage for Customer A (reached per-customer limit of 2).');

    console.log('\n----------------------------------------------------------------');
    console.log('🧪 TEST 3: PER-CUSTOMER LIMIT REJECTION (CUSTOMER A ATTEMPTS ORDER 3)');
    console.log('----------------------------------------------------------------');

    const order3CustARes = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: service.id,
        date: '2026-10-15',
        time: '02:00 PM',
        address: {
          governorateId: 'cairo-test-gov',
          cityId: 'nasr-city-test',
          area: 'المنطقة الأولى',
        },
        promoCode: 'FIX30',
      },
      tokenCustA
    );

    assert(
      order3CustARes.status === 400,
      `Customer A order 3 rejected with HTTP 400 (got ${order3CustARes.status})`
    );
    assert(
      order3CustARes.body.code === 'CUSTOMER_LIMIT_REACHED',
      `Error code is CUSTOMER_LIMIT_REACHED (got ${order3CustARes.body.code})`
    );

    // Verify counter in DB remained 2
    const couponAfterReject = await Coupon.findById(couponDoc._id);
    assert(couponAfterReject?.currentUsageCount === 2, 'Coupon usage count remained 2 after rejected attempt');
    console.log('   ✅ Per-customer limit strictly enforced without creating phantom bookings or leaking usage.');

    console.log('\n----------------------------------------------------------------');
    console.log('🧪 TEST 4: GLOBAL EXHAUSTION (CUSTOMER B USES 3RD, CUSTOMER C BLOCKED)');
    console.log('----------------------------------------------------------------');

    // Customer B creates Order 3 (global limit is 3)
    const order3CustBRes = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: service.id,
        date: '2026-10-15',
        time: '04:00 PM',
        address: {
          governorateId: 'cairo-test-gov',
          cityId: 'nasr-city-test',
          area: 'المنطقة الأولى',
        },
        promoCode: 'FIX30',
      },
      tokenCustB
    );

    assert(order3CustBRes.status === 201 || order3CustBRes.status === 200, `Customer B order 3 succeeded with HTTP 201/200 (got ${order3CustBRes.status})`);
    const couponAfterOrder3 = await Coupon.findById(couponDoc._id);
    assert(couponAfterOrder3?.currentUsageCount === 3, 'Coupon reached global limit of 3');

    // Customer C attempts Order 4
    const order4CustCRes = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: service.id,
        date: '2026-10-15',
        time: '06:00 PM',
        address: {
          governorateId: 'cairo-test-gov',
          cityId: 'nasr-city-test',
          area: 'المنطقة الأولى',
        },
        promoCode: 'FIX30',
      },
      tokenCustC
    );

    assert(order4CustCRes.status === 400, `Customer C rejected with HTTP 400 (got ${order4CustCRes.status})`);
    assert(
      order4CustCRes.body.code === 'COUPON_EXHAUSTED',
      `Error code is COUPON_EXHAUSTED (got ${order4CustCRes.body.code})`
    );
    console.log('   ✅ Global coupon exhaustion verified authoritatively.');

    console.log('\n----------------------------------------------------------------');
    console.log('🧪 TEST 5: ADMIN AGGREGATE COUPON USAGE STATS ENDPOINT');
    console.log('----------------------------------------------------------------');

    const usageAdminRes = await makeRequest(
      'GET',
      `/admin/coupons/${couponDoc._id}/usage`,
      undefined,
      ownerToken
    );

    assert(usageAdminRes.status === 200, `Admin usage returned HTTP 200 (got ${usageAdminRes.status})`);
    const { coupon: couponData, stats, usages } = usageAdminRes.body.data;

    assert(stats.customersCount === 2, `Distinct customersCount is 2 (got ${stats.customersCount})`);
    assert(stats.ordersCount === 3, `ordersCount is 3 (got ${stats.ordersCount})`);
    assert(stats.remaining === 0, `Remaining usages is 0 (got ${stats.remaining})`);
    assert(stats.firstUsedAt !== null, 'firstUsedAt is recorded');
    assert(stats.lastUsedAt !== null, 'lastUsedAt is recorded');
    assert(usages.length === 3, `Usages list length is 3 (got ${usages.length})`);
    assert(usages[0].discountAmount === 50, 'Usages list includes discountAmount');
    console.log('   ✅ Admin coupon usage statistics endpoint verified with aggregate metrics.');

    // ========================================================================
    // TEST PHASE 2: ORDER STATUS SYNCHRONIZATION (DB <-> CUSTOMER <-> ADMIN)
    // ========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('🧪 TEST 6: LIVE ORDER STATUS SYNCHRONIZATION');
    console.log('----------------------------------------------------------------');

    // Check Customer A initial state for Order 1
    const custMyRes1 = await makeRequest('GET', '/bookings/my', undefined, tokenCustA);
    assert(custMyRes1.status === 200, 'Customer bookings fetched successfully');
    const myOrder1 = custMyRes1.body.data.find((b: any) => b.id === order1Id);
    assert(myOrder1, 'Order 1 found in Customer A bookings');
    assert(myOrder1.status === 'pending', `Initial status is pending (got ${myOrder1.status})`);

    // Admin updates status of Order 1 to 'confirmed'
    const statusUpdateRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order1Id}/status`,
      { status: 'confirmed', note: 'تم تأكيد الموعد مع العميل هاتفياً' },
      ownerToken
    );
    assert(statusUpdateRes.status === 200, `Admin status update returned 200 (got ${statusUpdateRes.status})`);

    // Verify DB updated
    const booking1AfterConfirm = await Booking.findOne({ id: order1Id });
    assert(booking1AfterConfirm?.status === 'confirmed', 'DB status updated to confirmed');

    // Verify Customer immediately sees 'confirmed' via GET /api/bookings/my
    const custMyRes2 = await makeRequest('GET', '/bookings/my', undefined, tokenCustA);
    const myOrder1Confirmed = custMyRes2.body.data.find((b: any) => b.id === order1Id);
    assert(myOrder1Confirmed.status === 'confirmed', `Customer GET /my reflects confirmed status (got ${myOrder1Confirmed.status})`);
    console.log('   ✅ Order status synchronization between Admin, DB, and Customer account verified.');

    // ========================================================================
    // TEST PHASE 3: ADMIN DIRECT ORDER COMPLETION & PERMISSIONS
    // ========================================================================
    console.log('\n----------------------------------------------------------------');
    console.log('🧪 TEST 7: ADMIN DIRECT ORDER COMPLETION WORKFLOW');
    console.log('----------------------------------------------------------------');

    // Follow strict order workflow:
    // 1. Assign technician
    let comboTech = await Technician.findOne({ id: 'combo-tech-1' });
    if (!comboTech) {
      comboTech = await Technician.create({
        id: 'combo-tech-1',
        name: 'كابتن محمود المنياوي',
        phone: '01099887766',
        specialty: 'سيارات',
        status: 'available',
      });
    }

    const assignRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order1Id}/assign`,
      { technicianId: comboTech.id },
      ownerToken
    );
    assert.strictEqual(assignRes.status, 200, 'Technician assigned successfully');

    // 2. Start execution (in_progress)
    const inProgRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order1Id}/status`,
      { status: 'in_progress', note: 'بدء تنفيذ الخدمة' },
      ownerToken
    );
    assert.strictEqual(inProgRes.status, 200, 'Order moved to in_progress');

    // 3. Complete order ("تم الانتهاء")
    const completeRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order1Id}/status`,
      { status: 'completed', note: 'تم تنفيذ الخدمة واستلام المستحقات' },
      ownerToken
    );
    assert.strictEqual(completeRes.status, 200, `Complete order returned 200 (got ${completeRes.status})`);

    // Verify DB
    const booking1Completed = await Booking.findOne({ id: order1Id });
    assert(booking1Completed?.status === 'completed', 'DB status is completed');
    assert(booking1Completed?.completedAt instanceof Date, 'completedAt timestamp is recorded in DB');
    assert(booking1Completed?.completedBy?.name === 'أحمد المالك (اختبار)', `completedBy recorded (${booking1Completed?.completedBy?.name})`);

    // Verify Customer account receives 'completed'
    const custMyRes3 = await makeRequest('GET', '/bookings/my', undefined, tokenCustA);
    const myOrder1Done = custMyRes3.body.data.find((b: any) => b.id === order1Id);
    assert(myOrder1Done.status === 'completed', 'Customer account shows order status completed');

    // Verify Audit Log recorded completion
    const auditLog = await AuditLog.findOne({
      entityId: order1Id,
      module: 'orders',
      action: { $in: ['complete_order', 'update_order_status'] },
    }).sort({ createdAt: -1 });

    assert(auditLog !== null, 'Audit log was created for order completion');
    console.log(`   📝 Audit Log description: "${auditLog?.description}"`);
    console.log('   ✅ Admin complete order workflow with completion metadata and audit logging verified.');

    console.log('\n----------------------------------------------------------------');
    console.log('🧪 TEST 8: PERMISSION GUARDS & IDOR PROTECTION');
    console.log('----------------------------------------------------------------');

    // 1. Viewer admin (orders:view only) attempts to update status -> 403 Forbidden
    const viewerForbiddenRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order1Id}/status`,
      { status: 'cancelled' },
      viewerToken
    );
    assert(
      viewerForbiddenRes.status === 403,
      `View-only admin rejected with HTTP 403 (got ${viewerForbiddenRes.status})`
    );
    console.log('   ✅ Role-based access control blocks unauthorized status changes with HTTP 403.');

    // 2. IDOR: Customer B attempts to fetch Customer A's private order -> 403 Forbidden
    const idorRes = await makeRequest('GET', `/bookings/${order1Id}`, undefined, tokenCustB);
    assert(idorRes.status === 403, `IDOR cross-customer access blocked with HTTP 403 (got ${idorRes.status})`);
    console.log('   ✅ IDOR protection verified: Customer cannot access foreign orders.');

    console.log('\n================================================================');
    console.log('🎉 ALL 8 TESTS PASSED SUCCESSFULLY WITH ZERO REGRESSIONS!');
    console.log('================================================================\n');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runCombinedFixTests().catch((err) => {
  console.error('\n❌ TEST FAILED WITH ERROR:', err);
  process.exit(1);
});
