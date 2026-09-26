import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Coupon } from '../src/models/Coupon.js';
import { CouponUsage } from '../src/models/CouponUsage.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Offer } from '../src/models/Offer.js';
import { LocationGovernorate } from '../src/models/Location.js';
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
          let parsed: any = {};
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
    if (body && method !== 'GET' && method !== 'HEAD') {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runOverhaulTests() {
  console.log('====================================================');
  console.log('🧪 COUPON OVERHAUL & HISTORICAL INTEGRITY TEST SUITE');
  console.log('====================================================');

  await connectDB();

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
    // 0. Setup fixtures
    await Coupon.deleteMany({ code: { $in: ['PREMIUM30', 'FAIL', 'HIGH150', 'NEGDISC', 'DATEMISMATCH'] } });
    await CouponUsage.deleteMany({ couponCode: 'PREMIUM30' });
    await Booking.deleteMany({ promoCode: 'PREMIUM30' });

    let owner = await AdminUser.findOne({ role: 'owner' });
    if (!owner) {
      owner = await AdminUser.create({
        name: 'Test Owner',
        username: 'test.owner',
        email: 'test.owner@cleanzo.app',
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

    // Create test services
    const service1 = await Service.findOneAndUpdate(
      { id: 'serv-test-deep-clean' },
      {
        id: 'serv-test-deep-clean',
        title: 'غسيل عميق تجريبي',
        titleEn: 'Test Deep Clean',
        category: 'car',
        price: 500,
        duration: 90,
        image: 'https://images.unsplash.com/photo-deep-clean',
        isArchived: false,
      },
      { upsert: true, new: true }
    );

    const service2 = await Service.findOneAndUpdate(
      { id: 'serv-test-express' },
      {
        id: 'serv-test-express',
        title: 'غسيل سريع تجريبي',
        titleEn: 'Test Express Clean',
        category: 'car',
        price: 150,
        duration: 30,
        image: 'https://images.unsplash.com/photo-express',
        isArchived: false,
      },
      { upsert: true, new: true }
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
      ],
    });

    // Create a promotional offer to test code collisions
    await Offer.findOneAndUpdate(
      { code: 'PROMOCOLLIDE' },
      {
        id: 'off-collide-test',
        code: 'PROMOCOLLIDE',
        title: 'عرض ترويجي للمقارنة',
        titleEn: 'Collision Test Offer',
        discountPercentage: 15,
        active: true,
        expiresAt: '2026-12-31',
        isArchived: false,
      },
      { upsert: true }
    );

    console.log('\n▶ [Test 1] Session Token Refresh & Auto-healing:');
    // Test refresh endpoint with demo token
    const refreshDemo = await makeRequest('POST', '/api/auth/admin/refresh', {}, 'demo-admin-owner-jwt-token');
    assert(refreshDemo.status === 200, 'Refresh with demo token returns HTTP 200');
    assert(Boolean(refreshDemo.body.data?.token), 'Returned valid refreshed token');

    // Test refresh without token in dev mode
    const refreshNoToken = await makeRequest('POST', '/api/auth/admin/refresh');
    assert(refreshNoToken.status === 200, 'Refresh without auth header provides valid session');

    console.log('\n▶ [Test 2] Backend Validation on Coupon Creation:');
    // 2a. Missing fields
    const resMissing = await makeRequest('POST', '/api/admin/coupons', { code: 'FAIL' }, ownerToken);
    assert(resMissing.status === 422, 'Missing required fields rejected with HTTP 422');

    // 2b. Percentage > 100
    const resHighPercent = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'HIGH150',
        discountType: 'percentage',
        discountValue: 150,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      ownerToken
    );
    assert(resHighPercent.status === 422, 'Percentage > 100% rejected with HTTP 422');

    // 2c. Negative discount
    const resNegative = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'NEGDISC',
        discountType: 'fixed',
        discountValue: -50,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      ownerToken
    );
    assert(resNegative.status === 422, 'Negative discount rejected with HTTP 422');

    // 2d. StartDate after EndDate
    const resDateMismatch = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'DATEMISMATCH',
        discountType: 'fixed',
        discountValue: 50,
        startDate: '2026-12-31',
        endDate: '2026-01-01',
      },
      ownerToken
    );
    assert(resDateMismatch.status === 422, 'StartDate > EndDate rejected with HTTP 422');

    // 2e. Collision with Offer Code
    const resOfferCollision = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'PROMOCOLLIDE',
        discountType: 'fixed',
        discountValue: 50,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      ownerToken
    );
    assert(resOfferCollision.status === 409, 'Code colliding with Offer rejected with HTTP 409');

    console.log('\n▶ [Test 3] Create Valid Coupon with Conditions (Min Order, Max Cap, Applicable Services):');
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const createRes = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'PREMIUM30',
        name: 'كوبون الخصم الذهبي',
        discountType: 'percentage',
        discountValue: 30,
        totalUsageLimit: 50,
        perCustomerLimit: 2,
        minOrderAmount: 300, // Order must be >= 300 EGP
        maxDiscount: 100, // Max cap of 100 EGP even if 30% of 500 = 150
        applicableServiceIds: ['serv-test-deep-clean'], // Only for deep clean
        startDate: today,
        endDate: nextMonth,
        status: 'active',
      },
      ownerToken
    );

    assert(createRes.status === 201, 'Coupon created successfully with HTTP 201');
    const createdCoupon = createRes.body.data;
    assert(createdCoupon.code === 'PREMIUM30', 'Coupon code is PREMIUM30');
    assert(createdCoupon.minOrderAmount === 300, 'Stored minOrderAmount = 300');
    assert(createdCoupon.maxDiscount === 100, 'Stored maxDiscount = 100');
    assert(
      Array.isArray(createdCoupon.applicableServiceIds) && createdCoupon.applicableServiceIds.includes('serv-test-deep-clean'),
      'Stored applicableServiceIds correctly'
    );

    // 3b. Duplicate code check on coupons
    const dupRes = await makeRequest(
      'POST',
      '/api/admin/coupons',
      {
        code: 'PREMIUM30',
        discountType: 'fixed',
        discountValue: 50,
        startDate: today,
        endDate: nextMonth,
      },
      ownerToken
    );
    assert(dupRes.status === 409, 'Duplicate coupon code rejected with HTTP 409');

    console.log('\n▶ [Test 4] Customer Checkout Validation of Conditions:');
    // 4a. Apply on non-applicable service (serv-test-express) -> should fail with SERVICE_NOT_APPLICABLE
    const resWrongService = await makeRequest('POST', '/api/coupons/validate', {
      code: 'PREMIUM30',
      serviceId: 'serv-test-express',
      basePrice: 150,
      customerPhone: '01055556666',
    });
    assert(resWrongService.status === 400, 'Rejected for non-applicable service with HTTP 400');
    assert(resWrongService.body.code === 'SERVICE_NOT_APPLICABLE', 'Error code is SERVICE_NOT_APPLICABLE');

    // 4b. Apply with price below minOrderAmount (250 < 300) -> should fail with MIN_ORDER_NOT_MET
    const resLowAmount = await makeRequest('POST', '/api/coupons/validate', {
      code: 'PREMIUM30',
      serviceId: 'serv-test-deep-clean',
      basePrice: 200,
      customerPhone: '01055556666',
    });
    assert(resLowAmount.status === 400, 'Rejected for low order amount with HTTP 400');
    assert(resLowAmount.body.code === 'MIN_ORDER_NOT_MET', 'Error code is MIN_ORDER_NOT_MET');

    // 4c. Apply correctly on deep clean (500 EGP >= 300 EGP): 30% of 500 = 150, but maxDiscount cap = 100!
    const resValid = await makeRequest('POST', '/api/coupons/validate', {
      code: 'PREMIUM30',
      serviceId: 'serv-test-deep-clean',
      basePrice: 500,
      customerPhone: '01055556666',
    });
    assert(resValid.status === 200, 'Valid coupon application returns HTTP 200');
    assert(resValid.body.data.actualDiscountAmount === 100, 'Actual discount capped at maxDiscount (100 EGP)');
    assert(resValid.body.data.finalPrice === 400, 'Final price is 400 EGP (500 - 100)');

    console.log('\n▶ [Test 5] Historical Integrity (Order retains snapshot after coupon is deleted):');
    // Place real order with PREMIUM30
    const orderRes = await makeRequest('POST', '/api/bookings', {
      serviceId: 'serv-test-deep-clean',
      date: '2026-10-15',
      time: '11:00 AM',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة الجديدة',
        area: 'التجمع الخامس',
      },
      promoCode: 'PREMIUM30',
      guestName: 'عميل الحماية التاريخية',
      guestPhone: '01055556666',
    });

    assert(orderRes.status === 201, `Order placed successfully with HTTP 201: ${JSON.stringify(orderRes.body)}`);
    const order = orderRes.body.data;
    const orderId = order.id;
    assert(Boolean(order.couponSnapshot), 'Order contains couponSnapshot');
    assert(order.couponSnapshot.couponCode === 'PREMIUM30', 'Snapshot recorded PREMIUM30');
    assert(order.couponSnapshot.actualDiscountAmount === 100, 'Snapshot recorded 100 EGP discount');
    assert(order.finalPrice === 400, 'Order final price is 400 EGP');

    // Now Admin deletes / archives the coupon
    const couponId = createdCoupon._id || createdCoupon.id;
    const deleteRes = await makeRequest('DELETE', `/api/admin/coupons/${couponId}`, undefined, ownerToken);
    assert(deleteRes.status === 200, `Coupon archived/deleted by admin with HTTP 200: ${deleteRes.status} ${JSON.stringify(deleteRes.body)}`);

    // Confirm that new customer checkout rejects the deleted coupon
    const checkoutDeleted = await makeRequest('POST', '/api/coupons/validate', {
      code: 'PREMIUM30',
      serviceId: 'serv-test-deep-clean',
      basePrice: 500,
      customerPhone: '01099998888',
    });
    assert(checkoutDeleted.status === 404, 'Deleted coupon rejected at checkout with HTTP 404');

    // Now fetch the past order from admin orders API and verify historical integrity
    const orderFetch = await makeRequest('GET', `/api/bookings/admin/${orderId}`, undefined, ownerToken);
    assert(orderFetch.status === 200, `Historical order fetched with HTTP 200: ${orderFetch.status} ${JSON.stringify(orderFetch.body)}`);
    const fetchedOrder = orderFetch.body.data;
    assert(Boolean(fetchedOrder.couponSnapshot), 'Historical order still has couponSnapshot');
    assert(fetchedOrder.couponSnapshot.couponCode === 'PREMIUM30', 'Historical snapshot code preserved');
    assert(fetchedOrder.couponSnapshot.actualDiscountAmount === 100, 'Historical discount preserved (100 EGP)');
    assert(fetchedOrder.finalPrice === 400, 'Historical final price preserved (400 EGP)');
    assert(fetchedOrder.discount === 100, 'Historical discount field preserved');

    console.log('====================================================');
    console.log('🎉 ALL OVERHAUL & HISTORICAL INTEGRITY TESTS PASSED!');
    console.log('====================================================');
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runOverhaulTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
