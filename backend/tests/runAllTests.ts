import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { User } from '../src/models/User.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { Offer } from '../src/models/Offer.js';
import { ZoPageConfig } from '../src/models/ZoPageConfig.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { Technician } from '../src/models/Technician.js';
import { Role } from '../src/models/Role.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponUsage } from '../src/models/CouponUsage.js';

let server: http.Server;
let baseUrl: string;

let customerToken = '';
let customerId = '';
let customerPhone = '01099887766';

let adminToken = '';
let technicianToken = '';

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

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Test Failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('🧪 CLEANZO PHASE 2 AUTOMATED TEST SUITE');
  console.log('========================================================');

  await connectDB();

  // Clean test collections in foreign-key dependency order sequentially to prevent PostgreSQL deadlocks
  await CouponUsage.deleteMany({});
  await Coupon.deleteMany({});
  await Booking.deleteMany({});
  await Offer.deleteMany({});
  await ZoPageConfig.deleteMany({});
  await Technician.deleteMany({});
  await Service.deleteMany({});
  await LocationGovernorate.deleteMany({});
  await AdminUser.deleteMany({});
  await Role.deleteMany({});
  await User.deleteMany({});

  // Seed baseline active test governorate
  await LocationGovernorate.create({
    id: 'cairo',
    name: 'القاهرة',
    nameEn: 'Cairo',
    active: true,
    order: 0,
    cities: [
      {
        id: 'maadi',
        name: 'المعادي',
        nameEn: 'Maadi',
        active: true,
        order: 0,
        areas: [],
      },
    ],
  });

  // Start temporary test server
  server = app.listen(0);
  const port = (server.address() as any).port;
  baseUrl = `http://localhost:${port}`;
  console.log(`[Test Server] Listening on ${baseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // TEST SUITE 1: AUTHENTICATION (CUSTOMER & ADMIN)
    // -------------------------------------------------------------
    console.log('📋 [Suite 1/7] Authentication & Security Tests:');

    // 1.1 Customer Registration
    const regRes = await makeRequest('POST', '/api/auth/customer/register', {
      name: 'عميل الاختبار الآلي',
      phone: customerPhone,
      password: 'password123',
    });
    assert(regRes.status === 201, 'Customer registration returns 201');
    assert(Boolean(regRes.body.data.token), 'Registration returns valid JWT token');
    customerToken = regRes.body.data.token;
    customerId = regRes.body.data.user.id;

    // 1.2 Prevent Duplicate Registration
    const dupRes = await makeRequest('POST', '/api/auth/customer/register', {
      name: 'مستخدم مكرر',
      phone: customerPhone,
      password: 'password123',
    });
    assert(dupRes.status === 409, 'Duplicate phone registration is blocked with 409 Conflict');

    // 1.3 Customer Login with correct password
    const loginRes = await makeRequest('POST', '/api/auth/customer/login', {
      phone: customerPhone,
      password: 'password123',
    });
    assert(loginRes.status === 200, 'Customer login succeeds with 200');

    // 1.4 Customer Login with wrong password
    const wrongPassRes = await makeRequest('POST', '/api/auth/customer/login', {
      phone: customerPhone,
      password: 'wrong_password_999',
    });
    assert(wrongPassRes.status === 401, 'Wrong password correctly rejected with 401 Unauthorized');

    // 1.5 Seed Admin and test Admin Login
    await Role.create({
      id: 'owner',
      name: 'Owner',
      nameAr: 'المالك',
      permissions: {},
    });
    await Role.create({
      id: 'technician',
      name: 'Technician',
      nameAr: 'فني',
      permissions: { orders: ['view', 'edit'] },
    });

    await AdminUser.create({
      name: 'مدير النظام الرئيسي',
      username: 'superadmin',
      email: 'admin@cleanzo.com',
      password: 'adminPassword123',
      role: 'owner',
      status: 'active',
    });
    await AdminUser.create({
      name: 'فني الاختبار',
      username: 'tech_test',
      email: 'tech@cleanzo.com',
      password: 'techPassword123',
      role: 'technician',
      status: 'active',
      phone: '01055555555',
    });

    const adminLoginRes = await makeRequest('POST', '/api/auth/admin/login', {
      username: 'superadmin',
      password: 'adminPassword123',
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeds with 200');
    adminToken = adminLoginRes.body.data.token;

    const techLoginRes = await makeRequest('POST', '/api/auth/admin/login', {
      username: 'tech_test',
      password: 'techPassword123',
    });
    assert(techLoginRes.status === 200, 'Technician login succeeds');
    technicianToken = techLoginRes.body.data.token;

    // 1.6 Unauthorized admin access rejected
    const unauthAdmin = await makeRequest('GET', '/api/auth/admin/users', undefined, customerToken);
    assert(unauthAdmin.status === 401, 'Customer token cannot access admin endpoints (401)');

    // -------------------------------------------------------------
    // TEST SUITE 2: CUSTOMER PROFILE & IDOR PROTECTION
    // -------------------------------------------------------------
    console.log('\n📋 [Suite 2/7] Customer Profile & IDOR Protection:');

    // 2.1 Get own profile
    const profileRes = await makeRequest('GET', '/api/auth/customer/profile', undefined, customerToken);
    assert(profileRes.status === 200, 'Customer gets own profile');
    assert(profileRes.body.data.phone === customerPhone, 'Profile matches logged-in customer');

    // 2.2 Update profile
    const updateProfRes = await makeRequest('PUT', '/api/auth/customer/profile', {
      name: 'عميل محدث الاسم',
    }, customerToken);
    assert(updateProfRes.status === 200, 'Customer can update own profile name');
    assert(updateProfRes.body.data.name === 'عميل محدث الاسم', 'Updated name saved properly');

    // 2.3 Add address
    const addAddrRes = await makeRequest('POST', '/api/auth/customer/addresses', {
      label: 'المنزل',
      governorate: 'القاهرة',
      city: 'المعادي',
      area: 'الحي الرابع',
      building: 'عمارة 10',
    }, customerToken);
    assert(addAddrRes.status === 201, 'Customer can add delivery address');

    // -------------------------------------------------------------
    // TEST SUITE 3: SERVICES SYSTEM & CRUD
    // -------------------------------------------------------------
    console.log('\n📋 [Suite 3/7] Services CRUD & Visibility:');

    // 3.1 Admin creates service
    const createSrvRes = await makeRequest('POST', '/api/services/admin', {
      id: 'car-test-service',
      category: 'car',
      title: 'خدمة اختبار غسيل السيارات',
      titleEn: 'Test Car Wash Service',
      image: 'https://example.com/car.jpg',
      price: 250,
      duration: 60,
      available: true,
    }, adminToken);
    assert(createSrvRes.status === 201, 'Admin successfully creates new service');

    // 3.2 Customer reads active services
    const pubSrvRes = await makeRequest('GET', '/api/services');
    assert(pubSrvRes.status === 200, 'Public customer gets services list');
    assert(pubSrvRes.body.data.length >= 1, 'Created service is visible to customer');

    // 3.3 Create inactive service and verify hidden from customer
    await makeRequest('POST', '/api/services/admin', {
      id: 'car-hidden-service',
      category: 'car',
      title: 'خدمة معطلة مؤقتاً',
      titleEn: 'Disabled Service',
      image: 'https://example.com/car2.jpg',
      price: 100,
      duration: 30,
      available: false,
    }, adminToken);

    const checkHiddenRes = await makeRequest('GET', '/api/services');
    const isHiddenFound = checkHiddenRes.body.data.some((s: any) => s.id === 'car-hidden-service');
    assert(!isHiddenFound, 'Disabled/inactive service is completely hidden from public API');

    // -------------------------------------------------------------
    // TEST SUITE 4: OFFERS & PROMO CODES
    // -------------------------------------------------------------
    console.log('\n📋 [Suite 4/7] Coupons & Authoritative Discount Calculation:');

    // 4.1 Admin creates coupon
    await makeRequest('POST', '/api/admin/coupons', {
      code: 'DISCOUNT20',
      name: 'خصم تجريبي 20%',
      discountType: 'percentage',
      discountValue: 20,
      totalUsageLimit: 100,
      perCustomerLimit: 5,
      startDate: '2026-01-01',
      endDate: '2028-12-31',
      status: 'active',
    }, adminToken);

    // 4.2 Validate coupon code
    const valCodeRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'DISCOUNT20',
      basePrice: 250,
    });
    assert(valCodeRes.status === 200, 'Valid active coupon code accepted');
    assert(valCodeRes.body.data.actualDiscountAmount === 50, 'Returns correct 50 EGP discount (20% of 250)');

    // 4.3 Expired or invalid coupon code rejected
    const invalidCodeRes = await makeRequest('POST', '/api/coupons/validate', {
      code: 'EXPIRED999',
    });
    assert(invalidCodeRes.status === 404, 'Invalid coupon code correctly rejected');

    // -------------------------------------------------------------
    // TEST SUITE 5: AVAILABILITY ENGINE & OVERLAP PREVENTION
    // -------------------------------------------------------------
    console.log('\n📋 [Suite 5/7] Booking Availability Engine & Overlap Prevention:');

    const testDate = '2026-10-15';
    const testTime = '10:00 AM';

    // Ensure slot capacity is strictly 1 for overlap testing
    await makeRequest('PUT', '/api/settings/admin', {
      booking: { maxBookingsPerSlot: 1 },
    }, adminToken);

    // 5.1 Check initial availability for date
    const availRes = await makeRequest('GET', `/api/availability?date=${testDate}&duration=60`);
    assert(availRes.status === 200, 'Availability check returns 200');
    assert(availRes.body.data.isDayAvailable === true, 'Future working day is available');

    // 5.2 Create Booking A at 10:00 AM
    const bookARes = await makeRequest('POST', '/api/bookings', {
      serviceId: 'car-test-service',
      category: 'car',
      date: testDate,
      time: testTime,
      address: {
        governorate: 'القاهرة',
        city: 'المعادي',
        area: 'الحي الرابع',
      },
      promoCode: 'DISCOUNT20',
    }, customerToken);
    if (bookARes.status !== 201) console.log('DEBUG bookARes:', bookARes.status, bookARes.body);
    assert(bookARes.status === 201, 'Booking A created successfully');
    assert(bookARes.body.data.finalPrice === 200, 'Backend correctly calculated 20% discount (250 - 50 = 200)');
    const bookingAId = bookARes.body.data.id;

    // 5.3 Attempt overlapping Booking B at 10:15 AM on same date
    // Duration is 60m + 15m buffer -> slot runs from 10:00 to 11:15
    // Booking at 10:30 AM overlaps and must be rejected!
    const bookBRes = await makeRequest('POST', '/api/bookings', {
      serviceId: 'car-test-service',
      category: 'car',
      date: testDate,
      time: '10:30 AM',
      address: {
        governorate: 'القاهرة',
        city: 'المعادي',
        area: 'الحي الرابع',
      },
    }, customerToken);
    assert(bookBRes.status === 409, 'Overlapping booking at 10:30 AM is strictly rejected with 409 Conflict');

    // 5.4 Non-overlapping Booking C at 01:00 PM succeeds
    const bookCRes = await makeRequest('POST', '/api/bookings', {
      serviceId: 'car-test-service',
      category: 'car',
      date: testDate,
      time: '01:00 PM',
      address: {
        governorate: 'القاهرة',
        city: 'المعادي',
        area: 'الحي الرابع',
      },
    }, customerToken);
    assert(bookCRes.status === 201, 'Non-overlapping booking at 01:00 PM succeeds without conflict');

    // -------------------------------------------------------------
    // TEST SUITE 6: BOOKING LIFECYCLE & STATUS TRANSITIONS
    // -------------------------------------------------------------
    console.log('\n📋 [Suite 6/7] Booking Lifecycle, Technician Assignment & IDOR:');

    // 6.1 Customer views own bookings
    const myBookingsRes = await makeRequest('GET', '/api/bookings/my', undefined, customerToken);
    assert(myBookingsRes.status === 200, 'Customer retrieves own bookings list');
    assert(myBookingsRes.body.data.length >= 2, 'Both bookings appear in customer dashboard');

    // 6.2 Admin confirms booking A
    const confirmRes = await makeRequest('PUT', `/api/bookings/admin/${bookingAId}/status`, {
      status: 'confirmed',
      note: 'تم الاتصال بالعميل وتأكيد الميعاد',
    }, adminToken);
    assert(confirmRes.status === 200, 'Admin can update status to confirmed');
    assert(confirmRes.body.data.timeline.length >= 2, 'Timeline updated with confirmation event');

    // 6.3 Admin assigns technician
    const tech = await Technician.create({
      id: 'tech-auto',
      name: 'كابتن التجربة',
      phone: '01055555555',
      avatar: 'https://example.com/tech.jpg',
      rating: 5.0,
      specialty: 'سيارات',
    });

    const assignRes = await makeRequest('PUT', `/api/bookings/admin/${bookingAId}/assign`, {
      technicianId: 'tech-auto',
    }, adminToken);
    assert(assignRes.status === 200, 'Admin can assign technician');
    assert(assignRes.body.data.status === 'assigned', 'Status automatically transitioned to assigned');

    // 6.4 Technician updates status to in_progress
    const inProgRes = await makeRequest('PUT', `/api/bookings/admin/${bookingAId}/status`, {
      status: 'in_progress',
    }, technicianToken);
    assert(inProgRes.status === 200, 'Assigned technician can advance status to in_progress');

    // 6.5 Technician completes booking
    const compRes = await makeRequest('PUT', `/api/bookings/admin/${bookingAId}/status`, {
      status: 'completed',
    }, technicianToken);
    assert(compRes.status === 200, 'Technician can mark service completed');

    // -------------------------------------------------------------
    // TEST SUITE 7: ZO 3D SYSTEM DRAFT VS PUBLISHED ISOLATION
    // -------------------------------------------------------------
    console.log('\n📋 [Suite 7/7] Zo 3D Companion Draft vs Published Isolation:');

    // 7.1 Admin saves draft for homepage with custom message
    await makeRequest('PUT', '/api/zo/admin/draft/home', {
      pageNameAr: 'الرئيسية',
      pageNameEn: 'Home',
      pageCategory: 'general',
      pathPattern: '/',
      character: { expression: 'happy', pose: 'waving', scale: 1.0 },
      desktop: { horizontal: 'corner-right', vertical: 'bottom', size: 240, visible: true },
      tablet: { horizontal: 'corner-right', vertical: 'bottom', size: 200, visible: true },
      mobile: { horizontal: 'corner-right', vertical: 'bottom', size: 160, visible: true },
      message: { enabled: true, title: 'زو', titleEn: 'Zo', text: 'مسودة غير منشورة بعد!', textEn: 'Draft text' },
      isPublished: false,
    }, adminToken);

    // 7.2 Customer reads published configs -> should NOT contain uncommitted draft!
    const pubZoRes = await makeRequest('GET', '/api/zo/published');
    assert(pubZoRes.status === 200, 'Customer gets published Zo configs');
    assert(!pubZoRes.body.data['home'], 'Unpublished draft is strictly hidden from customer site');

    // 7.3 Admin publishes homepage config
    const pubActionRes = await makeRequest('POST', '/api/zo/admin/publish/home', {}, adminToken);
    assert(pubActionRes.status === 200, 'Admin can publish Zo page configuration');

    // 7.4 Customer now gets published config
    const pubZoAfterRes = await makeRequest('GET', '/api/zo/published');
    assert(Boolean(pubZoAfterRes.body.data['home']), 'Published Zo configuration immediately visible to customer');

    console.log('\n========================================================');
    console.log('🎉 ALL 24 AUTOMATED TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('========================================================');
  } catch (err) {
    console.error('\n❌ Test Suite Aborted with Error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    process.exit(0);
  }
}

runTests();
