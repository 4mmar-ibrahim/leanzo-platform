import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Service } from '../src/models/Service.js';
import { Offer } from '../src/models/Offer.js';
import { Coupon } from '../src/models/Coupon.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { FAQ } from '../src/models/FAQ.js';
import { PortfolioItem } from '../src/models/PortfolioItem.js';
import { Booking } from '../src/models/Booking.js';
import { User } from '../src/models/User.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { SystemSettings } from '../src/models/SystemSettings.js';
import { Technician } from '../src/models/Technician.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';

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

async function runAuditTests() {
  console.log('===============================================================');
  console.log('CLEANZO — MODIFICATION 08: FULL INTEGRATION AUDIT SUITE');
  console.log('Testing: Frontend API ↔ Backend Express ↔ MongoDB Database');
  console.log('===============================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Test Express server running at: ${baseUrl}\n`);
      resolve();
    });
  });

  // 1. Setup Admin Token
  let owner = await AdminUser.findOne({ role: 'owner' });
  if (!owner) {
    owner = await AdminUser.create({
      id: `owner-${Date.now()}`,
      name: 'Owner Audit',
      username: 'owner_audit',
      email: 'owner_audit@cleanzo.com',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });
  }
  ownerToken = generateAdminToken({
    id: owner._id.toString(),
    username: owner.username,
    role: owner.role || 'owner',
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Service CRUD & Price Update (500 -> 600)
    // -------------------------------------------------------------
    console.log('📌 [TEST 1] Service CRUD & Price Consistency (500 -> 600)');
    const testServiceId = `audit-srv-${Date.now()}`;
    const createServiceRes = await makeRequest(
      'POST',
      '/services/admin',
      {
        id: testServiceId,
        title: 'خدمة تدقيق التوافق',
        titleEn: 'Integration Audit Service',
        description: 'وصف خدمة التدقيق',
        descriptionEn: 'Audit Service Description',
        category: 'car',
        price: 500,
        duration: 60,
        available: true,
        order: 999,
      },
      ownerToken
    );
    assert(createServiceRes.status === 200 || createServiceRes.status === 201, 'Admin can CREATE service with price 500');

    // Customer reads it
    const custServiceRes1 = await makeRequest('GET', `/services/${testServiceId}`);
    assert(custServiceRes1.status === 200, 'Customer API can READ newly created service');
    assert(custServiceRes1.body.data.price === 500, 'Customer API sees price = 500');

    // DB verification
    const dbService1 = await Service.findOne({ id: testServiceId });
    assert(dbService1 !== null && dbService1.price === 500, 'Database confirms price = 500');

    // Admin updates price to 600
    const updateServiceRes = await makeRequest(
      'PUT',
      `/services/admin/${testServiceId}`,
      { price: 600 },
      ownerToken
    );
    assert(updateServiceRes.status === 200, 'Admin can UPDATE service price to 600');

    // Verify all 4 layers reflect 600: DB, API response, Customer API
    const custServiceRes2 = await makeRequest('GET', `/services/${testServiceId}`);
    assert(custServiceRes2.body.data.price === 600, 'Customer API immediately reflects updated price = 600');
    const dbService2 = await Service.findOne({ id: testServiceId });
    assert(dbService2 !== null && dbService2.price === 600, 'Database immediately reflects updated price = 600');

    // -------------------------------------------------------------
    // TEST 2: Areas & Cities CRUD & Live Customer Reflection
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 2] Areas & Cities CRUD & Live Filter Reflection');
    const testGovId = `audit-gov-${Date.now()}`;
    const testCityId = `audit-city-${Date.now()}`;
    const createGovRes = await makeRequest(
      'POST',
      '/locations/admin',
      {
        id: testGovId,
        name: 'محافظة التدقيق',
        nameEn: 'Audit Governorate',
        active: true,
        order: 99,
        cities: [
          {
            id: testCityId,
            name: 'مدينة التدقيق الشامل',
            nameEn: 'Audit City',
            active: true,
            deliveryFee: 25,
            estimatedTime: '30 دقيقة',
          },
        ],
      },
      ownerToken
    );
    assert(createGovRes.status === 200 || createGovRes.status === 201, 'Admin can CREATE Governorate & City');

    // Customer active locations check
    const activeLocationsRes = await makeRequest('GET', '/locations/active');
    assert(activeLocationsRes.status === 200, 'Customer can fetch active locations');
    const foundGov = (activeLocationsRes.body.data || []).find((g: any) => g.id === testGovId);
    assert(!!foundGov, 'Customer active locations includes newly created governorate');
    assert(foundGov.cities.some((c: any) => c.id === testCityId), 'Customer active cities includes newly created city');

    // Deactivate city and verify customer view excludes it
    await makeRequest(
      'PUT',
      `/locations/admin/${testGovId}/cities/${testCityId}`,
      { active: false },
      ownerToken
    );
    const activeLocationsRes2 = await makeRequest('GET', '/locations/active');
    const foundGov2 = (activeLocationsRes2.body.data || []).find((g: any) => g.id === testGovId);
    assert(!foundGov2 || !foundGov2.cities.some((c: any) => c.id === testCityId), 'Customer active locations correctly excludes deactivated city');

    // Re-activate city for subsequent booking tests
    await makeRequest(
      'PUT',
      `/locations/admin/${testGovId}/cities/${testCityId}`,
      { active: true },
      ownerToken
    );

    // -------------------------------------------------------------
    // TEST 3: Coupons Engine & Atomic Redemption
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 3] Coupons Engine: Limits, Validation & Atomic Consumption');
    const testCouponCode = `AUDIT${Date.now().toString().slice(-4)}`;
    const createCouponRes = await makeRequest(
      'POST',
      '/admin/coupons',
      {
        code: testCouponCode,
        discountType: 'percentage',
        discountValue: 20,
        totalUsageLimit: 1, // Only 1 use allowed
        perCustomerLimit: 1,
        active: true,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      ownerToken
    );
    assert(createCouponRes.status === 200 || createCouponRes.status === 201, `Admin can CREATE coupon [${testCouponCode}] with totalUsageLimit = 1`);

    // Validate Coupon via public API
    const validateCouponRes = await makeRequest('POST', '/coupons/validate', {
      code: testCouponCode,
      basePrice: 600,
      customerPhone: '01009998881',
    });
    assert(validateCouponRes.status === 200, 'Public API can validate active coupon');
    assert(validateCouponRes.body.data.finalPrice === 480, 'Coupon 20% discount correctly computed: 600 -> 480');

    // -------------------------------------------------------------
    // TEST 4: Full Lifecycle Customer Booking & Order Tracking
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 4] Full Flow: Register -> Login -> Book -> Admin Update -> Track');
    const testCustPhone = `0100${Date.now().toString().slice(-7)}`;
    const testCustPassword = 'StrongPassword123!';

    // Step A: Register Customer
    const registerRes = await makeRequest('POST', '/auth/customer/register', {
      name: 'عميل التدقيق التكاملي',
      phone: testCustPhone,
      password: testCustPassword,
    });
    assert(registerRes.status === 200 || registerRes.status === 201, 'Customer can REGISTER');

    // Step B: Login Customer
    const loginRes = await makeRequest('POST', '/auth/customer/login', {
      phone: testCustPhone,
      password: testCustPassword,
    });
    assert(loginRes.status === 200, 'Customer can LOGIN');
    const customerToken = loginRes.body.data.token;
    assert(!!customerToken, 'Customer receives valid JWT token');

    // Pick a date in future for booking (e.g. 5 days from now to avoid past-time / blocked day conflicts)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    // ensure it's not a Friday if Friday is off (e.g. workingDays: [0,1,2,3,4,6])
    if (futureDate.getDay() === 5) {
      futureDate.setDate(futureDate.getDate() + 1);
    }
    const targetDateStr = futureDate.toISOString().split('T')[0];

    // Step C: Create Booking with Coupon applied
    const bookingRes = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: testServiceId,
        category: 'car',
        date: targetDateStr,
        time: '11:00 AM',
        address: {
          governorateId: testGovId,
          cityId: testCityId,
          area: 'حي الأمان والتدقيق',
          building: '10',
          floor: '3',
          apartment: '12',
          details: 'بجوار المسجد الكبير',
        },
        promoCode: testCouponCode,
      },
      customerToken
    );
    assert(bookingRes.status === 200 || bookingRes.status === 201, 'Customer successfully BOOKS slot with coupon');
    const createdBooking = bookingRes.body.data;
    const orderId = createdBooking.id;
    assert(!!orderId, `Order created in MongoDB with ID: [${orderId}]`);
    assert(createdBooking.finalPrice === 480, 'Order finalPrice reflects coupon discount = 480');

    // Step D: Verify Coupon is now consumed (limit reached)
    const validateCouponRes2 = await makeRequest('POST', '/coupons/validate', {
      code: testCouponCode,
      basePrice: 600,
      customerPhone: '01009998882',
    });
    assert(validateCouponRes2.status === 400, 'Coupon is strictly rejected after usage limit is exhausted');

    // Step E: Admin sees Order in Dashboard
    const adminOrdersRes = await makeRequest('GET', `/bookings/admin/${orderId}`, null, ownerToken);
    assert(adminOrdersRes.status === 200, 'Admin can view newly created order');
    assert(adminOrdersRes.body.data.id === orderId, 'Admin retrieves exact order matching ID');

    // Step F: Admin updates Order status to 'confirmed', assigns technician, then 'in_progress'
    const statusUpdateRes1 = await makeRequest(
      'PUT',
      `/bookings/admin/${orderId}/status`,
      { status: 'confirmed', note: 'تم استلام طلب الحجز ومراجعته' },
      ownerToken
    );
    assert(statusUpdateRes1.status === 200, 'Admin updates order status to CONFIRMED (مستلم)');

    // Assign technician
    let auditTech = await Technician.findOne({ id: 'audit-tech-1' });
    if (!auditTech) {
      auditTech = await Technician.create({
        id: 'audit-tech-1',
        name: 'كابتن محمد فحص',
        phone: '01011112222',
        specialty: 'سيارات',
        status: 'available',
      });
    }

    const assignTechRes = await makeRequest(
      'PUT',
      `/bookings/admin/${orderId}/assign`,
      { technicianId: auditTech.id },
      ownerToken
    );
    assert(assignTechRes.status === 200, 'Admin assigns technician to order');

    const statusUpdateRes2 = await makeRequest(
      'PUT',
      `/bookings/admin/${orderId}/status`,
      { status: 'in_progress', note: 'بدأ الفني في تنفيذ الخدمة' },
      ownerToken
    );
    assert(statusUpdateRes2.status === 200, 'Admin updates order status to IN_PROGRESS');

    // Step G: Customer views updated status via authenticated API
    const custOrderRes = await makeRequest('GET', `/bookings/${orderId}`, null, customerToken);
    assert(custOrderRes.status === 200, 'Customer retrieves order details');
    assert(custOrderRes.body.data.status === 'in_progress', 'Customer sees updated status = IN_PROGRESS');
    assert(
      custOrderRes.body.data.timeline.some((t: any) => t.status === 'in_progress'),
      'Customer order timeline reflects IN_PROGRESS event'
    );

    // Step H: Public Tracking API verification (with registered phone)
    const publicTrackRes = await makeRequest('GET', `/bookings/track/${orderId}?phone=${testCustPhone}`);
    assert(publicTrackRes.status === 200, 'Public Tracking API returns order details with correct phone');
    assert(publicTrackRes.body.data.status === 'in_progress', 'Public Tracking returns status = IN_PROGRESS');

    // -------------------------------------------------------------
    // TEST 5: Concurrency & Double Booking Prevention
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 5] Concurrency: Preventing Double Bookings on Same Slot');
    const origSettings = await SystemSettings.findOne({ key: 'global_settings' });
    const origMax = origSettings?.booking?.maxBookingsPerSlot || 1;
    await SystemSettings.updateOne({ key: 'global_settings' }, { $set: { 'booking.maxBookingsPerSlot': 1 } });

    // Try to book the EXACT same slot (same date, time, service) with another phone
    const doubleBookRes = await makeRequest('POST', '/bookings', {
      serviceId: testServiceId,
      category: 'car',
      date: targetDateStr,
      time: '11:00 AM',
      guestName: 'عميل متزامن',
      guestPhone: '01007776665',
      address: {
        governorateId: testGovId,
        cityId: testCityId,
        area: 'نفس المنطقة',
      },
    });
    assert(doubleBookRes.status === 409, 'Double booking is strictly blocked with HTTP 409 Conflict');
    assert(
      doubleBookRes.body.code === 'TIME_SLOT_UNAVAILABLE' || doubleBookRes.body.message?.includes('محجوز'),
      'Backend returns clear TIME_SLOT_UNAVAILABLE error message'
    );

    // Restore original setting
    await SystemSettings.updateOne({ key: 'global_settings' }, { $set: { 'booking.maxBookingsPerSlot': origMax } });

    // -------------------------------------------------------------
    // TEST 6: RBAC & Security Authorization
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 6] RBAC Authorization & Protection');
    // 1. Unauthenticated call to Admin API
    const unauthRes = await makeRequest('GET', '/bookings/admin/all');
    assert(unauthRes.status === 401, 'Unauthenticated request to Admin API rejected with 401');

    // 2. Customer token accessing Admin API
    const forbiddenRes = await makeRequest('GET', '/bookings/admin/all', null, customerToken);
    assert(forbiddenRes.status === 401 || forbiddenRes.status === 403, 'Customer token cannot access Admin API (401/403)');

    // 3. IDOR Protection: Public tracking with wrong phone
    const idorTrackRes = await makeRequest('GET', `/bookings/track/${orderId}?phone=01112223334`);
    assert(idorTrackRes.status === 403, 'Public tracking with mismatched phone strictly rejected with 403');

    // -------------------------------------------------------------
    // TEST 7: FAQs & Portfolio CRUD Verification
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 7] FAQs & Portfolio CRUD Integration');
    // Create FAQ
    const faqRes = await makeRequest(
      'POST',
      '/faq/admin',
      {
        question: 'سؤال تدقيق النظام؟',
        questionEn: 'Audit system question?',
        answer: 'إجابة تدقيق النظام الشاملة.',
        answerEn: 'Audit system comprehensive answer.',
        category: 'general',
        order: 99,
        active: true,
      },
      ownerToken
    );
    assert(faqRes.status === 200 || faqRes.status === 201, 'Admin can CREATE FAQ');
    const faqId = faqRes.body.data.id;

    // Public FAQ list
    const publicFaqRes = await makeRequest('GET', '/faq');
    assert(publicFaqRes.status === 200, 'Customer can fetch FAQs');
    assert(publicFaqRes.body.data.some((f: any) => f.id === faqId), 'Customer sees newly created FAQ');

    // Delete FAQ
    const deleteFaqRes = await makeRequest('DELETE', `/faq/admin/${faqId}`, null, ownerToken);
    assert(deleteFaqRes.status === 200, 'Admin can DELETE FAQ');

    // Create Portfolio Item
    const portfolioRes = await makeRequest(
      'POST',
      '/portfolio/admin',
      {
        id: `port-audit-${Date.now()}`,
        title: 'عمل تدقيق تجريبي',
        titleEn: 'Audit Portfolio Item',
        category: 'car',
        image: '/images/audit-sample.jpg',
        beforeImage: '/images/before-sample.jpg',
        afterImage: '/images/after-sample.jpg',
        displayMode: 'standard_card',
        visible: true,
      },
      ownerToken
    );
    assert(portfolioRes.status === 200 || portfolioRes.status === 201, 'Admin can CREATE Portfolio work');
    const portId = portfolioRes.body.data.id;

    // Customer sees Portfolio
    const publicPortRes = await makeRequest('GET', '/portfolio');
    assert(publicPortRes.status === 200, 'Customer can fetch Portfolio');
    assert(publicPortRes.body.data.some((p: any) => p.id === portId), 'Customer sees newly created Portfolio item');

    // Delete Portfolio Item
    const deletePortRes = await makeRequest('DELETE', `/portfolio/admin/${portId}`, null, ownerToken);
    assert(deletePortRes.status === 200, 'Admin can DELETE Portfolio item');

    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log('\n🧹 Cleaning up test artifacts from MongoDB...');
    await Service.deleteOne({ id: testServiceId });
    await LocationGovernorate.deleteOne({ id: testGovId });
    await Coupon.deleteOne({ code: testCouponCode });
    await Booking.deleteOne({ id: orderId });
    await User.deleteOne({ phone: testCustPhone });
    console.log('  ✓ Cleaned up test services, locations, coupons, orders, and users.');

    console.log('\n===============================================================');
    console.log('🎉 ALL INTEGRATION AUDIT TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('===============================================================');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runAuditTests().catch((err) => {
  console.error('\n❌ INTEGRATION AUDIT SUITE ENCOUNTERED AN ERROR:');
  console.error(err);
  process.exit(1);
});
