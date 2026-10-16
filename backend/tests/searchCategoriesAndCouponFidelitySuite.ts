import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import prisma from '../src/config/prisma.js';
import { Service } from '../src/models/Service.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponUsage } from '../src/models/CouponUsage.js';
import { Booking } from '../src/models/Booking.js';
import { User } from '../src/models/User.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { validateCoupon } from '../src/services/couponService.js';
import { searchServices, normalizeArabicText, matchesCategory } from '../src/utils/arabicSearchUtils.js';

let server: http.Server;
let baseUrl: string;

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
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode || 500,
              body: data ? JSON.parse(data) : {},
            });
          } catch (e) {
            resolve({
              status: res.statusCode || 500,
              body: { raw: data },
            });
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

async function runSuite() {
  console.log('\n======================================================');
  console.log('🚀 CLEANZO SEARCH, CATEGORIES & COUPON FIDELITY SUITE');
  console.log('======================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  const testPhone = '01099998877';

  try {
    // -------------------------------------------------------------------------
    // TEST SECTION 1: ARABIC LINGUISTIC SEARCH NORMALIZATION & CORPUS MATCHING
    // -------------------------------------------------------------------------
    console.log('--- TEST SECTION 1: Arabic Linguistic Search Normalization ---');

    // Unit test normalization
    assert(normalizeArabicText('سَجَّادٌ') === 'سجاد', 'Tashkeel / diacritics stripped correctly');
    assert(normalizeArabicText('إتقان وأمان') === 'اتقان وامان', 'Alef forms normalized (إ, أ -> ا)');
    assert(normalizeArabicText('نظافة فائقة') === 'نظافه فايقه', 'Ta Marbuta normalized (ة -> ه) and Ya');
    assert(normalizeArabicText('غســــيل') === 'غسيل', 'Tatweel / Kashida removed');

    // Fetch active services from DB
    const dbServices = await Service.find({ isArchived: false, available: true });
    assert(dbServices.length > 0, `Database has ${dbServices.length} active services for search tests`);

    // Test searching for «سجاد»
    const carpetResults = searchServices(dbServices, 'سجاد', 'all');
    console.log(`  Found ${carpetResults.length} services matching «سجاد»`);
    assert(carpetResults.length > 0, 'Search for «سجاد» returns relevant carpet/upholstery cleaning services');
    const firstCarpet = carpetResults[0];
    const carpetDesc = `${firstCarpet.title} ${firstCarpet.description || ''} ${JSON.stringify(firstCarpet.packages || [])}`;
    assert(
      normalizeArabicText(carpetDesc).includes('سجاد'),
      'Matched service contains «سجاد» in its corpus (title, description, or packages)'
    );

    // Test searching for «غسيل عميق» (multi-token search)
    const deepCleanResults = searchServices(dbServices, 'غسيل عميق', 'all');
    console.log(`  Found ${deepCleanResults.length} services matching «غسيل عميق»`);
    assert(deepCleanResults.length > 0, 'Search for «غسيل عميق» returns matching services');

    // Test category isolation in search
    const carOnlySearch = searchServices(dbServices, 'غسيل', 'car');
    for (const s of carOnlySearch) {
      assert(matchesCategory(s.category, 'car'), `Car-scoped search service ${s.title} is strictly in car category`);
    }

    const homeOnlySearch = searchServices(dbServices, 'غسيل', 'home');
    for (const s of homeOnlySearch) {
      assert(matchesCategory(s.category, 'home'), `Home-scoped search service ${s.title} is strictly in home category`);
    }

    // -------------------------------------------------------------------------
    // TEST SECTION 2: CATEGORY ENDPOINTS & CANONICAL DB IDs
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 2: Category Endpoints & Canonical Filtering ---');

    // Public /services?category=car
    const carRes = await makeRequest('GET', '/services?category=car');
    assert(carRes.status === 200, 'GET /services?category=car returns 200');
    assert(Array.isArray(carRes.body.data) && carRes.body.data.length > 0, 'Car category endpoint returns services');
    for (const s of carRes.body.data) {
      assert(matchesCategory(s.category, 'car'), `Public car endpoint returns valid car service: ${s.title}`);
    }

    // Public /services?category=home
    const homeRes = await makeRequest('GET', '/services?category=home');
    assert(homeRes.status === 200, 'GET /services?category=home returns 200');
    assert(Array.isArray(homeRes.body.data) && homeRes.body.data.length > 0, 'Home category endpoint returns services');
    for (const s of homeRes.body.data) {
      assert(matchesCategory(s.category, 'home'), `Public home endpoint returns valid home service: ${s.title}`);
    }

    // Test matchesCategory with both slug and database IDs
    assert(matchesCategory('cat-mv2vgjo7', 'car'), 'matchesCategory matches db ID cat-mv2vgjo7 to car');
    assert(matchesCategory('cat-mv2vh6ty', 'home'), 'matchesCategory matches db ID cat-mv2vh6ty to home');
    assert(matchesCategory('car', 'cat-mv2vgjo7'), 'matchesCategory matches car slug to cat-mv2vgjo7');
    assert(matchesCategory('home', 'cat-mv2vh6ty'), 'matchesCategory matches home slug to cat-mv2vh6ty');

    // -------------------------------------------------------------------------
    // TEST SECTION 3: WELCOME20 COUPON VALIDATION & THRESHOLD RULES
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 3: WELCOME20 Coupon Rules & Server Validation ---');

    // Clean any prior test usages for test phone
    await CouponUsage.deleteMany({ customerPhone: testPhone });
    await Coupon.updateMany({ code: 'WELCOME20' }, { $set: { currentUsageCount: 0 } });

    // Validate WELCOME20 on eligible order (>= 200 EGP, e.g. 500 EGP)
    const validCouponRes = await makeRequest('POST', '/coupons/validate', {
      code: 'WELCOME20',
      orderTotal: 500,
      customerPhone: testPhone,
    });
    assert(validCouponRes.status === 200, 'WELCOME20 validates successfully on 500 EGP order (>= 200 EGP)');
    assert(validCouponRes.body.data.discountValue === 20, 'Discount value is 20%');
    assert(validCouponRes.body.data.actualDiscountAmount === 100, 'Discount amount correctly computed: 20% of 500 = 100 EGP');
    assert(validCouponRes.body.data.finalPrice === 400, 'Final price correctly computed: 500 - 100 = 400 EGP');

    // Validate WELCOME20 on below-minimum order (< 200 EGP, e.g. 150 EGP)
    const belowMinRes = await makeRequest('POST', '/coupons/validate', {
      code: 'WELCOME20',
      orderTotal: 150,
      customerPhone: testPhone,
    });
    assert(belowMinRes.status === 400, 'WELCOME20 rejected on 150 EGP order (< 200 EGP)');
    assert(belowMinRes.body.code === 'MIN_ORDER_NOT_MET', 'Rejection code is MIN_ORDER_NOT_MET');
    assert(belowMinRes.body.message.includes('200'), 'Error message clearly explains the 200 EGP minimum requirement');

    // Validate non-existent coupon
    const invalidCouponRes = await makeRequest('POST', '/coupons/validate', {
      code: 'NON_EXISTENT_COUPON_123',
      orderTotal: 500,
      customerPhone: testPhone,
    });
    assert(invalidCouponRes.status === 404, 'Non-existent coupon returns 404');
    assert(invalidCouponRes.body.code === 'COUPON_NOT_FOUND', 'Rejection code is COUPON_NOT_FOUND');

    // -------------------------------------------------------------------------
    // TEST SECTION 4: SERVER-SIDE AUTHORITATIVE PRICING RECALCULATION
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 4: Server-Side Authoritative Price Security ---');

    // Test /bookings/calculate-price endpoint
    const sampleService = carRes.body.data[0];
    const calcRes = await makeRequest('POST', '/bookings/calculate-price', {
      serviceId: sampleService.id,
      promoCode: 'WELCOME20',
      customerPhone: testPhone,
    });
    assert(calcRes.status === 200, 'Server-side calculate-price endpoint returns 200');
    assert(calcRes.body.data.couponSnapshot !== undefined, 'Server returns authoritative coupon snapshot');
    assert(
      calcRes.body.data.couponSnapshot.couponCode === 'WELCOME20',
      'Coupon code in snapshot is WELCOME20'
    );
    assert(
      calcRes.body.data.basePrice - calcRes.body.data.discount === calcRes.body.data.finalPrice,
      'Price invariant preserved: basePrice - discount === finalPrice'
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 5: DOUBLE-DISCOUNT PREVENTION & PER-CUSTOMER USAGE LIMIT
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 5: Double Discount & Per-Customer Usage Limits ---');

    // Ensure customer account exists
    let testUser = await User.findOne({ phone: testPhone });
    if (!testUser) {
      testUser = await User.create({
        name: 'عميل اختبار الخصم',
        phone: testPhone,
        password: 'hashed-password-123',
      });
    }

    const activeGov = await LocationGovernorate.findOne({ active: true });
    assert(activeGov !== null, 'Found active governorate in database');
    const activeCity = (activeGov.cities || []).find((c: any) => c.active) || { id: 'cairo-city', name: 'القاهرة' };

    // Place a real booking using WELCOME20
    const createBookingRes = await makeRequest('POST', '/bookings', {
      serviceId: sampleService.id,
      category: 'car',
      date: '2026-10-25',
      time: '14:00',
      customerName: 'عميل اختبار الخصم',
      customerPhone: testPhone,
      promoCode: 'WELCOME20',
      address: {
        governorateId: activeGov.id,
        cityId: activeCity.id,
        area: 'شارع عباس العقاد',
        building: '10',
        floor: '2',
        apartment: '4',
      },
    });

    if (createBookingRes.status !== 201) {
      console.log('createBooking failed with status:', createBookingRes.status, createBookingRes.body);
    }
    assert(createBookingRes.status === 201, 'Booking with WELCOME20 created successfully');
    const createdBooking = createBookingRes.body.data;
    assert(createdBooking.id !== undefined, `Created booking has authoritative ID: #${createdBooking.id}`);
    assert(createdBooking.couponSnapshot !== null, 'Booking record contains couponSnapshot');
    assert(createdBooking.couponSnapshot.couponCode === 'WELCOME20', 'Coupon snapshot records WELCOME20');

    // Verify CouponUsage record was created in database
    const usageRecord = await CouponUsage.findOne({
      orderId: createdBooking.id,
      customerPhone: testPhone,
    });
    assert(usageRecord !== null, 'CouponUsage record was atomically saved in DB with matching orderId');

    // Attempt to use WELCOME20 a second time with same phone -> must be rejected
    const secondUsageValidation = await makeRequest('POST', '/coupons/validate', {
      code: 'WELCOME20',
      orderTotal: 500,
      customerPhone: testPhone,
    });
    assert(secondUsageValidation.status === 400, 'Second attempt to use WELCOME20 by same phone is strictly rejected (400)');
    assert(
      secondUsageValidation.body.code === 'CUSTOMER_LIMIT_REACHED',
      'Rejection code is CUSTOMER_LIMIT_REACHED'
    );
    assert(
      secondUsageValidation.body.message.includes('استنفدت الحد المسموح'),
      'Error message clearly explains per-customer limit was reached'
    );

    // Clean up created test booking and usage
    await Booking.deleteOne({ id: createdBooking.id });
    await CouponUsage.deleteOne({ orderId: createdBooking.id });
    await Coupon.updateMany({ code: 'WELCOME20' }, { $inc: { currentUsageCount: -1 } });

    console.log('\n======================================================');
    console.log('✅ ALL SEARCH, CATEGORY & COUPON FIDELITY TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
    await disconnectDB();
  }
}

runSuite().catch((err) => {
  console.error('\n❌ Test suite failed with error:\n', err);
  process.exit(1);
});
