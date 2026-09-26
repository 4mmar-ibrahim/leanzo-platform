import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Coupon } from '../src/models/Coupon.js';
import { CouponUsage } from '../src/models/CouponUsage.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Role } from '../src/models/Role.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;
let restrictedAdminToken: string;
let customerToken: string;

let testServiceId = 'serv-car-test';
const customerPhoneA = '01011112222';
const customerPhoneB = '01033334444';

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
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
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
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = { raw: rawData };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runCouponTests() {
  console.log('====================================================');
  console.log('🧪 CLEANZO TASK 01: COMPREHENSIVE COUPON TEST SUITE');
  console.log('====================================================');

  await connectDB();

  // Start dedicated test HTTP server on an ephemeral port
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      console.log(`📡 Test server running on ${baseUrl}`);
      resolve();
    });
  });

  try {
    // 0. Setup test fixtures: Admin, Roles, Service
    console.log('\n🔧 Setting up test database fixtures...');

    await Coupon.deleteMany({});
    await CouponUsage.deleteMany({});
    await Booking.deleteMany({ id: { $regex: /^CLZ-TEST-/ } });

    // Seed Owner
    let owner = await AdminUser.findOne({ role: 'owner' });
    if (!owner) {
      owner = await AdminUser.create({
        name: 'Test Owner',
        username: 'test.owner',
        email: 'owner@test.com',
        phone: '01000000001',
        password: 'password123',
        role: 'owner',
        status: 'active',
      });
    }
    ownerToken = generateAdminToken({
      id: owner._id.toString(),
      role: 'owner',
      username: owner.username,
    });

    // Seed Restricted Admin without coupons permission
    await Role.findOneAndUpdate(
      { id: 'restricted_role' },
      {
        id: 'restricted_role',
        name: 'Restricted Staff',
        nameAr: 'طاقم محدود',
        permissions: {
          dashboard: ['view'],
          services: ['view'],
        },
      },
      { upsert: true }
    );

    const restrictedAdmin = await AdminUser.findOneAndUpdate(
      { username: 'restricted.staff' },
      {
        name: 'Restricted Staff',
        username: 'restricted.staff',
        email: 'restricted@test.com',
        phone: '01000000002',
        password: 'password123',
        role: 'restricted_role',
        status: 'active',
      },
      { upsert: true, new: true }
    );

    restrictedAdminToken = generateAdminToken({
      id: restrictedAdmin._id.toString(),
      role: 'restricted_role',
      username: restrictedAdmin.username,
    });

    // Seed Test Service (Base price: 250 EGP)
    await Service.findOneAndUpdate(
      { id: testServiceId },
      {
        id: testServiceId,
        title: 'باقة غسيل اختبارية',
        titleEn: 'Test Wash Package',
        description: 'Test service description',
        descriptionEn: 'Test service description',
        category: 'car',
        price: 250,
        duration: 60,
        image: 'https://images.unsplash.com/photo-test',
        active: true,
      },
      { upsert: true }
    );

    // Seed Location for Booking validation
    await LocationGovernorate.deleteMany({});
    await LocationGovernorate.create({
      id: 'cairo',
      name: 'القاهرة',
      nameEn: 'Cairo',
      active: true,
      cities: [
        {
          id: 'new-cairo',
          name: 'القاهرة الجديدة',
          nameEn: 'New Cairo',
          active: true,
          areas: [],
        },
        {
          id: 'nasr-city',
          name: 'مدينة نصر',
          nameEn: 'Nasr City',
          active: true,
          areas: [],
        },
        {
          id: 'maadi',
          name: 'المعادي',
          nameEn: 'Maadi',
          active: true,
          areas: [],
        },
      ],
    });

    await Booking.deleteMany({ date: { $in: ['2026-10-01', '2026-10-02', '2026-10-03'] } });

    // =========================================================================
    // 1. Create Percentage Coupon
    // =========================================================================
    console.log('\n▶ [Test 1] Create Percentage Coupon:');
    const createPercRes = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'TESTPERC20',
        name: 'كوبون نسبة 20%',
        discountType: 'percentage',
        discountValue: 20,
        totalUsageLimit: 10,
        perCustomerLimit: 2,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'active',
      },
      ownerToken
    );
    assert(createPercRes.status === 201, 'Percentage coupon created with HTTP 201');
    assert(createPercRes.body.data.code === 'TESTPERC20', 'Coupon code is uppercase TESTPERC20');
    assert(createPercRes.body.data.discountType === 'percentage', 'Discount type is percentage');
    assert(createPercRes.body.data.discountValue === 20, 'Discount value is 20');

    // =========================================================================
    // 2. Create Fixed Amount Coupon
    // =========================================================================
    console.log('\n▶ [Test 2] Create Fixed Amount Coupon:');
    const createFixedRes = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'TESTFIXED50',
        name: 'قسيمة خصم 50 ج.م ثابتة',
        discountType: 'fixed',
        discountValue: 50,
        totalUsageLimit: 10,
        perCustomerLimit: 2,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'active',
      },
      ownerToken
    );
    assert(createFixedRes.status === 201, 'Fixed coupon created with HTTP 201');
    assert(createFixedRes.body.data.discountType === 'fixed', 'Discount type is fixed');
    assert(createFixedRes.body.data.discountValue === 50, 'Discount value is 50');

    // =========================================================================
    // 3. Valid Usage Calculation
    // =========================================================================
    console.log('\n▶ [Test 3] Authoritative Validation via POST /api/coupons/validate:');
    const valPercRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'TESTPERC20',
      serviceId: testServiceId,
      customerPhone: customerPhoneA,
    });
    assert(valPercRes.status === 200, 'Validate returned HTTP 200');
    assert(valPercRes.body.data.originalPrice === 250, 'Original price is 250 EGP');
    assert(valPercRes.body.data.actualDiscountAmount === 50, 'Calculated 20% of 250 = 50 EGP');
    assert(valPercRes.body.data.finalPrice === 200, 'Final price is 200 EGP (250 - 50)');

    const valFixedRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'TESTFIXED50',
      serviceId: testServiceId,
      customerPhone: customerPhoneA,
    });
    assert(valFixedRes.body.data.actualDiscountAmount === 50, 'Calculated fixed discount = 50 EGP');
    assert(valFixedRes.body.data.finalPrice === 200, 'Final price is 200 EGP (250 - 50)');

    // =========================================================================
    // 4. Expired Coupon Rejection
    // =========================================================================
    console.log('\n▶ [Test 4] Expired Coupon Rejection:');
    await Coupon.create({
      code: 'EXPIRED_TEST',
      discountType: 'percentage',
      discountValue: 15,
      totalUsageLimit: 10,
      currentUsageCount: 0,
      perCustomerLimit: 1,
      startDate: '2025-01-01',
      endDate: '2025-02-01', // Past date
      status: 'active',
    });
    const expRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'EXPIRED_TEST',
      serviceId: testServiceId,
    });
    assert(expRes.status === 400, 'Expired coupon rejected with HTTP 400');
    assert(expRes.body.code === 'COUPON_EXPIRED', 'Error code is COUPON_EXPIRED');

    // =========================================================================
    // 5. Future / Not-Started Coupon Rejection
    // =========================================================================
    console.log('\n▶ [Test 5] Future / Not-Started Coupon Rejection:');
    await Coupon.create({
      code: 'FUTURE_TEST',
      discountType: 'percentage',
      discountValue: 15,
      totalUsageLimit: 10,
      currentUsageCount: 0,
      perCustomerLimit: 1,
      startDate: '2030-01-01', // Future date
      endDate: '2030-12-31',
      status: 'active',
    });
    const futureRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'FUTURE_TEST',
      serviceId: testServiceId,
    });
    assert(futureRes.status === 400, 'Future coupon rejected with HTTP 400');
    assert(futureRes.body.code === 'COUPON_NOT_STARTED', 'Error code is COUPON_NOT_STARTED');

    // =========================================================================
    // 6. Disabled / Inactive Coupon Rejection
    // =========================================================================
    console.log('\n▶ [Test 6] Disabled Coupon Rejection:');
    await Coupon.create({
      code: 'DISABLED_TEST',
      discountType: 'percentage',
      discountValue: 10,
      totalUsageLimit: 10,
      currentUsageCount: 0,
      perCustomerLimit: 1,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'inactive',
    });
    const disabledRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'DISABLED_TEST',
      serviceId: testServiceId,
    });
    assert(disabledRes.status === 400, 'Disabled coupon rejected with HTTP 400');
    assert(disabledRes.body.code === 'COUPON_DISABLED', 'Error code is COUPON_DISABLED');

    // =========================================================================
    // 7. Total Usage Limit Exhausted
    // =========================================================================
    console.log('\n▶ [Test 7] Total Usage Exhausted Rejection:');
    await Coupon.create({
      code: 'EXHAUSTED_TEST',
      discountType: 'percentage',
      discountValue: 20,
      totalUsageLimit: 5,
      currentUsageCount: 5, // Fully reached
      perCustomerLimit: 2,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
    });
    const exhaustRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'EXHAUSTED_TEST',
      serviceId: testServiceId,
    });
    assert(exhaustRes.status === 400, 'Exhausted coupon rejected with HTTP 400');
    assert(exhaustRes.body.code === 'COUPON_EXHAUSTED', 'Error code is COUPON_EXHAUSTED');

    // =========================================================================
    // 8 & 9. Customer Limit: Phone A uses twice within limit (limit = 2)
    // =========================================================================
    console.log('\n▶ [Test 8 & 9] Customer Usage Limit (Customer A uses twice):');
    // Booking 1 with Customer A
    const bookA1 = await makeRequest('POST', '/api/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: '2026-10-01',
      time: '10:00 AM',
      guestPhone: customerPhoneA,
      guestName: 'عميل أ',
      promoCode: 'TESTPERC20',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة الجديدة',
        area: 'التجمع الخامس',
      },
    });
    assert(bookA1.status === 201, `Booking 1 for Customer A completed with HTTP 201: ${JSON.stringify(bookA1.body)}`);
    assert(bookA1.body.data.finalPrice === 200, 'Booking 1 final price is 200 EGP');

    // Booking 2 with Customer A
    const bookA2 = await makeRequest('POST', '/api/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: '2026-10-01',
      time: '01:00 PM',
      guestPhone: customerPhoneA,
      guestName: 'عميل أ',
      promoCode: 'TESTPERC20',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة الجديدة',
        area: 'التجمع الخامس',
      },
    });
    assert(bookA2.status === 201, 'Booking 2 for Customer A completed with HTTP 201');

    // Verify Coupon currentUsageCount is 2
    const couponAfterA2 = await Coupon.findOne({ code: 'TESTPERC20' });
    assert(couponAfterA2?.currentUsageCount === 2, 'Coupon usage count incremented to 2');

    // =========================================================================
    // 10. 3rd Attempt by Customer A is REJECTED
    // =========================================================================
    console.log('\n▶ [Test 10] 3rd Attempt by Customer A (Should be rejected):');
    const bookA3 = await makeRequest('POST', '/api/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: '2026-10-01',
      time: '04:00 PM',
      guestPhone: customerPhoneA,
      guestName: 'عميل أ',
      promoCode: 'TESTPERC20',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة الجديدة',
        area: 'التجمع الخامس',
      },
    });
    assert(bookA3.status === 400 || bookA3.status === 422, '3rd Booking attempt by Customer A rejected with HTTP 400/422');
    assert(bookA3.body.code === 'CUSTOMER_LIMIT_REACHED' || bookA3.body.code === 'PRICING_VALIDATION_ERROR', 'Code is CUSTOMER_LIMIT_REACHED or PRICING_VALIDATION_ERROR');

    // =========================================================================
    // 11. Customer B uses the same coupon successfully
    // =========================================================================
    console.log('\n▶ [Test 11] Customer B uses the same coupon:');
    const bookB1 = await makeRequest('POST', '/api/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: '2026-10-01',

      time: '04:00 PM',
      guestPhone: customerPhoneB,
      guestName: 'عميل ب',
      promoCode: 'TESTPERC20',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة الجديدة',
        area: 'التجمع الخامس',
      },
    });
    assert(bookB1.status === 201, 'Booking 1 for Customer B completed successfully');
    const couponAfterB1 = await Coupon.findOne({ code: 'TESTPERC20' });
    assert(couponAfterB1?.currentUsageCount === 3, 'Coupon usage count incremented to 3');

    // =========================================================================
    // 12 & 13. Race Conditions & Atomic Protection on the LAST remaining usage
    // =========================================================================
    console.log('\n▶ [Test 12 & 13] Race Condition Safety on Final Remaining Usage:');
    // Create a coupon with totalUsageLimit: 1, currentUsageCount: 0
    await Coupon.create({
      code: 'FINAL_USE_RACE',
      discountType: 'fixed',
      discountValue: 30,
      totalUsageLimit: 1,
      currentUsageCount: 0,
      perCustomerLimit: 1,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
    });

    // Simulate 2 parallel concurrent booking attempts competing for the ONLY 1 usage
    const p1 = makeRequest('POST', '/api/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: '2026-10-02',
      time: '10:00 AM',
      guestPhone: '01055551111',
      guestName: 'متنافس 1',
      promoCode: 'FINAL_USE_RACE',
      address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'مكرم عبيد' },
    });

    const p2 = makeRequest('POST', '/api/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: '2026-10-02',
      time: '11:00 AM',
      guestPhone: '01066662222',
      guestName: 'متنافس 2',
      promoCode: 'FINAL_USE_RACE',
      address: { governorate: 'القاهرة', city: 'مدينة نصر', area: 'مكرم عبيد' },
    });

    const [res1, res2] = await Promise.all([p1, p2]);
    const successes = [res1, res2].filter((r) => r.status === 201);
    const failures = [res1, res2].filter((r) => r.status !== 201);

    assert(successes.length === 1, 'Exactly 1 concurrent request succeeded');
    assert(failures.length === 1, 'The other concurrent request failed safely');

    const raceCoupon = await Coupon.findOne({ code: 'FINAL_USE_RACE' });
    assert(raceCoupon?.currentUsageCount === 1, 'Coupon usage count strictly equals 1 (no over-allocation)');

    // =========================================================================
    // 14. Frontend Price Tampering Rejection
    // =========================================================================
    console.log('\n▶ [Test 14] Frontend Price Tampering:');
    // Frontend sends fake discount: 999 and finalPrice: 1
    const tamperRes = await makeRequest('POST', '/api/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: '2026-10-02',
      time: '02:00 PM',
      guestPhone: '01077773333',
      guestName: 'محاول التلاعب',
      promoCode: 'TESTFIXED50',
      discount: 999, // Fake
      finalPrice: 1, // Fake
      address: { governorate: 'القاهرة', city: 'المعادي', area: 'دجلة' },
    });
    assert(tamperRes.status === 201, 'Order created');
    assert(
      tamperRes.body.data.discount === 50,
      'Backend calculated authoritative discount = 50, ignoring client 999'
    );
    assert(
      tamperRes.body.data.finalPrice === 200,
      'Backend calculated authoritative finalPrice = 200, ignoring client 1'
    );

    // =========================================================================
    // 15. Order Snapshot Immutability
    // =========================================================================
    console.log('\n▶ [Test 15] Order Snapshot Immutability:');
    const createdBooking = tamperRes.body.data;
    assert(createdBooking.couponSnapshot !== undefined, 'Booking contains couponSnapshot');
    assert(createdBooking.couponSnapshot.couponCode === 'TESTFIXED50', 'Snapshot records TESTFIXED50');
    assert(createdBooking.couponSnapshot.discountValue === 50, 'Snapshot records discount value 50');

    // Admin edits the coupon to 100 EGP or disables it
    await Coupon.findOneAndUpdate({ code: 'TESTFIXED50' }, { discountValue: 100, status: 'inactive' });

    // Re-fetch booking from DB
    const fetchedBooking = await Booking.findOne({ id: createdBooking.id });
    assert(
      fetchedBooking?.couponSnapshot?.discountValue === 50,
      'Historical order snapshot unchanged (still 50 EGP) after coupon was edited/disabled'
    );
    assert(
      fetchedBooking?.finalPrice === 200,
      'Historical final price remains 200 EGP'
    );

    // =========================================================================
    // 16. Admin Permissions & Authorization
    // =========================================================================
    console.log('\n▶ [Test 16] Admin Permissions (RBAC):');
    // Unauthenticated access rejected
    const unauthRes = await makeRequest('GET', '/api/admin/coupons');
    assert(unauthRes.status === 401, 'Unauthenticated request returned HTTP 401');

    // Restricted Admin without 'coupons' permission rejected
    const forbidRes = await makeRequest('GET', '/api/admin/coupons', undefined, restrictedAdminToken);
    assert(forbidRes.status === 403, 'Restricted admin returned HTTP 403 Forbidden');

    // Owner has full access
    const ownerListRes = await makeRequest('GET', '/api/admin/coupons', undefined, ownerToken);
    assert(ownerListRes.status === 200, 'Owner accessed coupons list with HTTP 200');
    assert(Array.isArray(ownerListRes.body.data.coupons), 'Returned array of coupons');
    assert(ownerListRes.body.data.stats.totalCoupons > 0, 'KPI stats computed properly');

    // =========================================================================
    // 17. Admin Edit & Enable/Disable
    // =========================================================================
    console.log('\n▶ [Test 17] Admin Edit & Status Toggle:');
    const targetCoupon = await Coupon.findOne({ code: 'TESTPERC20' });
    const patchRes = await makeRequest(
      'PATCH',
      `/api/admin/coupons/${targetCoupon?._id}`,
      { status: 'inactive', name: 'تم التعطيل بواسطة المشرف' },
      ownerToken
    );
    assert(patchRes.status === 200, 'Coupon status updated to inactive');
    assert(patchRes.body.data.status === 'inactive', 'Coupon status confirmed inactive');

    // Validate that it is now rejected by public checkout
    const checkDisabled = await makeRequest('POST', '/api/coupons/validate', {
      code: 'TESTPERC20',
      serviceId: testServiceId,
    });
    assert(checkDisabled.status === 400, 'Disabled coupon rejected at checkout');

    // =========================================================================
    // 18. Soft-Delete / Archive
    // =========================================================================
    console.log('\n▶ [Test 18] Soft-Delete / Archive Coupon:');
    const delRes = await makeRequest(
      'DELETE',
      `/api/admin/coupons/${targetCoupon?._id}`,
      undefined,
      ownerToken
    );
    assert(delRes.status === 200, 'Coupon deleted/archived with HTTP 200');

    const archivedCoupon = await Coupon.findById(targetCoupon?._id);
    assert(archivedCoupon?.isArchived === true, 'Coupon is marked isArchived: true');

    // Past booking referencing it is still intact
    const pastBook = await Booking.findOne({ 'couponSnapshot.couponCode': 'TESTPERC20' });
    assert(pastBook !== null, 'Past booking record exists and is completely intact');

    // =========================================================================
    // 19. Audit Log Verification
    // =========================================================================
    console.log('\n▶ [Test 19] Audit Log Verification:');
    const auditLogs = await AuditLog.find({ module: 'coupons' });
    assert(auditLogs.length >= 5, 'Found audit logs for coupon operations');

    const actions = auditLogs.map((l) => l.action);
    console.log(`  Logged actions: ${actions.join(', ')}`);
    assert(actions.includes('Coupon created'), 'Logged: Coupon created');
    assert(actions.includes('Coupon applied'), 'Logged: Coupon applied');
    assert(actions.includes('Coupon rejected'), 'Logged: Coupon rejected');
    assert(actions.includes('Coupon disabled'), 'Logged: Coupon disabled');
    assert(actions.includes('Coupon deleted/archived'), 'Logged: Coupon deleted/archived');

    // Verify no passwords or tokens were stored in audit metadata
    for (const log of auditLogs) {
      const serialized = JSON.stringify(log);
      assert(!serialized.includes('password123'), 'Audit log contains NO passwords');
      assert(!serialized.includes('Bearer'), 'Audit log contains NO bearer tokens');
    }

    // =========================================================================
    // 20. Database Consistency & Usage Queries
    // =========================================================================
    console.log('\n▶ [Test 20] Database Consistency & Usage API:');
    const fixedCoupon = await Coupon.findOne({ code: 'TESTFIXED50' });
    const usageRes = await makeRequest(
      'GET',
      `/api/admin/coupons/${fixedCoupon?._id}/usage`,
      undefined,
      ownerToken
    );
    assert(usageRes.status === 200, 'Usage endpoint returned HTTP 200');
    assert(Array.isArray(usageRes.body.data.usages), 'Returned usages list');
    assert(usageRes.body.data.usages.length > 0, 'Found usage entries for TESTFIXED50');

    console.log('\n====================================================');
    console.log('🎉 ALL 20 TEST SUITES PASSED WITH 100% SUCCESS!');
    console.log('====================================================');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runCouponTests().catch((err) => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
