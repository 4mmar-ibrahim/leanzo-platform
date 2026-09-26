import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import assert from 'assert';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { Service } from '../src/models/Service.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { CustomerAddress } from '../src/models/CustomerAddress.js';
import { Notification } from '../src/models/Notification.js';
import { Booking } from '../src/models/Booking.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponUsage } from '../src/models/CouponUsage.js';
import { AuditLog } from '../src/models/AuditLog.js';
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
      'User-Agent': 'CleanzoCombinedTaskEndToEndTest/1.0',
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

async function runCombinedTaskTests() {
  console.log('================================================================');
  console.log('🧪 CLEANZO COMBINED TASK: COMPREHENSIVE END-TO-END SYSTEM TEST');
  console.log('   Pillar 1: Customer Permanent Deletion & Active Orders Guard');
  console.log('   Pillar 2: Advanced Admin Filter Engine Server Queries');
  console.log('   Pillar 3: Authoritative Coupon Validation & Atomic Redemption');
  console.log('================================================================');

  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[TestServer] Online on ${baseUrl}`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // Setup Admin and Seeds
    // -------------------------------------------------------------
    let admin = await AdminUser.findOne({ username: 'system_owner' });
    if (!admin) {
      admin = await AdminUser.create({
        username: 'system_owner',
        name: 'مالك المنصة',
        email: 'owner@cleanzo.com',
        role: 'owner',
        status: 'active',
        password: 'Password123!',
        passwordHash: 'hash',
        permissions: {
          customers: 'manage',
          orders: 'manage',
          coupons: 'manage',
          audit: 'manage',
        },
      });
    }
    const adminToken = generateAdminToken({
      id: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    });

    let testGov = await LocationGovernorate.findOne({ id: 'gov-cairo' });
    if (!testGov) {
      testGov = await LocationGovernorate.create({
        id: 'gov-cairo',
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        isActive: true,
        cities: [
          { id: 'city-nasr', name: 'مدينة نصر', nameEn: 'Nasr City', active: true, isActive: true },
          { id: 'city-tagamoa', name: 'التجمع الخامس', nameEn: 'New Cairo', active: true, isActive: true },
        ],
      });
    } else {
      testGov.active = true;
      testGov.cities.forEach((c: any) => (c.active = true));
      await testGov.save();
    }

    let testService = await Service.findOne({ id: 'srv-deep-clean-car' });
    if (!testService) {
      testService = await Service.create({
        id: 'srv-deep-clean-car',
        title: 'غسيل وتطهير سيارة VIP',
        titleEn: 'VIP Car Detailing',
        category: 'car',
        price: 350,
        duration: 90,
        image: '/images/services/car-deep.jpg',
        available: true,
      });
    }

    // =============================================================
    // PILLAR 1: CUSTOMER PERMANENT DELETION & ACTIVE ORDER GUARD
    // =============================================================
    console.log('\n--- [TEST GROUP 1] Customer Permanent Deletion Guard ---');

    // Create Customer A with active order
    const custPhoneA = '01099990001';
    await User.deleteMany({ phone: custPhoneA });
    await Booking.deleteMany({ customerPhone: custPhoneA });

    const custA = await User.create({
      name: 'أحمد محمود العميل النشط',
      phone: custPhoneA,
      email: 'ahmed.active@test.com',
      password: 'CustomerPass123!',
      status: 'active',
      ordersCount: 2,
      totalSpent: 700,
      source: 'website',
    });

    const custTokenA = generateCustomerToken({
      id: custA._id.toString(),
      phone: custA.phone,
    });

    // Create active order (in_progress)
    const activeOrder = await Booking.create({
      id: 'ORD-ACT-001',
      customerId: custA._id,
      customerName: custA.name,
      customerPhone: custA.phone,
      serviceId: testService.id,
      serviceSnapshot: {
        id: testService.id,
        title: testService.title,
        titleEn: testService.titleEn,
        category: testService.category,
        image: testService.image,
        price: testService.price,
        duration: testService.duration,
      },
      category: 'car',
      date: '2026-09-20',
      time: '14:00',
      timeSlotStart: '14:00',
      scheduledStart: new Date('2026-09-20T14:00:00.000Z'),
      scheduledEnd: new Date('2026-09-20T15:30:00.000Z'),
      status: 'in_progress',
      address: {
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        area: 'شارع عباس العقاد',
      },
      basePrice: 350,
      finalPrice: 350,
    });

    // Step 1.1: Attempt deletion while active order exists -> MUST FAIL WITH 400
    console.log('1.1 Attempt DELETE customer with in_progress order (must be blocked)...');
    const deleteBlockedRes = await makeRequest(
      'DELETE',
      `/customers/${custA._id.toString()}`,
      undefined,
      adminToken
    );

    assert.strictEqual(
      deleteBlockedRes.status,
      400,
      `Expected 400 when deleting customer with active order, got ${deleteBlockedRes.status}`
    );
    assert.strictEqual(
      deleteBlockedRes.body.code,
      'CUSTOMER_HAS_ACTIVE_ORDERS',
      `Expected error code CUSTOMER_HAS_ACTIVE_ORDERS, got ${deleteBlockedRes.body.code}`
    );
    assert.ok(
      deleteBlockedRes.body.errors?.activeOrders?.length >= 1,
      'Expected active orders list in blocking error response'
    );
    console.log('✅ PASS: Deletion strictly blocked due to active in_progress order.');

    // Step 1.2: Check customer still exists and token is valid
    const profileCheck1 = await makeRequest('GET', '/auth/customer/profile', undefined, custTokenA);
    assert.strictEqual(profileCheck1.status, 200, 'Customer profile must still be accessible');
    console.log('✅ PASS: Customer account still exists intact.');

    // Step 1.3: Complete active order and add cancelled order (all historical)
    await Booking.findByIdAndUpdate(activeOrder._id, { status: 'completed' });
    const cancelledOrder = await Booking.create({
      id: 'ORD-CAN-002',
      customerId: custA._id,
      customerName: custA.name,
      customerPhone: custA.phone,
      serviceId: testService.id,
      serviceSnapshot: {
        id: testService.id,
        title: testService.title,
        titleEn: testService.titleEn,
        category: testService.category,
        image: testService.image,
        price: testService.price,
        duration: testService.duration,
      },
      category: 'car',
      date: '2026-09-18',
      time: '10:00',
      timeSlotStart: '10:00',
      scheduledStart: new Date('2026-09-18T10:00:00.000Z'),
      scheduledEnd: new Date('2026-09-18T11:30:00.000Z'),
      status: 'cancelled',
      address: {
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        area: 'شارع عباس العقاد',
      },
      basePrice: 350,
      finalPrice: 350,
    });

    // Add address and notification for custA
    await CustomerAddress.create({
      customerId: custA._id,
      customerPhone: custA.phone,
      label: 'المنزل',
      governorateId: 'gov-cairo',
      governorateNameSnapshot: 'القاهرة',
      cityId: 'city-nasr',
      cityNameSnapshot: 'مدينة نصر',
      area: 'شارع عباس العقاد',
    });
    await Notification.create({
      userId: custA._id,
      title: 'مرحبا بك',
      titleEn: 'Welcome',
      message: 'تم تفعيل حسابك بنجاح',
      messageEn: 'Your account has been activated',
      target: 'customer',
    });

    // Step 1.4: Execute permanent deletion now that only historical orders exist -> MUST SUCCEED WITH 200
    console.log('1.4 Execute permanent deletion of customer with only completed/cancelled orders...');
    const deleteSuccessRes = await makeRequest(
      'DELETE',
      `/customers/${custA._id.toString()}`,
      undefined,
      adminToken
    );

    assert.strictEqual(
      deleteSuccessRes.status,
      200,
      `Expected 200 on customer deletion, got ${deleteSuccessRes.status}: ${JSON.stringify(deleteSuccessRes.body)}`
    );
    assert.strictEqual(deleteSuccessRes.body.data.deletedId, custA._id.toString());
    console.log('✅ PASS: Customer deletion executed successfully.');

    // Step 1.5: Verify User document, addresses, and notifications were deleted
    const userDocAfter = await User.findById(custA._id);
    assert.strictEqual(userDocAfter, null, 'User document must be completely removed from MongoDB');

    const addressesAfter = await CustomerAddress.find({ customerId: custA._id });
    assert.strictEqual(addressesAfter.length, 0, 'Customer addresses must be completely deleted');

    const notifsAfter = await Notification.find({ userId: custA._id });
    assert.strictEqual(notifsAfter.length, 0, 'Customer notifications must be completely deleted');
    console.log('✅ PASS: User doc, addresses, and notifications permanently wiped.');

    // Step 1.6: Verify historical orders are preserved with customerId unlinked & metadata snapshot attached
    const preservedOrders = await Booking.find({ id: { $in: ['ORD-ACT-001', 'ORD-CAN-002'] } });
    assert.strictEqual(preservedOrders.length, 2, 'Historical orders must be preserved');
    for (const ord of preservedOrders) {
      assert.strictEqual(ord.customerId, null, 'customerId must be unlinked/null');
      assert.strictEqual(
        (ord.metadata as any)?.customerAccountDeleted,
        true,
        'metadata.customerAccountDeleted must be true'
      );
      assert.strictEqual(
        (ord.metadata as any)?.deletedCustomerSnapshot?.name,
        custA.name,
        'Deleted customer name snapshot must be preserved in order metadata'
      );
    }
    console.log('✅ PASS: Historical completed/cancelled orders preserved with unlinked customerId and snapshots.');

    // Step 1.7: Invalidation test - old customer token MUST BE REJECTED with 401 USER_NOT_FOUND
    const profileCheckAfter = await makeRequest('GET', '/auth/customer/profile', undefined, custTokenA);
    assert.strictEqual(profileCheckAfter.status, 401, 'Deleted user token must fail with 401');
    assert.strictEqual(profileCheckAfter.body.code, 'USER_NOT_FOUND', 'Expected USER_NOT_FOUND error code');
    console.log('✅ PASS: Active JWT token for deleted user is immediately invalidated.');

    // Step 1.8: Audit log verification
    const auditRecord = await AuditLog.findOne({
      action: 'delete_customer_permanent',
      target: custA.name,
    });
    assert.ok(auditRecord, 'AuditLog must have recorded delete_customer_permanent event');
    console.log('✅ PASS: Audit log successfully documented customer deletion.');

    // =============================================================
    // PILLAR 2: ADVANCED MULTI-DIMENSION ADMIN FILTER ENGINE
    // =============================================================
    console.log('\n--- [TEST GROUP 2] Advanced Admin Filter Engine Server Queries ---');

    // Create 3 diverse test customers
    await User.deleteMany({ phone: { $in: ['01011111111', '01022222222', '01033333333'] } });
    const u1 = await User.create({
      name: 'محمود الفلترة الأول',
      phone: '01011111111',
      email: 'filter1@cleanzo.com',
      password: 'CustomerPass123!',
      status: 'active',
      source: 'website',
      totalSpent: 1200,
      ordersCount: 4,
    });
    const u2 = await User.create({
      name: 'سارة الفلترة الثانية',
      phone: '01022222222',
      email: 'filter2@cleanzo.com',
      password: 'CustomerPass123!',
      status: 'inactive',
      source: 'whatsapp',
      totalSpent: 300,
      ordersCount: 1,
    });
    const u3 = await User.create({
      name: 'كريم الفلترة الثالث',
      phone: '01033333333',
      email: 'filter3@cleanzo.com',
      password: 'CustomerPass123!',
      status: 'active',
      source: 'social_media',
      totalSpent: 4500,
      ordersCount: 12,
    });

    // Step 2.1: Filter by status=inactive
    const fStatusRes = await makeRequest('GET', '/customers?status=inactive', undefined, adminToken);
    assert.strictEqual(fStatusRes.status, 200);
    const inactiveFound = fStatusRes.body.data.customers.filter((c: any) => c.phone === '01022222222');
    assert.strictEqual(inactiveFound.length, 1, 'Should find customer with inactive status');
    console.log('✅ PASS: Filter by status=inactive works correctly.');

    // Step 2.2: Filter by source=whatsapp
    const fSourceRes = await makeRequest('GET', '/customers?source=whatsapp', undefined, adminToken);
    assert.strictEqual(fSourceRes.status, 200);
    const whatsappCusts = fSourceRes.body.data.customers.filter((c: any) => c.source === 'whatsapp');
    assert.ok(whatsappCusts.length >= 1, 'Should find whatsapp source customers');
    console.log('✅ PASS: Filter by acquisition source works correctly.');

    // Step 2.3: Filter by minSpent and maxSpent range
    const fSpentRes = await makeRequest('GET', '/customers?minSpent=1000&maxSpent=2000', undefined, adminToken);
    assert.strictEqual(fSpentRes.status, 200);
    const spentFound = fSpentRes.body.data.customers.filter((c: any) => c.phone === '01011111111');
    assert.strictEqual(spentFound.length, 1, 'Should find u1 within 1000-2000 range');
    console.log('✅ PASS: Filter by minSpent/maxSpent range works correctly.');

    // Step 2.4: Orders Filter Engine test on /bookings/admin/all
    const fOrderRes = await makeRequest('GET', '/bookings/admin/all?category=car&minPrice=200', undefined, adminToken);
    assert.strictEqual(fOrderRes.status, 200);
    assert.ok(Array.isArray(fOrderRes.body.data.bookings), 'Expected bookings array');
    console.log('✅ PASS: Bookings multi-parameter filter endpoint queries properly.');

    // =============================================================
    // PILLAR 3: COUPON IN BOOKING FLOW & AUTHORITATIVE VALIDATION
    // =============================================================
    console.log('\n--- [TEST GROUP 3] Coupon Authoritative Engine & Booking Flow ---');

    const couponCode = 'CLEANZOTEST20';
    await Coupon.deleteMany({ code: couponCode });
    await CouponUsage.deleteMany({ couponCode });

    const testCoupon = await Coupon.create({
      code: couponCode,
      name: 'كوبون الخصم التجريبي 20%',
      discountType: 'percentage',
      discountValue: 20,
      totalUsageLimit: 3,
      perCustomerLimit: 1,
      minOrderAmount: 250,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
      currentUsageCount: 0,
    });

    // Step 3.1: Validate coupon with order above minOrderAmount
    console.log('3.1 Validate coupon against order total 350 EGP...');
    const valRes = await makeRequest('POST', '/coupons/validate', {
      code: couponCode,
      basePrice: 350,
      customerPhone: '01088887777',
      serviceId: testService.id,
    });

    assert.strictEqual(valRes.status, 200, `Validation failed: ${JSON.stringify(valRes.body)}`);
    assert.strictEqual(valRes.body.data.code, couponCode);
    assert.strictEqual(valRes.body.data.actualDiscountAmount, 70); // 20% of 350 = 70
    assert.strictEqual(valRes.body.data.finalPrice, 280); // 350 - 70 = 280

    // Verify validation did NOT decrement usage or commit usage record
    const couponCheckAfterVal = await Coupon.findById(testCoupon._id);
    assert.strictEqual(couponCheckAfterVal?.currentUsageCount, 0, 'currentUsageCount must remain 0 after validation');
    const usagesAfterVal = await CouponUsage.countDocuments({ couponCode });
    assert.strictEqual(usagesAfterVal, 0, 'No CouponUsage document should exist after mere validation');
    console.log('✅ PASS: Validation returns authoritative prices without premature usage consumption.');

    // Step 3.2: Test minOrderAmount rejection
    console.log('3.2 Validate coupon with basePrice below minOrderAmount (100 < 250)...');
    const valUnderMinRes = await makeRequest('POST', '/coupons/validate', {
      code: couponCode,
      basePrice: 100,
      customerPhone: '01088887777',
    });
    assert.strictEqual(valUnderMinRes.status, 400);
    assert.strictEqual(valUnderMinRes.body.code, 'MIN_ORDER_NOT_MET');
    console.log('✅ PASS: minOrderAmount constraint enforced accurately.');

    // Step 3.3: Create a real booking with this coupon -> Atomic redemption executed
    console.log('3.3 Create real booking using the coupon and verify atomic redemption...');
    const bookingDate = '2026-09-28';
    const bookingTime = '11:00';
    await Booking.deleteMany({ date: bookingDate, time: bookingTime });
    await Booking.deleteMany({ customerPhone: '01088887777' });

    const bookingRes = await makeRequest('POST', '/bookings', {
      customerName: 'عميل تجربة الكوبون',
      customerPhone: '01088887777',
      serviceId: testService.id,
      date: bookingDate,
      time: bookingTime,
      address: {
        governorateId: 'gov-cairo',
        cityId: 'city-nasr',
        area: 'الحي السابع',
      },
      promoCode: couponCode,
    });

    assert.strictEqual(bookingRes.status, 201, `Booking creation failed: ${JSON.stringify(bookingRes.body)}`);
    const createdBooking = bookingRes.body.data;
    assert.strictEqual(createdBooking.finalPrice, 280, 'Booking finalPrice must be 280 (350 - 70)');
    assert.strictEqual(createdBooking.discount, 70, 'Booking discount must be 70');
    assert.strictEqual(createdBooking.promoCode, couponCode, 'Booking must store applied promoCode');

    // Verify atomic redemption updated Coupon model
    const couponAfterRedeem = await Coupon.findById(testCoupon._id);
    assert.strictEqual(couponAfterRedeem?.currentUsageCount, 1, 'currentUsageCount must be 1 after booking creation');

    // Verify CouponUsage document was created with full metadata
    const usageDoc = await CouponUsage.findOne({ couponCode, customerPhone: '01088887777' });
    assert.ok(usageDoc, 'CouponUsage document must be created');
    assert.strictEqual(usageDoc.actualDiscountAmount, 70);
    assert.strictEqual(usageDoc.orderId, createdBooking.id);
    console.log('✅ PASS: Atomic coupon redemption persisted upon order creation.');

    // Step 3.4: Try using coupon again for same customer -> perCustomerLimit (1) reached -> MUST BE BLOCKED
    console.log('3.4 Try applying same coupon again for same customer (exceeding perCustomerLimit)...');
    const valLimitRes = await makeRequest('POST', '/coupons/validate', {
      code: couponCode,
      basePrice: 350,
      customerPhone: '01088887777',
    });
    assert.strictEqual(valLimitRes.status, 400);
    assert.strictEqual(valLimitRes.body.code, 'CUSTOMER_LIMIT_REACHED');
    console.log('✅ PASS: perCustomerLimit enforced strictly on second attempt.');

    console.log('\n================================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)');
    console.log('================================================================\n');
  } finally {
    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
    await disconnectDB();
  }
}

runCombinedTaskTests().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
